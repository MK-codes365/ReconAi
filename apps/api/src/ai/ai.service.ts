import { PrismaClient, ActorType } from '@prisma/client';
import { config } from '@reconai/config';
import { LLMProvider } from './providers/llm-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { MockLLMProvider } from './providers/mock-llm.provider';
import { RecoveryContextBuilder } from './context/recovery-context.builder';
import { PromptManager } from './prompts/prompt-manager';
import { auditService } from '../services/audit.service';
import { wsService } from '../services/websocket.service';

const prisma = new PrismaClient();

export class AIService {
  private provider: LLMProvider;

  constructor() {
    if (config.gemini.apiKey) {
      console.log(`🤖 AIService initialized with Google Gemini LLM Provider (${config.gemini.model}).`);
      this.provider = new GeminiProvider();
    } else {
      console.log('🤖 AIService initialized with Mock LLM Provider (Fallback mode).');
      this.provider = new MockLLMProvider();
    }
  }

  public async analyzeCase(caseId: string, forceReanalyze: boolean = false): Promise<any> {
    await PromptManager.ensureActivePrompts();

    if (!forceReanalyze) {
      try {
        const existingPrediction = await prisma.aIPrediction.findFirst({
          where: { recoveryCaseId: caseId },
          orderBy: { createdAt: 'desc' },
        });

        if (existingPrediction) {
          console.log(`ℹ️ Reusing existing AI Analysis prediction for case ${caseId}`);
          return existingPrediction;
        }
      } catch (_) {}
    }

    const context = await RecoveryContextBuilder.buildContext(caseId);

    wsService.broadcast('recovery.ai_analysis_started', { caseId });

    try {
      const result = await this.provider.analyzeRecoveryContext(context);

      let aiRecord: any = {
        id: `pred_${Date.now()}`,
        recoveryCaseId: caseId,
        modelType: 'llm-reasoning',
        modelVersion: result.modelVersion,
        predictionType: 'RECOVERY_DIAGNOSIS',
        promptVersion: result.promptVersion,
        confidence: result.confidence,
        inputSnapshot: context,
        output: result.output,
        latencyMs: result.latencyMs,
        createdAt: new Date(),
      };

      try {
        const created = await prisma.aIPrediction.create({
          data: {
            recoveryCaseId: caseId,
            modelType: 'llm-reasoning',
            modelVersion: result.modelVersion,
            predictionType: 'RECOVERY_DIAGNOSIS',
            promptVersion: result.promptVersion,
            confidence: result.confidence,
            inputSnapshot: JSON.parse(JSON.stringify(context)),
            output: JSON.parse(JSON.stringify(result.output)),
            latencyMs: result.latencyMs,
          },
        });
        aiRecord = created;
      } catch (_) {
        // Fallback in-memory prediction
      }

      await auditService.record({
        entityType: 'RecoveryCase',
        entityId: caseId,
        eventType: 'AI_ANALYSIS_COMPLETED',
        actorType: ActorType.AI,
        action: 'COMPLETED_RECOVERY_DIAGNOSIS',
        metadata: {
          confidence: result.confidence,
          category: result.output.diagnosis.category,
          latencyMs: result.latencyMs,
          modelVersion: result.modelVersion,
        },
      });

      wsService.broadcast('recovery.ai_analysis_ready', {
        caseId,
        analysisId: aiRecord.id,
        category: result.output.diagnosis.category,
        confidence: result.confidence,
      });

      return aiRecord;
    } catch (error: any) {
      console.error(`❌ AI Analysis failed for case ${caseId}:`, error.message);

      await auditService.record({
        entityType: 'RecoveryCase',
        entityId: caseId,
        eventType: 'AI_ANALYSIS_FAILED',
        actorType: ActorType.AI,
        action: 'AI_SERVICE_UNAVAILABLE',
        metadata: { error: error.message },
      });

      wsService.broadcast('recovery.ai_analysis_failed', { caseId, error: error.message });

      return {
        status: 'UNAVAILABLE',
        caseId,
        error: error.message,
      };
    }
  }

  public async getLatestAnalysis(caseId: string) {
    try {
      return await prisma.aIPrediction.findFirst({
        where: { recoveryCaseId: caseId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (_) {
      return null;
    }
  }
}

export const aiService = new AIService();

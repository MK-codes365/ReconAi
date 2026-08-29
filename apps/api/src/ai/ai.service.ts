import { PrismaClient, ActorType } from '@prisma/client';
import { config } from '@reconai/config';
import { LLMProvider } from './providers/llm-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { MockLLMProvider } from './providers/mock-llm.provider';
import { RecoveryContextBuilder } from './context/recovery-context.builder';
import { PromptManager } from './prompts/prompt-manager';
import { auditService } from '../services/audit.service';
import { wsService } from '../services/websocket.service';

const prisma = new PrismaClient();

export class AIService {
  private provider: LLMProvider;

  constructor() {
    if (config.openai.apiKey) {
      this.provider = new OpenAIProvider();
    } else {
      this.provider = new MockLLMProvider();
    }
  }

  /**
   * Run AI Analysis pipeline and persist AIPrediction record
   */
  public async analyzeCase(caseId: string, forceReanalyze: boolean = false): Promise<any> {
    await PromptManager.ensureActivePrompts();

    // 1. Idempotency Check: Check if valid recent AIPrediction exists
    if (!forceReanalyze) {
      const existingPrediction = await prisma.aIPrediction.findFirst({
        where: { recoveryCaseId: caseId },
        orderBy: { createdAt: 'desc' },
      });

      if (existingPrediction) {
        console.log(`ℹ️ Reusing existing AI Analysis prediction for case ${caseId}`);
        return existingPrediction;
      }
    }

    // 2. Build Context
    const context = await RecoveryContextBuilder.buildContext(caseId);

    // 3. Emit WS Started Event
    wsService.broadcast('recovery.ai_analysis_started', { caseId });

    try {
      // 4. Request Structured LLM Analysis
      const result = await this.provider.analyzeRecoveryContext(context);

      // 5. Persist AIPrediction in Database
      const aiRecord = await prisma.aIPrediction.create({
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

      // 6. Record Audit Log
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

      // 7. Emit WS Ready Event
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
    return await prisma.aIPrediction.findFirst({
      where: { recoveryCaseId: caseId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const aiService = new AIService();

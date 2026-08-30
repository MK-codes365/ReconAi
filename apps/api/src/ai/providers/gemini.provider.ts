import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '@reconai/config';
import { LLMProvider, LLMAnalysisResult } from './llm-provider.interface';
import { RecoveryContextSnapshot } from '../context/recovery-context.builder';
import { RecoveryAnalysisSchema, RecoveryAnalysisOutput } from '../schemas/recovery-analysis.schema';
import { RECOVERY_DIAGNOSIS_SYSTEM_PROMPT, RECOVERY_DIAGNOSIS_PROMPT_VERSION, buildRecoveryDiagnosisUserPrompt } from '../prompts/recovery-diagnosis.prompt';

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.gemini.apiKey) {
      this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    }
  }

  async analyzeRecoveryContext(context: RecoveryContextSnapshot): Promise<LLMAnalysisResult> {
    if (!this.genAI) {
      throw new Error('Gemini API Key is missing. Fall back to MockLLMProvider.');
    }

    const start = Date.now();
    const userPrompt = buildRecoveryDiagnosisUserPrompt(JSON.stringify(context, null, 2));

    const modelName = config.gemini.model || 'gemini-1.5-flash';
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: RECOVERY_DIAGNOSIS_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const response = await model.generateContent(userPrompt);
    const latencyMs = Date.now() - start;
    const text = response.response.text();

    if (!text) {
      throw new Error('Empty response from Gemini LLM');
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(text);
    } catch (e) {
      throw new Error('Failed to parse Gemini JSON response');
    }

    // Validate using Zod
    const validatedOutput: RecoveryAnalysisOutput = RecoveryAnalysisSchema.parse(parsedJson);

    return {
      output: validatedOutput,
      confidence: validatedOutput.diagnosis.confidence,
      latencyMs,
      modelVersion: modelName,
      promptVersion: RECOVERY_DIAGNOSIS_PROMPT_VERSION,
    };
  }
}

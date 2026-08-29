import OpenAI from 'openai';
import { config } from '@reconai/config';
import { LLMProvider, LLMAnalysisResult } from './llm-provider.interface';
import { RecoveryContextSnapshot } from '../context/recovery-context.builder';
import { RecoveryAnalysisSchema, RecoveryAnalysisOutput } from '../schemas/recovery-analysis.schema';
import { RECOVERY_DIAGNOSIS_SYSTEM_PROMPT, RECOVERY_DIAGNOSIS_PROMPT_VERSION, buildRecoveryDiagnosisUserPrompt } from '../prompts/recovery-diagnosis.prompt';

export class OpenAIProvider implements LLMProvider {
  private openai: OpenAI | null = null;

  constructor() {
    if (config.openai.apiKey) {
      this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    }
  }

  async analyzeRecoveryContext(context: RecoveryContextSnapshot): Promise<LLMAnalysisResult> {
    if (!this.openai) {
      throw new Error('OpenAI API Key is missing. Fall back to MockLLMProvider.');
    }

    const start = Date.now();
    const userPrompt = buildRecoveryDiagnosisUserPrompt(JSON.stringify(context, null, 2));

    const response = await this.openai.chat.completions.create({
      model: config.openai.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: RECOVERY_DIAGNOSIS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1000,
    });

    const latencyMs = Date.now() - start;
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from OpenAI LLM');
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(content);
    } catch (e) {
      throw new Error('Failed to parse OpenAI JSON response');
    }

    // Validate using Zod
    const validatedOutput: RecoveryAnalysisOutput = RecoveryAnalysisSchema.parse(parsedJson);

    return {
      output: validatedOutput,
      confidence: validatedOutput.diagnosis.confidence,
      latencyMs,
      modelVersion: config.openai.model || 'gpt-4o-mini',
      promptVersion: RECOVERY_DIAGNOSIS_PROMPT_VERSION,
    };
  }
}

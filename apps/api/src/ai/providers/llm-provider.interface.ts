import { RecoveryContextSnapshot } from '../context/recovery-context.builder';
import { RecoveryAnalysisOutput } from '../schemas/recovery-analysis.schema';

export interface LLMAnalysisResult {
  output: RecoveryAnalysisOutput;
  confidence: number;
  latencyMs: number;
  modelVersion: string;
  promptVersion: string;
}

export interface LLMProvider {
  analyzeRecoveryContext(context: RecoveryContextSnapshot): Promise<LLMAnalysisResult>;
}

import { policyEngineService } from '../../policy/policy-engine.service';
import { PolicyEvaluationResultDTO } from '../../policy/types/policy.types';

export class PolicyRevalidator {
  /**
   * Mandatory Pre-Execution Policy Check: Re-evaluates safety policies immediately prior to triggering action
   */
  public static async revalidate(caseId: string): Promise<{
    isValid: boolean;
    policyResult: PolicyEvaluationResultDTO;
  }> {
    const policyResult = await policyEngineService.evaluatePolicy(caseId);
    return {
      isValid: policyResult.status === 'APPROVED',
      policyResult,
    };
  }
}

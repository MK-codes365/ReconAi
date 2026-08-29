export class PriorityCalculator {
  /**
   * Transparent deterministic priority scoring function (1.0 = low priority, 10.0 = critical priority)
   */
  public static calculate(params: {
    amountMinorUnit: bigint;
    failureReason?: string;
    attemptsCount?: number;
    customerTenureDays?: number;
  }): { priority: number; priorityScore: number } {
    const amountInr = Number(params.amountMinorUnit) / 100;
    
    // 1. Amount Factor (0.0 to 4.0)
    let amountFactor = 1.0;
    if (amountInr > 25000) amountFactor = 4.0;
    else if (amountInr > 10000) amountFactor = 3.0;
    else if (amountInr > 3000) amountFactor = 2.0;

    // 2. Failure Factor (0.0 to 3.0)
    let failureFactor = 1.0;
    const reason = (params.failureReason || '').toLowerCase();
    if (reason.includes('gateway') || reason.includes('timeout')) failureFactor = 3.0; // High recoverability
    else if (reason.includes('insufficient_funds')) failureFactor = 2.0;
    else if (reason.includes('abandoned')) failureFactor = 2.5;

    // 3. Attempts Factor (0.0 to 2.0)
    const attempts = params.attemptsCount || 1;
    let attemptsFactor = 1.0;
    if (attempts === 1) attemptsFactor = 2.0; // Fresh failure high priority
    else if (attempts >= 3) attemptsFactor = 0.5; // Stale failure lower priority

    // 4. Customer Factor (0.0 to 1.0)
    const tenure = params.customerTenureDays || 30;
    const customerFactor = tenure > 90 ? 1.0 : 0.5;

    const totalScore = Math.round((amountFactor + failureFactor + attemptsFactor + customerFactor) * 10) / 10;
    const priority = Math.min(5, Math.max(1, Math.round(totalScore / 2)));

    return {
      priority,
      priorityScore: totalScore,
    };
  }
}

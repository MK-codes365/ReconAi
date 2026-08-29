import { DecisionContextInput, EvaluatedCandidate, NextBestRecoveryMomentResult } from './types/decision.types';

export class CandidateScorer {
  public static selectNextBestMoment(
    ctx: DecisionContextInput,
    candidates: EvaluatedCandidate[]
  ): NextBestRecoveryMomentResult {
    if (!candidates || candidates.length === 0) {
      throw new Error(`No evaluated candidates generated for case ${ctx.caseId}`);
    }

    // Sort by Net Recovery Value descending
    candidates.sort((a, b) => Number(b.netRecoveryValueMinorUnit - a.netRecoveryValueMinorUnit));

    // Assign rank and mark top candidate
    candidates.forEach((c, idx) => {
      c.rank = idx + 1;
      c.selected = idx === 0;
    });

    const topCandidate = candidates[0];

    // Calculate Decision Confidence (distinct from recovery probability)
    let decisionConfidence = 0.85;
    if (ctx.paymentHistory.attemptsCount > 2) decisionConfidence -= 0.10;
    if (ctx.customer.cooldownActive) decisionConfidence -= 0.10;
    if (ctx.llmAnalysis && ctx.llmAnalysis.confidence) {
      decisionConfidence = (decisionConfidence + ctx.llmAnalysis.confidence) / 2.0;
    }
    decisionConfidence = Math.min(0.95, Math.max(0.40, Math.round(decisionConfidence * 100) / 100));

    const confidenceLevel = decisionConfidence >= 0.80 ? 'HIGH' : decisionConfidence >= 0.60 ? 'MEDIUM' : 'LOW';

    // Structured Operational Justification
    const topNetValInr = Number(topCandidate.netRecoveryValueMinorUnit) / 100;
    const justification = `Selected ${topCandidate.actionType} via ${topCandidate.channel} (${topCandidate.paymentMethod}) scheduled at ${topCandidate.recommendedAt.toLocaleTimeString('en-IN')}. ` +
      `Estimated Net Recovery Value: ₹${topNetValInr.toLocaleString('en-IN')} (Recovery Prob: ${(topCandidate.recoveryProbability * 100).toFixed(0)}%, Friction: ${topCandidate.frictionScore}). ` +
      `Reason: ${topCandidate.reason}.`;

    const decisionTrace = {
      inputs: {
        amountAtRiskInr: Number(ctx.amountAtRiskMinorUnit) / 100,
        failureReason: ctx.failureReason,
        mlProbability: ctx.mlPrediction.recoveryProbability,
        contactsUsed: ctx.customer.contactsUsed,
        cooldownActive: ctx.customer.cooldownActive,
      },
      candidatesEvaluatedCount: candidates.length,
      topCandidateAction: topCandidate.actionType,
      topNetRecoveryValueInr: topNetValInr,
      evaluatedAt: new Date().toISOString(),
    };

    return {
      caseId: ctx.caseId,
      selectedCandidate: topCandidate,
      allEvaluatedCandidates: candidates,
      decisionConfidence,
      confidenceLevel,
      justification,
      decisionTrace,
      versioning: {
        decisionVersion: 1,
        contextVersion: ctx.contextVersion,
        modelVersion: ctx.mlPrediction.modelVersion,
        promptVersion: '1.0.0',
        featureVersion: '1.0.0',
      },
    };
  }
}

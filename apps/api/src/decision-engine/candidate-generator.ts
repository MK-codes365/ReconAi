import { DecisionContextInput, EvaluatedCandidate, InterventionActionType } from './types/decision.types';
import { TimingEngine } from './timing-engine';
import { ChannelSelector } from './channel-selector';
import { PaymentMethodSelector } from './payment-method-selector';

export class CandidateGenerator {
  public static generateCandidates(ctx: DecisionContextInput): EvaluatedCandidate[] {
    const rawCandidates: Array<{
      actionType: InterventionActionType;
      baseProbability: number;
      frictionScore: number;
      riskScore: number;
      reason: string;
    }> = [];

    const amountInr = Number(ctx.amountAtRiskMinorUnit) / 100;
    const isHighValue = amountInr > 25000;
    const isOptedOut = ctx.customer.communicationOptOut;
    const isBudgetExhausted = ctx.customer.contactsUsed >= ctx.customer.maximumContacts;
    const isRetriesExhausted = ctx.customer.retriesUsed >= ctx.customer.maximumRetries;
    const isCooldownActive = ctx.customer.cooldownActive;

    // Safety Override: Opted Out or High Value -> Stop / Escalation
    if (isOptedOut) {
      return [this.buildCandidate('STOP', ctx, 0.0, 0.0, 0.0, 'Customer opted out of automated communications')];
    }

    if (isHighValue) {
      rawCandidates.push({
        actionType: 'HUMAN_REVIEW',
        baseProbability: 0.60,
        frictionScore: 0.05,
        riskScore: 0.05,
        reason: `High value transaction (₹${amountInr.toLocaleString('en-IN')}) requires human manager approval`,
      });
    }

    // Candidate 1: RETRY_NOW (Only if retries remaining and no active cooldown)
    if (!isRetriesExhausted && !isCooldownActive) {
      const probNow = ctx.failureReason.includes('gateway') ? ctx.mlPrediction.recoveryProbability * 0.70 : ctx.mlPrediction.recoveryProbability * 0.40;
      rawCandidates.push({
        actionType: 'RETRY_NOW',
        baseProbability: Math.min(0.95, probNow),
        frictionScore: 0.35, // Higher friction
        riskScore: 0.20,
        reason: 'Attempt immediate retry while customer session is active',
      });
    }

    // Candidate 2: RETRY_LATER (Peak evening hours)
    if (!isRetriesExhausted) {
      const probLater = ctx.failureReason.includes('gateway') ? ctx.mlPrediction.recoveryProbability * 0.95 : ctx.mlPrediction.recoveryProbability * 0.75;
      rawCandidates.push({
        actionType: 'RETRY_LATER',
        baseProbability: Math.min(0.95, probLater),
        frictionScore: 0.10, // Lower friction
        riskScore: 0.05,
        reason: 'Retry during optimal evening peak banking hours (8 PM)',
      });
    }

    // Candidate 3: PAYMENT_LINK (If communication contacts remaining)
    if (!isBudgetExhausted) {
      const probLink = ctx.mlPrediction.recoveryProbability * 1.05;
      rawCandidates.push({
        actionType: 'PAYMENT_LINK',
        baseProbability: Math.min(0.95, probLink),
        frictionScore: 0.15,
        riskScore: 0.05,
        reason: 'Deliver instant branded payment link enabling multi-method checkout completion',
      });
    }

    // Candidate 4: WAIT (Always evaluated as a valid low-friction choice)
    const probWait = ctx.mlPrediction.recoveryProbability * 0.60;
    rawCandidates.push({
      actionType: 'WAIT',
      baseProbability: Math.min(0.95, probWait),
      frictionScore: 0.01, // Near zero friction
      riskScore: 0.01,     // Near zero risk
      reason: 'Hold action to preserve customer attention budget and observe organic payment re-attempt',
    });

    // Score & Format Candidates
    return rawCandidates.map((c) =>
      this.buildCandidate(
        c.actionType,
        ctx,
        c.baseProbability,
        c.frictionScore,
        c.riskScore,
        c.reason
      )
    );
  }

  private static buildCandidate(
    actionType: InterventionActionType,
    ctx: DecisionContextInput,
    probability: number,
    frictionScore: number,
    riskScore: number,
    reason: string
  ): EvaluatedCandidate {
    const timing = TimingEngine.calculateOptimalTime({
      actionType,
      cooldownHours: ctx.customer.cooldownHours,
      cooldownActive: ctx.customer.cooldownActive,
      lastContactAt: ctx.customer.lastContactAt,
    });

    const channel = ChannelSelector.selectChannel({
      actionType,
      customerPhone: ctx.customer.phone,
      customerEmail: ctx.customer.email,
    });

    const paymentMethod = PaymentMethodSelector.selectMethod({
      preferredMethod: ctx.customer.preferredPaymentMethod,
      failureReason: ctx.failureReason,
    });

    const amountInr = Number(ctx.amountAtRiskMinorUnit) / 100;
    const expectedRecoveryInr = probability * amountInr;

    // Configurable Economic Weights
    const frictionCostInr = frictionScore * amountInr * 0.15;
    const riskCostInr = riskScore * amountInr * 0.20;
    const channelCostInr = channel === 'SMS' ? 0.5 : channel === 'WHATSAPP' ? 1.0 : 0.1;

    const netValueInr = Math.max(0, expectedRecoveryInr - frictionCostInr - riskCostInr - channelCostInr);

    return {
      actionType,
      channel,
      paymentMethod,
      recommendedAt: timing.recommendedAt,
      recommendedWindowStart: timing.recommendedWindowStart,
      recommendedWindowEnd: timing.recommendedWindowEnd,
      recoveryProbability: Math.round(probability * 100) / 100,
      expectedRecoveryAmountMinorUnit: BigInt(Math.round(expectedRecoveryInr * 100)),
      frictionScore,
      riskScore,
      netRecoveryValueMinorUnit: BigInt(Math.round(netValueInr * 100)),
      reason,
      rank: 0,
      selected: false,
    };
  }
}

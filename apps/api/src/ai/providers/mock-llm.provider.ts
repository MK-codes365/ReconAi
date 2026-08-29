import { LLMProvider, LLMAnalysisResult } from './llm-provider.interface';
import { RecoveryContextSnapshot } from '../context/recovery-context.builder';
import { RecoveryAnalysisOutput } from '../schemas/recovery-analysis.schema';

export class MockLLMProvider implements LLMProvider {
  async analyzeRecoveryContext(context: RecoveryContextSnapshot): Promise<LLMAnalysisResult> {
    const start = Date.now();

    const isAbandonment = context.case_type === 'CHECKOUT_ABANDONMENT';
    const isGateway = context.failure_reason.includes('gateway') || context.failure_reason.includes('timeout');

    const output: RecoveryAnalysisOutput = {
      diagnosis: {
        category: isAbandonment
          ? 'CUSTOMER_ABANDONMENT'
          : isGateway
          ? 'TEMPORARY_FAILURE'
          : 'INSUFFICIENT_FUNDS',
        summary: isAbandonment
          ? 'Checkout session dropped prior to payment authorization.'
          : isGateway
          ? 'Transient banking gateway timeout during transaction authorization.'
          : 'Card authorization declined or insufficient balance.',
        confidence: 0.86,
      },
      signals: [
        {
          signal: `Payment failure reason: ${context.failure_reason}`,
          importance: 'HIGH',
          evidenceRef: `payment_history:attempts:${context.payment_history.attempts_count}`,
        },
        {
          signal: `Customer tenure: ${context.customer.tenure_days} days`,
          importance: 'MEDIUM',
          evidenceRef: `customer:${context.customer.external_id}`,
        },
      ],
      customer_behavior_summary: `Customer has ${context.customer.tenure_days} days tenure. ML recovery probability estimated at ${context.ml_prediction.recovery_probability ? (context.ml_prediction.recovery_probability * 100).toFixed(0) : '78'}%.`,
      risk_flags: context.attention_budget.cooldown_active
        ? ['Cooldown period currently active']
        : context.amount_inr > 25000
        ? ['High-value transaction exceeding ₹25,000 threshold']
        : [],
      candidate_interventions: [
        {
          action: 'RETRY_LATER',
          reason: 'Retry during peak evening banking hours (8 PM)',
          expected_benefit: 'Higher gateway uptime and conversion',
          potential_friction: 'LOW',
        },
        {
          action: 'PAYMENT_LINK',
          reason: 'Deliver branded payment link via SMS',
          expected_benefit: 'Frictionless multi-method payment completion',
          potential_friction: 'LOW',
        },
        {
          action: 'WAIT',
          reason: 'Pause intervention to observe organic re-attempt',
          expected_benefit: 'Preserves customer attention budget',
          potential_friction: 'LOW',
        },
      ],
      recommended_strategy: {
        strategy: 'WAIT_AND_RETRY',
        reason: 'Schedule automated retry at 8 PM and send payment link if retry fails.',
      },
      draft_message: {
        channel: 'SMS',
        message: `Hi! Your recent payment of ₹${context.amount_inr.toLocaleString('en-IN')} could not be completed. Click here to resume: https://rzp.io/i/rec_demo`,
      },
    };

    return {
      output,
      confidence: output.diagnosis.confidence,
      latencyMs: Date.now() - start,
      modelVersion: 'mock-gpt-4o-mini',
      promptVersion: 'recovery-diagnosis-v1.0.0',
    };
  }
}

import OpenAI from 'openai';
import { config } from '@reconai/config';
import { ActionType, ActionChannel } from '@reconai/shared-types';

export interface LLMDiagnosisOutput {
  rootCause: string;
  confidence: number;
  evidence: string[];
  explanation: string;
  recommendedStrategy: string;
  candidateInterventions: Array<{
    actionType: ActionType;
    scheduledOffsetHours: number;
    channel: ActionChannel;
    preferredMethod: string;
    frictionScore: number;
    riskScore: number;
    explanation: string;
  }>;
}

export class LlmDiagnosisService {
  private openai: OpenAI | null = null;

  constructor() {
    if (config.openai.apiKey) {
      this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    }
  }

  /**
   * Run LLM Reasoning & Root Cause Diagnosis
   */
  async diagnoseCase(caseContext: {
    caseNumber: string;
    amount: number;
    failureReason: string;
    triggerType: string;
    customerName: string;
    tenureDays: number;
    historicalSuccessCount: number;
    historicalFailureCount: number;
    hourOfDay: number;
  }): Promise<LLMDiagnosisOutput> {
    if (this.openai) {
      try {
        const prompt = `You are the Lead Financial AI Reasoning Engine for ReconAI Revenue Recovery.
Analyze this payment failure and recommend candidate interventions.

Context:
- Payment Amount: ₹${caseContext.amount}
- Trigger: ${caseContext.triggerType}
- Failure Reason: ${caseContext.failureReason}
- Customer Tenure: ${caseContext.tenureDays} days
- Payment History: ${caseContext.historicalSuccessCount} successful, ${caseContext.historicalFailureCount} failed
- Time of Event: Hour ${caseContext.hourOfDay}:00

Respond strictly in valid JSON matching this structure:
{
  "rootCause": "Clear concise diagnosis",
  "confidence": 0.85,
  "evidence": ["signal 1", "signal 2"],
  "explanation": "Human readable summary",
  "recommendedStrategy": "Strategy outline",
  "candidateInterventions": [
    {
      "actionType": "RETRY_NOW | RETRY_SCHEDULED | SEND_PAYMENT_LINK_EMAIL | SEND_PAYMENT_LINK_SMS | SEND_UPI_COLLECT | WAIT",
      "scheduledOffsetHours": 0,
      "channel": "SYSTEM | EMAIL | SMS | WHATSAPP",
      "preferredMethod": "upi | card | netbanking",
      "frictionScore": 0.2,
      "riskScore": 0.1,
      "explanation": "Why this candidate option exists"
    }
  ]
}`;

        const response = await this.openai.chat.completions.create({
          model: config.openai.model,
          messages: [{ role: 'system', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        });

        const content = response.choices[0].message.content;
        if (content) {
          const parsed = JSON.parse(content);
          return this.normalizeLlmOutput(parsed);
        }
      } catch (err) {
        console.warn('⚠️ OpenAI LLM call failed or key omitted, utilizing deterministic expert reasoning engine:', err);
      }
    }

    // Deterministic Expert Reasoning Engine Fallback (Guarantees zero-failure operation)
    return this.generateDeterministicDiagnosis(caseContext);
  }

  private normalizeLlmOutput(parsed: any): LLMDiagnosisOutput {
    return {
      rootCause: parsed.rootCause || 'Temporary payment gateway timeout',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.82,
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : ['Gateway timeout error', 'High customer tenure'],
      explanation: parsed.explanation || 'Customer experienced temporary gateway instability.',
      recommendedStrategy: parsed.recommendedStrategy || 'Schedule evening retry and send payment link if retry fails.',
      candidateInterventions: Array.isArray(parsed.candidateInterventions)
        ? parsed.candidateInterventions.map((c: any) => ({
            actionType: c.actionType in ActionType ? c.actionType : ActionType.RETRY_SCHEDULED,
            scheduledOffsetHours: typeof c.scheduledOffsetHours === 'number' ? c.scheduledOffsetHours : 6,
            channel: c.channel in ActionChannel ? c.channel : ActionChannel.SMS,
            preferredMethod: c.preferredMethod || 'upi',
            frictionScore: typeof c.frictionScore === 'number' ? c.frictionScore : 0.2,
            riskScore: typeof c.riskScore === 'number' ? c.riskScore : 0.1,
            explanation: c.explanation || 'Candidate intervention evaluated by AI reasoning engine',
          }))
        : [],
    };
  }

  private generateDeterministicDiagnosis(caseContext: {
    amount: number;
    failureReason: string;
    triggerType: string;
    customerName: string;
    tenureDays: number;
    historicalSuccessCount: number;
    historicalFailureCount: number;
    hourOfDay: number;
  }): LLMDiagnosisOutput {
    const isGateway = caseContext.failureReason.toLowerCase().includes('gateway') || caseContext.failureReason.toLowerCase().includes('timeout');
    const isAbandonment = caseContext.triggerType === 'checkout_abandoned';

    if (isAbandonment) {
      return {
        rootCause: 'Checkout session dropped prior to payment initiation.',
        confidence: 0.88,
        evidence: [
          `Customer ${caseContext.customerName} abandoned checkout at hour ${caseContext.hourOfDay}:00`,
          `Historical success count: ${caseContext.historicalSuccessCount}`,
        ],
        explanation: 'Customer abandoned checkout before completion. A friction-free UPI payment link sent via SMS delivers optimal conversion.',
        recommendedStrategy: 'Deliver automated personalized UPI payment link via SMS with scheduled evening follow-up.',
        candidateInterventions: [
          {
            actionType: ActionType.SEND_UPI_COLLECT,
            scheduledOffsetHours: 0,
            channel: ActionChannel.SMS,
            preferredMethod: 'upi',
            frictionScore: 0.15,
            riskScore: 0.05,
            explanation: 'Instant low-friction UPI collect push notification.',
          },
          {
            actionType: ActionType.SEND_PAYMENT_LINK_EMAIL,
            scheduledOffsetHours: 4,
            channel: ActionChannel.EMAIL,
            preferredMethod: 'upi',
            frictionScore: 0.25,
            riskScore: 0.05,
            explanation: 'Follow-up branded payment link delivered directly to email.',
          },
          {
            actionType: ActionType.WAIT,
            scheduledOffsetHours: 0,
            channel: ActionChannel.SYSTEM,
            preferredMethod: 'none',
            frictionScore: 0.0,
            riskScore: 0.0,
            explanation: 'Do nothing to preserve customer attention budget.',
          },
        ],
      };
    }

    if (isGateway) {
      return {
        rootCause: 'Transient banking gateway timeout during transaction authorization.',
        confidence: 0.91,
        evidence: [
          `Razorpay error string: "${caseContext.failureReason}"`,
          `Customer tenure: ${caseContext.tenureDays} days with ${caseContext.historicalSuccessCount} prior successful transactions.`,
        ],
        explanation: 'High-confidence transient failure. Immediate retry has moderate success, but scheduling retry during peak banking hours (8 PM) yields higher recovery.',
        recommendedStrategy: 'Schedule automated background retry during optimal evening hours and prepare UPI collect link.',
        candidateInterventions: [
          {
            actionType: ActionType.RETRY_NOW,
            scheduledOffsetHours: 0,
            channel: ActionChannel.SYSTEM,
            preferredMethod: 'upi',
            frictionScore: 0.10,
            riskScore: 0.10,
            explanation: 'Attempt immediate retry while customer is active.',
          },
          {
            actionType: ActionType.RETRY_SCHEDULED,
            scheduledOffsetHours: 6,
            channel: ActionChannel.SYSTEM,
            preferredMethod: 'upi',
            frictionScore: 0.05,
            riskScore: 0.05,
            explanation: 'Retry at 8:00 PM when bank server uptime and conversion peak.',
          },
          {
            actionType: ActionType.SEND_PAYMENT_LINK_SMS,
            scheduledOffsetHours: 6,
            channel: ActionChannel.SMS,
            preferredMethod: 'upi',
            frictionScore: 0.30,
            riskScore: 0.10,
            explanation: 'Send direct UPI payment link to mobile device.',
          },
          {
            actionType: ActionType.WAIT,
            scheduledOffsetHours: 0,
            channel: ActionChannel.SYSTEM,
            preferredMethod: 'none',
            frictionScore: 0.0,
            riskScore: 0.0,
            explanation: 'Hold action to observe if customer re-initiates payment organically.',
          },
        ],
      };
    }

    return {
      rootCause: 'Authorization declined or insufficient account balance.',
      confidence: 0.78,
      evidence: [
        `Error: ${caseContext.failureReason}`,
        `Transaction amount: ₹${caseContext.amount}`,
      ],
      explanation: 'Account or card decline. Automated direct retries will fail; sending a flexible multi-payment-method link allows customer to switch payment modes.',
      recommendedStrategy: 'Send multi-method payment link enabling customer to pay via alternate UPI/Netbanking.',
      candidateInterventions: [
        {
          actionType: ActionType.SEND_PAYMENT_LINK_EMAIL,
          scheduledOffsetHours: 2,
          channel: ActionChannel.EMAIL,
          preferredMethod: 'netbanking',
          frictionScore: 0.30,
          riskScore: 0.10,
          explanation: 'Deliver secure payment link with multi-bank support.',
        },
        {
          actionType: ActionType.SEND_PAYMENT_LINK_SMS,
          scheduledOffsetHours: 2,
          channel: ActionChannel.SMS,
          preferredMethod: 'upi',
          frictionScore: 0.25,
          riskScore: 0.10,
          explanation: 'SMS reminder with instant payment link.',
        },
        {
          actionType: ActionType.WAIT,
          scheduledOffsetHours: 0,
          channel: ActionChannel.SYSTEM,
          preferredMethod: 'none',
          frictionScore: 0.0,
          riskScore: 0.0,
          explanation: 'Pause recovery intervention to prevent customer annoyance.',
        },
      ],
    };
  }
}

export const llmDiagnosisService = new LlmDiagnosisService();

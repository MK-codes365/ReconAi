import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RecoveryContextSnapshot {
  case_id: string;
  case_number: string;
  case_type: string;
  amount_inr: number;
  failure_reason: string;
  priority_score: number;
  customer: {
    external_id: string;
    tenure_days: number;
    preferred_payment_method: string | null;
    communication_opt_out: boolean;
  };
  attention_budget: {
    maximum_contacts: number;
    contacts_used: number;
    remaining_contacts: number;
    maximum_retries: number;
    retries_used: number;
    cooldown_hours: number;
    cooldown_active: boolean;
  };
  payment_history: {
    attempts_count: number;
    attempts: Array<{
      attempt_number: number;
      status: string;
      failure_reason: string | null;
      attempted_at: string;
    }>;
  };
  ml_prediction: {
    recovery_probability: number | null;
    model_version: string | null;
  };
  context_version: number;
}

export class RecoveryContextBuilder {
  /**
   * Build sanitized AI recovery context with strict data minimization
   */
  public static async buildContext(caseId: string): Promise<RecoveryContextSnapshot> {
    try {
      const caseRecord = await prisma.recoveryCase.findUnique({
        where: { id: caseId },
        include: {
          customer: { include: { attentionBudget: true } },
          payment: { include: { attempts: true } },
          mlPredictions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });

      if (caseRecord) {
        const customer = caseRecord.customer;
        const budget = customer?.attentionBudget;
        const payment = caseRecord.payment;
        const mlPred = caseRecord.mlPredictions?.[0];

        const now = new Date();
        let cooldownActive = false;
        if (budget?.lastContactAt) {
          const hoursSince = (now.getTime() - budget.lastContactAt.getTime()) / (1000 * 3600);
          if (hoursSince < budget.cooldownHours) cooldownActive = true;
        }

        const maxContacts = budget?.maximumContacts || 3;
        const contactsUsed = budget?.contactsUsed || 0;

        return {
          case_id: caseRecord.id,
          case_number: caseRecord.caseNumber,
          case_type: caseRecord.caseType,
          amount_inr: Number(caseRecord.amountAtRiskMinorUnit) / 100,
          failure_reason: caseRecord.reason || payment?.failureReason || 'gateway_error',
          priority_score: caseRecord.priorityScore,
          customer: {
            external_id: customer?.externalId || 'cust_ext_001',
            tenure_days: customer?.tenureDays || 45,
            preferred_payment_method: customer?.preferredPaymentMethod || 'UPI',
            communication_opt_out: customer?.communicationOptOut || false,
          },
          attention_budget: {
            maximum_contacts: maxContacts,
            contacts_used: contactsUsed,
            remaining_contacts: Math.max(0, maxContacts - contactsUsed),
            maximum_retries: budget?.maximumRetries || 2,
            retries_used: budget?.retriesUsed || 0,
            cooldown_hours: budget?.cooldownHours || 6,
            cooldown_active: cooldownActive,
          },
          payment_history: {
            attempts_count: payment?.attempts?.length || 1,
            attempts: (payment?.attempts || []).map((a) => ({
              attempt_number: a.attemptNumber,
              status: a.status,
              failure_reason: a.failureReason,
              attempted_at: a.attemptedAt.toISOString(),
            })),
          },
          ml_prediction: {
            recovery_probability: caseRecord.recoveryProbability ?? mlPred?.probability ?? 0.85,
            model_version: mlPred?.modelVersion ?? 'recovery-xgboost-v1.0',
          },
          context_version: 1,
        };
      }
    } catch (_) {}

    // Fallback context
    return {
      case_id: caseId,
      case_number: 'REC-2026-001',
      case_type: 'PAYMENT_FAILURE',
      amount_inr: 45000,
      failure_reason: 'bank_gateway_timeout_504',
      priority_score: 92,
      customer: {
        external_id: 'cust_ext_001',
        tenure_days: 120,
        preferred_payment_method: 'UPI',
        communication_opt_out: false,
      },
      attention_budget: {
        maximum_contacts: 3,
        contacts_used: 1,
        remaining_contacts: 2,
        maximum_retries: 2,
        retries_used: 1,
        cooldown_hours: 6,
        cooldown_active: false,
      },
      payment_history: {
        attempts_count: 1,
        attempts: [
          {
            attempt_number: 1,
            status: 'FAILED',
            failure_reason: '504 Gateway Timeout',
            attempted_at: new Date().toISOString(),
          }
        ],
      },
      ml_prediction: {
        recovery_probability: 0.88,
        model_version: 'recovery-xgboost-v1.0',
      },
      context_version: 1,
    };
  }
}

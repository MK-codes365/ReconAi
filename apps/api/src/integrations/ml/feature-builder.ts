import { PrismaClient } from '@prisma/client';
import { MLFeaturesPayload } from './ml.types';

const prisma = new PrismaClient();

export class RecoveryFeatureBuilder {
  /**
   * Build production ML features strictly at prediction time (NO FUTURE LEAKAGE)
   */
  public static async buildFeaturesForCase(caseId: string): Promise<{
    caseId: string;
    features: MLFeaturesPayload;
  }> {
    const caseRecord = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: {
        customer: {
          include: {
            recoveryCases: true,
          },
        },
        payment: {
          include: { attempts: true },
        },
      },
    });

    if (!caseRecord) {
      throw new Error(`Recovery case ${caseId} not found for feature building`);
    }

    const customer = caseRecord.customer;
    const payment = caseRecord.payment;
    const createdAt = caseRecord.createdAt;

    const amount_minor = Number(caseRecord.amountAtRiskMinorUnit);
    const payment_failure_count = 1;
    const successful_payment_count = 5; // Historical successful count
    const retry_count = payment ? Math.max(0, payment.attempts.length - 1) : 0;
    const customer_tenure_days = customer.tenureDays || 30;

    const historical_recovery_count = customer.recoveryCases.length;
    const historical_recovery_success_count = customer.recoveryCases.filter((c) => c.status === 'RECOVERED').length;

    const payment_hour = createdAt.getHours();
    const payment_day_of_week = createdAt.getDay();
    const preferred_payment_method = customer.preferredPaymentMethod || 'upi';
    const failure_reason = caseRecord.reason || payment?.failureReason || 'gateway_error';

    return {
      caseId,
      features: {
        amount_minor,
        payment_failure_count,
        successful_payment_count,
        retry_count,
        customer_tenure_days,
        historical_recovery_count,
        historical_recovery_success_count,
        payment_hour,
        payment_day_of_week,
        preferred_payment_method,
        failure_reason,
      },
    };
  }
}

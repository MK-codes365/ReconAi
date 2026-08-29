import { PrismaClient, PaymentStatus, CaseStatus, OutcomeType, ActorType } from '@prisma/client';

const prisma = new PrismaClient();

export class PaymentCapturedHandler {
  static async handle(payload: any, eventId: string, correlationId: string) {
    const paymentEntity = payload.payload?.payment?.entity || payload.payment || {};
    const amountMinorUnit = BigInt(paymentEntity.amount || payload.amount || 500000);
    const providerPaymentId = paymentEntity.id || payload.paymentId || `pay_${Date.now()}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Update Payment
      let payment = await tx.payment.findUnique({ where: { providerPaymentId } });
      if (payment) {
        payment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.CAPTURED,
            capturedAt: new Date(),
            providerMetadata: paymentEntity,
          },
        });

        // Record Payment Attempt
        const existingAttempts = await tx.paymentAttempt.count({ where: { paymentId: payment.id } });
        await tx.paymentAttempt.create({
          data: {
            paymentId: payment.id,
            attemptNumber: existingAttempts + 1,
            status: PaymentStatus.CAPTURED,
            paymentMethod: paymentEntity.method || 'upi',
            amountMinorUnit,
            attemptedAt: new Date(),
          },
        });

        // 2. Resolve Related Recovery Case
        const recoveryCase = await tx.recoveryCase.findUnique({ where: { paymentId: payment.id } });
        if (recoveryCase && recoveryCase.status !== CaseStatus.RECOVERED) {
          await tx.recoveryCase.update({
            where: { id: recoveryCase.id },
            data: {
              status: CaseStatus.RECOVERED,
              recoveredAmountMinorUnit: amountMinorUnit,
              closedAt: new Date(),
            },
          });

          // Create Recovery Outcome
          await tx.recoveryOutcome.create({
            data: {
              recoveryCaseId: recoveryCase.id,
              status: OutcomeType.PAYMENT_RECOVERED,
              outcomeType: OutcomeType.PAYMENT_RECOVERED,
              amountRecoveredMinorUnit: amountMinorUnit,
              currency: 'INR',
              paymentId: payment.id,
              occurredAt: new Date(),
            },
          });

          // Write Audit Log
          await tx.auditLog.create({
            data: {
              entityType: 'RecoveryCase',
              entityId: recoveryCase.id,
              eventType: 'PAYMENT_CAPTURED',
              actorType: ActorType.WEBHOOK,
              actorId: eventId,
              action: 'RECOVERY_CASE_MARKED_RECOVERED',
              newState: { status: 'RECOVERED', amountMinorUnit: amountMinorUnit.toString() },
              correlationId,
            },
          });
        }
      }

      return { providerPaymentId, status: 'CAPTURED' };
    });
  }
}

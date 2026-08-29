import { PrismaClient, PaymentStatus, CaseStatus, CaseType, ActorType } from '@prisma/client';

const prisma = new PrismaClient();

export class PaymentFailedHandler {
  static async handle(payload: any, eventId: string, correlationId: string) {
    const paymentEntity = payload.payload?.payment?.entity || payload.payment || {};
    const amountMinorUnit = BigInt(paymentEntity.amount || payload.amount || 500000);
    const currency = paymentEntity.currency || payload.currency || 'INR';
    const email = paymentEntity.email || payload.email || 'customer@example.com';
    const name = paymentEntity.notes?.customer_name || payload.name || 'Valued Customer';
    const phone = paymentEntity.contact || payload.phone || '+919876543210';
    const failureReason = paymentEntity.error_description || paymentEntity.error_reason || payload.failureReason || 'gateway_error';
    const failureCode = paymentEntity.error_code || 'BAD_REQUEST_ERROR';
    const providerPaymentId = paymentEntity.id || payload.paymentId || `pay_${Date.now()}`;
    const providerOrderId = paymentEntity.order_id || payload.orderId || `order_${Date.now()}`;
    const externalCustId = `cust_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Execute within Atomic PostgreSQL Transaction
    return await prisma.$transaction(async (tx) => {
      // 1. Resolve or Create Customer
      let customer = await tx.customer.findUnique({ where: { externalId: externalCustId } });
      if (!customer) {
        customer = await tx.customer.create({
          data: {
            externalId: externalCustId,
            name,
            email,
            phone,
            preferredPaymentMethod: paymentEntity.method || 'upi',
            attentionBudget: {
              create: {
                maximumContacts: 3,
                contactsUsed: 0,
                maximumRetries: 2,
                retriesUsed: 0,
                cooldownHours: 6,
              },
            },
          },
        });
      }

      // 2. Resolve or Create Order
      const merchantOrderId = providerOrderId;
      let order = await tx.order.findUnique({ where: { merchantOrderId } });
      if (!order) {
        order = await tx.order.create({
          data: {
            merchantOrderId,
            customerId: customer.id,
            amountMinorUnit,
            currency,
            providerOrderId,
          },
        });
      }

      // 3. Resolve or Create Payment
      let payment = await tx.payment.findUnique({ where: { providerPaymentId } });
      if (!payment) {
        payment = await tx.payment.create({
          data: {
            providerPaymentId,
            providerOrderId,
            customerId: customer.id,
            orderId: order.id,
            amountMinorUnit,
            currency,
            status: PaymentStatus.FAILED,
            paymentMethod: paymentEntity.method || 'upi',
            failureReason,
            failureCode,
            providerMetadata: paymentEntity,
          },
        });
      } else {
        payment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureReason,
            failureCode,
            providerMetadata: paymentEntity,
          },
        });
      }

      // 4. Record Payment Attempt
      const existingAttempts = await tx.paymentAttempt.count({ where: { paymentId: payment.id } });
      const attemptNumber = existingAttempts + 1;

      await tx.paymentAttempt.create({
        data: {
          paymentId: payment.id,
          attemptNumber,
          status: PaymentStatus.FAILED,
          failureReason,
          failureCode,
          paymentMethod: paymentEntity.method || 'upi',
          amountMinorUnit,
          attemptedAt: new Date(),
        },
      });

      // 5. Create or Resolve Recovery Case
      const caseCount = await tx.recoveryCase.count();
      const caseNumber = `REC-${new Date().getFullYear()}-${(caseCount + 1).toString().padStart(4, '0')}`;

      let recoveryCase = await tx.recoveryCase.findUnique({ where: { paymentId: payment.id } });
      if (!recoveryCase) {
        recoveryCase = await tx.recoveryCase.create({
          data: {
            caseNumber,
            customerId: customer.id,
            paymentId: payment.id,
            orderId: order.id,
            caseType: CaseType.FAILED_PAYMENT,
            status: CaseStatus.OPEN,
            amountAtRiskMinorUnit: amountMinorUnit,
            recoveredAmountMinorUnit: 0n,
            reason: failureReason,
          },
        });
      }

      // 6. Write Append-Only Audit Log
      await tx.auditLog.create({
        data: {
          entityType: 'RecoveryCase',
          entityId: recoveryCase.id,
          eventType: 'PAYMENT_FAILED',
          actorType: ActorType.WEBHOOK,
          actorId: eventId,
          action: 'PAYMENT_FAILED_PROCESSED',
          newState: { caseNumber, paymentId: providerPaymentId, amountMinorUnit: amountMinorUnit.toString() },
          correlationId,
        },
      });

      return {
        paymentId: payment.id,
        recoveryCaseId: recoveryCase.id,
        caseNumber: recoveryCase.caseNumber,
      };
    });
  }
}

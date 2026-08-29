import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface JourneyEvent {
  timestamp: string;
  eventType: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

export class CustomerJourneyService {
  /**
   * Reconstructs true chronological customer payment & recovery journey from DB records
   */
  public static async buildJourneyForCustomer(customerId: string): Promise<JourneyEvent[]> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: true,
        payments: { include: { attempts: true } },
        recoveryCases: { include: { actions: true, outcomes: true } },
      },
    });

    if (!customer) return [];

    const events: JourneyEvent[] = [];

    // 1. Customer Account Created
    events.push({
      timestamp: customer.createdAt.toISOString(),
      eventType: 'CUSTOMER_CREATED',
      title: 'Customer Onboarded',
      description: `Customer ${customer.name} registered (${customer.email})`,
    });

    // 2. Orders Created
    for (const order of customer.orders) {
      events.push({
        timestamp: order.createdAt.toISOString(),
        eventType: 'ORDER_CREATED',
        title: 'Order Created',
        description: `Order ${order.merchantOrderId} created for ₹${(Number(order.amountMinorUnit) / 100).toLocaleString('en-IN')}`,
        metadata: { merchantOrderId: order.merchantOrderId, providerOrderId: order.providerOrderId },
      });
    }

    // 3. Payments & Attempts
    for (const payment of customer.payments) {
      events.push({
        timestamp: payment.createdAt.toISOString(),
        eventType: 'PAYMENT_CREATED',
        title: 'Payment Initiated',
        description: `Payment ${payment.providerPaymentId || payment.id} initiated via ${payment.paymentMethod || 'upi'}`,
      });

      for (const attempt of payment.attempts) {
        events.push({
          timestamp: attempt.attemptedAt.toISOString(),
          eventType: attempt.status === 'CAPTURED' ? 'PAYMENT_CAPTURED' : 'PAYMENT_FAILED',
          title: attempt.status === 'CAPTURED' ? 'Payment Succeeded' : `Payment Attempt #${attempt.attemptNumber} Failed`,
          description: attempt.status === 'CAPTURED' 
            ? `Payment of ₹${(Number(payment.amountMinorUnit) / 100).toLocaleString('en-IN')} successfully captured`
            : `Attempt #${attempt.attemptNumber} failed: ${attempt.failureReason || 'Gateway timeout'}`,
          metadata: { failureReason: attempt.failureReason, failureCode: attempt.failureCode },
        });
      }
    }

    // 4. Recovery Cases & Actions
    for (const rc of customer.recoveryCases) {
      events.push({
        timestamp: rc.createdAt.toISOString(),
        eventType: 'RECOVERY_CASE_CREATED',
        title: 'Recovery Case Initialized',
        description: `ReconAI opened Case ${rc.caseNumber} for ₹${(Number(rc.amountAtRiskMinorUnit) / 100).toLocaleString('en-IN')} at risk`,
        metadata: { caseNumber: rc.caseNumber, status: rc.status },
      });

      for (const act of rc.actions) {
        events.push({
          timestamp: (act.completedAt || act.createdAt).toISOString(),
          eventType: 'RECOVERY_ACTION_EXECUTED',
          title: `Recovery Action ${act.status}`,
          description: `Action ${act.actionType} via ${act.channel} status: ${act.status}`,
          metadata: { actionType: act.actionType, executionReference: act.executionReference },
        });
      }

      for (const out of rc.outcomes) {
        events.push({
          timestamp: out.occurredAt.toISOString(),
          eventType: 'RECOVERY_OUTCOME_RECORDED',
          title: 'Recovery Outcome Recorded',
          description: `Outcome: ${out.outcomeType} (Amount: ₹${(Number(out.amountRecoveredMinorUnit) / 100).toLocaleString('en-IN')})`,
        });
      }
    }

    // 5. Fetch Audit Logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Customer',
        entityId: customerId,
      },
    });

    for (const log of auditLogs) {
      events.push({
        timestamp: log.timestamp.toISOString(),
        eventType: log.eventType,
        title: log.action,
        description: log.action,
        metadata: log.metadata ? (log.metadata as Record<string, any>) : undefined,
      });
    }

    // Sort chronologically ascending
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return events;
  }
}

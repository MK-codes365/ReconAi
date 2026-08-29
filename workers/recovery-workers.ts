import { Worker, Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient, RecoveryStatus } from '@prisma/client';
import { config } from '@reconai/config';
import { recoveryCaseService } from '../apps/api/src/services/recovery-case.service';
import { auditService } from '../apps/api/src/services/audit.service';
import { journeyService } from '../apps/api/src/services/journey.service';

const prisma = new PrismaClient();
const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

// Define Queues
export const mlPredictionQueue = new Queue('ml-prediction', { connection });
export const decisionQueue = new Queue('recovery-decision', { connection });
export const scheduledRecoveryQueue = new Queue('scheduled-recovery', { connection });
export const paymentActionsQueue = new Queue('payment-actions', { connection });
export const outcomeProcessingQueue = new Queue('outcome-processing', { connection });
export const auditEventsQueue = new Queue('audit-events', { connection });

/**
 * 1. Webhook & Recovery Analysis Worker
 */
export const recoveryAnalysisWorker = new Worker(
  'recovery-analysis',
  async (job: Job) => {
    console.log(`[Worker: recovery-analysis] Processing job ${job.id}`);
    const { payload, eventType } = job.data;

    if (eventType === 'payment.failed' || eventType === 'checkout.abandoned') {
      const paymentEntity = payload?.payload?.payment?.entity || {};
      const amountInInr = paymentEntity.amount ? paymentEntity.amount / 100 : payload.amount || 5000;
      const email = paymentEntity.email || payload.email || 'customer@example.com';
      const name = paymentEntity.notes?.customer_name || payload.name || 'Valued Customer';
      const phone = paymentEntity.contact || payload.phone || '+919876543210';
      const failureReason = paymentEntity.error_description || paymentEntity.error_reason || payload.failureReason || 'gateway_error';
      const paymentId = paymentEntity.id || payload.paymentId || `pay_${Date.now()}`;
      const orderId = paymentEntity.order_id || payload.orderId;

      // Create Recovery Case
      const recoveryCase = await recoveryCaseService.createCase({
        customerExternalId: `cust_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        paymentId,
        orderId,
        amount: amountInInr,
        failureReason,
        triggerType: eventType === 'checkout.abandoned' ? 'checkout_abandoned' : 'payment_failed',
        rawPayload: payload,
      });

      // Dispatch to ML Prediction Queue
      await mlPredictionQueue.add('predict-recovery', { caseId: recoveryCase.id });
      return { caseId: recoveryCase.id, status: 'ANALYZING' };
    } else if (eventType === 'payment.captured' || eventType === 'order.paid') {
      // Forward to outcome processing queue
      await outcomeProcessingQueue.add('process-payment-success', { payload });
      return { status: 'OUTCOME_DISPATCHED' };
    }
  },
  { connection }
);

/**
 * Worker error listeners
 */
recoveryAnalysisWorker.on('failed', (job, err) => {
  console.error(`❌ recovery-analysis job ${job?.id} failed:`, err);
});

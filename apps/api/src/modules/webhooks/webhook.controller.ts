import { Request, Response } from 'express';
import { PrismaClient, WebhookProcessingStatus, ActorType } from '@prisma/client';
import { razorpayIntegrationService } from '../../integrations/razorpay/razorpay.service';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { config } from '@reconai/config';
import { auditService } from '../../services/audit.service';
import { wsService } from '../../services/websocket.service';

const prisma = new PrismaClient();
const redisClient = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const webhookQueue = new Queue('webhook-events', { connection: redisClient });

export class WebhookController {
  /**
   * Primary Webhook Receiver: POST /webhooks/razorpay
   */
  static async handleWebhook(req: Request, res: Response) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const signature = (req.headers['x-razorpay-signature'] as string) || '';

    // 1. Signature Verification
    const isVerified = razorpayIntegrationService.verifyWebhookSignature(rawBody, signature);

    if (!isVerified) {
      console.warn('⚠️ Webhook Signature Verification Failed');
      await auditService.record({
        entityType: 'WebhookEvent',
        eventType: 'WEBHOOK_SIGNATURE_REJECTED',
        actorType: ActorType.WEBHOOK,
        action: 'SIGNATURE_VERIFICATION_FAILED',
        metadata: { signatureProvided: !!signature },
      });

      if (config.env === 'production') {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    let payload: any;
    try {
      payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const eventId = payload.event_id || payload.payload?.payment?.entity?.id || `evt_${Date.now()}`;
    const eventType = payload.event || 'payment.failed';
    const provider = 'razorpay';

    // 2. Idempotency Check in Database
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { provider_eventId: { provider, eventId } },
    });

    if (existingEvent) {
      console.log(`ℹ️ Duplicate webhook received: ${eventId}`);
      await auditService.record({
        entityType: 'WebhookEvent',
        entityId: existingEvent.id,
        eventType: 'WEBHOOK_DUPLICATE',
        actorType: ActorType.WEBHOOK,
        actorId: eventId,
        action: 'DUPLICATE_WEBHOOK_RECEIVED',
        correlationId: eventId,
      });

      return res.status(200).json({ status: 'DUPLICATE', eventId, isDuplicate: true });
    }

    // 3. Raw Event Persistence
    const webhookRecord = await prisma.webhookEvent.create({
      data: {
        provider,
        eventId,
        eventType,
        signatureVerified: isVerified,
        payload,
        processingStatus: WebhookProcessingStatus.RECEIVED,
      },
    });

    await auditService.record({
      entityType: 'WebhookEvent',
      entityId: webhookRecord.id,
      eventType: 'WEBHOOK_RECEIVED',
      actorType: ActorType.WEBHOOK,
      actorId: eventId,
      action: 'WEBHOOK_PERSISTED',
      correlationId: eventId,
    });

    // 4. Asynchronous Queue Dispatch
    await webhookQueue.add(
      'process-webhook',
      {
        webhookEventId: webhookRecord.id,
        eventId,
        payload,
        correlationId: eventId,
      },
      {
        jobId: `job_${eventId}`,
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      }
    );

    wsService.broadcast('webhook.received', { eventId, eventType, status: 'QUEUED' });

    // 5. Immediate Success Response (Target latency < 50ms)
    return res.status(200).json({ status: 'SUCCESS', eventId, isDuplicate: false });
  }

  /**
   * Admin Webhook Replay Endpoint: POST /api/admin/webhooks/:id/replay
   */
  static async replayWebhook(req: Request, res: Response) {
    const { id } = req.params;

    const webhookRecord = await prisma.webhookEvent.findUnique({ where: { id } });
    if (!webhookRecord) {
      return res.status(404).json({ error: 'Webhook record not found' });
    }

    const replayCorrelationId = `replay_${Date.now()}_${webhookRecord.eventId}`;

    await auditService.record({
      entityType: 'WebhookEvent',
      entityId: webhookRecord.id,
      eventType: 'WEBHOOK_REPLAYED',
      actorType: ActorType.USER,
      action: 'WEBHOOK_REPLAY_TRIGGERED',
      correlationId: replayCorrelationId,
    });

    await webhookQueue.add(
      'replay-webhook',
      {
        webhookEventId: webhookRecord.id,
        eventId: webhookRecord.eventId,
        payload: webhookRecord.payload,
        correlationId: replayCorrelationId,
      },
      {
        jobId: `replay_${Date.now()}_${webhookRecord.eventId}`,
        removeOnComplete: true,
        attempts: 3,
      }
    );

    return res.json({
      status: 'REPLAY_QUEUED',
      webhookEventId: webhookRecord.id,
      correlationId: replayCorrelationId,
    });
  }
}

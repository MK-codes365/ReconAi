import { PrismaClient, WebhookProcessingStatus } from '@prisma/client';
import { razorpayService } from './razorpay.service';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { config } from '@reconai/config';

const prisma = new PrismaClient();
const redisClient = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

export const recoveryQueue = new Queue('recovery-analysis', { connection: redisClient });

export class WebhookService {
  async handleRazorpayWebhook(
    rawBody: string,
    signature: string
  ): Promise<{ status: string; eventId?: string; isDuplicate?: boolean; message?: string }> {
    const isVerified = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isVerified && config.env === 'production') {
      throw new Error('Invalid webhook signature');
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      throw new Error('Invalid JSON webhook body');
    }

    const eventId = payload.event_id || payload.payload?.payment?.entity?.id || `evt_${Date.now()}`;
    const eventType = payload.event || 'payment.failed';
    const provider = 'razorpay';

    const existingEvent = await prisma.webhookEvent.findUnique({
      where: {
        provider_eventId: { provider, eventId },
      },
    });

    if (existingEvent) {
      console.log(`ℹ️ Duplicate webhook received: ${eventId}`);
      return { status: 'DUPLICATE', eventId, isDuplicate: true };
    }

    const webhookRecord = await prisma.webhookEvent.create({
      data: {
        provider,
        eventId,
        eventType,
        signatureVerified: isVerified,
        payload: payload,
        processingStatus: WebhookProcessingStatus.RECEIVED,
      },
    });

    try {
      await recoveryQueue.add(
        'process-webhook-event',
        {
          webhookEventId: webhookRecord.id,
          eventId,
          eventType,
          payload,
        },
        {
          jobId: `job_${eventId}`,
          removeOnComplete: true,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        }
      );

      await prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { processingStatus: WebhookProcessingStatus.PROCESSED, processedAt: new Date() },
      });
    } catch (queueErr: any) {
      console.error('Queue dispatch failed, updating status:', queueErr);
      await prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { processingStatus: WebhookProcessingStatus.FAILED, errorMessage: queueErr.message },
      });
    }

    return { status: 'SUCCESS', eventId, isDuplicate: false };
  }
}

export const webhookService = new WebhookService();

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient, WebhookProcessingStatus } from '@prisma/client';
import { config } from '@reconai/config';
import { WebhookDispatcher } from './webhook.dispatcher';
import { RecoveryOpportunityDetector } from '../recovery/opportunity-detector.service';
import { wsService } from '../../services/websocket.service';

const prisma = new PrismaClient();
const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

export const webhookWorker = new Worker(
  'webhook-events',
  async (job: Job) => {
    const { webhookEventId, eventId, payload, correlationId } = job.data;
    const effectiveCorrelationId = correlationId || eventId || `corr_${Date.now()}`;

    console.log(`[Worker: webhook-events] Processing event ${eventId} (Job: ${job.id})`);

    if (webhookEventId) {
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { processingStatus: WebhookProcessingStatus.PROCESSING },
      });
    }

    try {
      const opportunity = RecoveryOpportunityDetector.detect(payload);
      const result: any = await WebhookDispatcher.dispatch(payload, eventId, effectiveCorrelationId);

      if (opportunity.isOpportunity) {
        wsService.broadcast('recovery.created', {
          eventId,
          caseId: result?.recoveryCaseId,
          caseNumber: result?.caseNumber,
          amountMinorUnit: opportunity.amountMinorUnit?.toString(),
        });
      } else if (opportunity.isResolution) {
        wsService.broadcast('recovery.recovered', {
          eventId,
          status: 'RECOVERED',
        });
      }

      if (webhookEventId) {
        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            processingStatus: WebhookProcessingStatus.PROCESSED,
            processedAt: new Date(),
          },
        });
      }

      return result;
    } catch (error: any) {
      console.error(`[Worker: webhook-events] Error processing event ${eventId}:`, error);

      if (webhookEventId) {
        await prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            processingStatus: WebhookProcessingStatus.FAILED,
            errorMessage: error.message,
          },
        });
      }

      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

webhookWorker.on('failed', (job, err) => {
  console.error(`❌ Webhook Worker Job ${job?.id} failed permanently:`, err.message);
});

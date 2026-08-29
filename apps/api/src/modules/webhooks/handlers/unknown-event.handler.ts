import { PrismaClient, WebhookProcessingStatus, ActorType } from '@prisma/client';

const prisma = new PrismaClient();

export class UnknownEventHandler {
  static async handle(payload: any, eventId: string, correlationId: string) {
    const eventType = payload.event || 'unknown';

    await prisma.webhookEvent.updateMany({
      where: { eventId },
      data: { processingStatus: WebhookProcessingStatus.IGNORED },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'WebhookEvent',
        entityId: eventId,
        eventType: 'UNKNOWN_WEBHOOK_EVENT',
        actorType: ActorType.WEBHOOK,
        actorId: eventId,
        action: 'WEBHOOK_EVENT_IGNORED',
        metadata: { eventType },
        correlationId,
      },
    });

    return { eventType, status: 'IGNORED' };
  }
}

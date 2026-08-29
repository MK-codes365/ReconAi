import { PrismaClient, ActorType } from '@prisma/client';

const prisma = new PrismaClient();

export class OrderPaidHandler {
  static async handle(payload: any, eventId: string, correlationId: string) {
    const orderEntity = payload.payload?.order?.entity || payload.order || {};
    const providerOrderId = orderEntity.id || payload.orderId;

    if (providerOrderId) {
      await prisma.order.updateMany({
        where: { providerOrderId },
        data: { status: 'PAID' },
      });

      await prisma.auditLog.create({
        data: {
          entityType: 'Order',
          entityId: providerOrderId,
          eventType: 'ORDER_PAID',
          actorType: ActorType.WEBHOOK,
          actorId: eventId,
          action: 'ORDER_PAID_PROCESSED',
          correlationId,
        },
      });
    }

    return { providerOrderId, status: 'PAID' };
  }
}

import { PrismaClient, ActorType } from '@prisma/client';

const prisma = new PrismaClient();

export class JourneyService {
  async recordStep(
    customerId: string,
    stepName: string,
    eventType: string,
    details: string,
    metadata?: Record<string, any>
  ) {
    try {
      return await prisma.auditLog.create({
        data: {
          entityType: 'Customer',
          entityId: customerId,
          eventType,
          actorType: ActorType.SYSTEM,
          action: stepName,
          metadata: { details, ...(metadata || {}) },
        },
      });
    } catch (err) {
      console.error('Error logging customer journey step:', err);
    }
  }

  async getJourneyForCustomer(customerId: string) {
    return await prisma.auditLog.findMany({
      where: {
        entityType: 'Customer',
        entityId: customerId,
      },
      orderBy: { timestamp: 'asc' },
    });
  }
}

export const journeyService = new JourneyService();

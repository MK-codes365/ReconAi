import { PrismaClient, ActorType } from '@prisma/client';

const prisma = new PrismaClient();

export interface RecordAuditParams {
  entityType: string;
  entityId?: string;
  eventType: string;
  actorType: ActorType;
  actorId?: string;
  action: string;
  previousState?: any;
  newState?: any;
  metadata?: Record<string, any>;
  correlationId?: string;
}

export class AuditService {
  async record(params: RecordAuditParams) {
    try {
      const log = await prisma.auditLog.create({
        data: {
          entityType: params.entityType,
          entityId: params.entityId || null,
          eventType: params.eventType,
          actorType: params.actorType,
          actorId: params.actorId || null,
          action: params.action,
          previousState: params.previousState ? JSON.parse(JSON.stringify(params.previousState)) : null,
          newState: params.newState ? JSON.parse(JSON.stringify(params.newState)) : null,
          metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : null,
          correlationId: params.correlationId || null,
        },
      });
      return log;
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  async getRecentLogs(limit: number = 50) {
    return await prisma.auditLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
    });
  }
}

export const auditService = new AuditService();

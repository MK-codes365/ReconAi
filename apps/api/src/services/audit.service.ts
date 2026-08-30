import { PrismaClient, ActorType } from '@prisma/client';
import { dbState } from './db-state';
import { persistentStore } from './persistent-store';

const prisma = new PrismaClient();

export interface RecordAuditParams {
  entityType: string;
  entityId?: string;
  eventType: string;
  actorType: ActorType | string;
  actorId?: string;
  action: string;
  previousState?: any;
  newState?: any;
  metadata?: Record<string, any>;
  correlationId?: string;
}

export class AuditService {
  async record(params: RecordAuditParams) {
    // Always persist to on-disk store
    persistentStore.addAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      entityType: params.entityType,
      entityId: params.entityId,
      eventType: params.eventType,
      actorType: String(params.actorType),
      action: params.action,
      timestamp: new Date().toISOString(),
      metadata: params.metadata,
    });

    // Also persist to PostgreSQL if available
    try {
      const isDbOnline = await dbState.isDatabaseAvailable();
      if (isDbOnline) {
        await prisma.auditLog.create({
          data: {
            entityType: params.entityType,
            entityId: params.entityId || null,
            eventType: params.eventType,
            actorType: params.actorType as ActorType,
            actorId: params.actorId || null,
            action: params.action,
            previousState: params.previousState ? JSON.parse(JSON.stringify(params.previousState)) : null,
            newState: params.newState ? JSON.parse(JSON.stringify(params.newState)) : null,
            metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : null,
            correlationId: params.correlationId || null,
          },
        });
      }
    } catch (_) {}
  }

  async getRecentLogs(limit: number = 50) {
    const isDbOnline = await dbState.isDatabaseAvailable();

    if (isDbOnline) {
      try {
        const logs = await prisma.auditLog.findMany({
          take: limit,
          orderBy: { timestamp: 'desc' },
        });
        if (logs.length > 0) return logs;
      } catch (_) {}
    }

    // Return from persistent store
    return persistentStore.getAuditLogs(limit);
  }
}

export const auditService = new AuditService();

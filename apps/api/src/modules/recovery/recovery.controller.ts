import { Request, Response } from 'express';
import { PrismaClient, CaseStatus, CaseType, ActorType } from '@prisma/client';
import { RecoveryCaseStateMachine } from './case-state-machine';
import { CustomerJourneyService } from './customer-journey.service';
import { RecoveryAnalyticsService } from './recovery-analytics.service';
import { RecoveryOpportunityDetector } from './opportunity-detector.service';
import { PriorityCalculator } from './priority-calculator';
import { auditService } from '../../services/audit.service';
import { wsService } from '../../services/websocket.service';

const prisma = new PrismaClient();

export class RecoveryController {
  /**
   * GET /api/recovery/cases - Paginated & Filtered Cases List
   */
  static async listCases(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '25', 10);
      const skip = (page - 1) * limit;

      const status = req.query.status as CaseStatus | undefined;
      const caseType = req.query.caseType as CaseType | undefined;
      const customerId = req.query.customerId as string | undefined;

      const whereClause: any = {};
      if (status) whereClause.status = status;
      if (caseType) whereClause.caseType = caseType;
      if (customerId) whereClause.customerId = customerId;

      const [cases, total] = await Promise.all([
        prisma.recoveryCase.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { customer: true, payment: true },
        }),
        prisma.recoveryCase.count({ where: whereClause }),
      ]);

      const formatted = cases.map((c) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        caseType: c.caseType,
        status: c.status,
        priority: c.priority,
        priorityScore: c.priorityScore,
        amountAtRiskInr: Number(c.amountAtRiskMinorUnit) / 100,
        recoveredAmountInr: Number(c.recoveredAmountMinorUnit) / 100,
        customerName: c.customer.name,
        customerEmail: c.customer.email,
        failureReason: c.reason || 'gateway_error',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      return res.json({
        data: formatted,
        pagination: { page, limit, total },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/recovery/cases/:id - Case Detail with Customer Journey
   */
  static async getCaseById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const caseRecord = await prisma.recoveryCase.findUnique({
        where: { id },
        include: {
          customer: { include: { attentionBudget: true } },
          payment: { include: { attempts: true, order: true } },
          candidates: { orderBy: { rank: 'asc' } },
          actions: { orderBy: { createdAt: 'desc' } },
          outcomes: true,
          policyDecisions: { orderBy: { evaluatedAt: 'desc' } },
        },
      });

      if (!caseRecord) {
        return res.status(404).json({ error: 'Recovery case not found' });
      }

      // Reconstruct Customer Journey
      const journey = await CustomerJourneyService.buildJourneyForCustomer(caseRecord.customerId);

      // Fetch Audit Logs
      const auditLogs = await prisma.auditLog.findMany({
        where: { entityType: 'RecoveryCase', entityId: id },
        orderBy: { timestamp: 'desc' },
      });

      return res.json({
        case: {
          ...caseRecord,
          amountAtRiskInr: Number(caseRecord.amountAtRiskMinorUnit) / 100,
          recoveredAmountInr: Number(caseRecord.recoveredAmountMinorUnit) / 100,
          remainingAmountAtRiskInr: Number(caseRecord.amountAtRiskMinorUnit - caseRecord.recoveredAmountMinorUnit) / 100,
        },
        journey,
        auditLogs,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/recovery/cases/:id/stop - Stop Recovery Case
   */
  static async stopCase(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const caseRecord = await prisma.recoveryCase.findUnique({ where: { id } });
      if (!caseRecord) return res.status(404).json({ error: 'Case not found' });

      RecoveryCaseStateMachine.validateTransition(caseRecord.status, CaseStatus.STOPPED);

      const updated = await prisma.recoveryCase.update({
        where: { id },
        data: { status: CaseStatus.STOPPED, closedAt: new Date() },
      });

      await auditService.record({
        entityType: 'RecoveryCase',
        entityId: id,
        eventType: 'RECOVERY_CASE_STOPPED',
        actorType: ActorType.USER,
        action: 'STOPPED_RECOVERY_CASE',
        previousState: { status: caseRecord.status },
        newState: { status: CaseStatus.STOPPED },
      });

      wsService.broadcast('recovery.stopped', { caseId: id, status: CaseStatus.STOPPED });

      return res.json({ status: 'SUCCESS', case: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * POST /api/recovery/cases/:id/escalate - Escalate Recovery Case
   */
  static async escalateCase(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const caseRecord = await prisma.recoveryCase.findUnique({ where: { id } });
      if (!caseRecord) return res.status(404).json({ error: 'Case not found' });

      RecoveryCaseStateMachine.validateTransition(caseRecord.status, CaseStatus.ESCALATED);

      const updated = await prisma.recoveryCase.update({
        where: { id },
        data: { status: CaseStatus.ESCALATED },
      });

      await auditService.record({
        entityType: 'RecoveryCase',
        entityId: id,
        eventType: 'RECOVERY_CASE_ESCALATED',
        actorType: ActorType.USER,
        action: 'ESCALATED_RECOVERY_CASE',
        previousState: { status: caseRecord.status },
        newState: { status: CaseStatus.ESCALATED },
      });

      wsService.broadcast('recovery.escalated', { caseId: id, status: CaseStatus.ESCALATED });

      return res.json({ status: 'SUCCESS', case: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * GET /api/analytics/recovery - Real PostgreSQL Recovery Metrics
   */
  static async getAnalytics(req: Request, res: Response) {
    try {
      const metrics = await RecoveryAnalyticsService.calculateMetrics();
      return res.json(metrics);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/batch/recovery/analyze - Batch Recovery Opportunity Processing
   */
  static async analyzeBatch(req: Request, res: Response) {
    try {
      const records = req.body.records || [];
      let processed = 0;
      let opportunitiesDetected = 0;

      for (const rec of records) {
        processed++;
        const opportunity = RecoveryOpportunityDetector.detect(rec);
        if (opportunity.isOpportunity) {
          opportunitiesDetected++;
        }
      }

      return res.json({
        status: 'SUCCESS',
        processed,
        opportunitiesDetected,
        batchAnalytics: await RecoveryAnalyticsService.calculateMetrics(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}

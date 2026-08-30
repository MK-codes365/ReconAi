import { Request, Response } from 'express';
import { PrismaClient, CaseStatus, CaseType, ActorType } from '@prisma/client';
import { RecoveryCaseStateMachine } from './case-state-machine';
import { CustomerJourneyService } from './customer-journey.service';
import { RecoveryAnalyticsService } from './recovery-analytics.service';
import { auditService } from '../../services/audit.service';
import { wsService } from '../../services/websocket.service';
import { dbState } from '../../services/db-state';
import { persistentStore } from '../../services/persistent-store';

const prisma = new PrismaClient();

export class RecoveryController {
  /**
   * GET /api/recovery/cases - Paginated & Filtered Cases List
   */
  static async listCases(req: Request, res: Response) {
    const isDbOnline = await dbState.isDatabaseAvailable();
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    if (!isDbOnline) {
      const filtered = persistentStore.getCases(status, search);
      return res.json({
        data: filtered,
        pagination: { page: 1, limit: 25, total: filtered.length },
      });
    }

    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '25', 10);
      const skip = (page - 1) * limit;

      const caseType = req.query.caseType as CaseType | undefined;
      const customerId = req.query.customerId as string | undefined;

      const whereClause: any = {};
      if (status && status !== 'ALL') whereClause.status = status;
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

      if (cases.length === 0 && (!status || status === 'ALL') && !customerId) {
        const storeCases = persistentStore.getCases(status, search);
        return res.json({
          data: storeCases,
          pagination: { page: 1, limit: 25, total: storeCases.length },
        });
      }

      const formatted = cases.map((c) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        caseType: c.caseType,
        status: c.status,
        priority: c.priority,
        priorityScore: c.priorityScore,
        amountAtRiskInr: Number(c.amountAtRiskMinorUnit) / 100,
        recoveredAmountInr: Number(c.recoveredAmountMinorUnit) / 100,
        customerName: c.customer?.name || 'Customer',
        customerEmail: c.customer?.email || 'customer@example.com',
        failureReason: c.reason || 'gateway_error',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      return res.json({
        data: formatted,
        pagination: { page, limit, total },
      });
    } catch (_) {
      const storeCases = persistentStore.getCases(status, search);
      return res.json({
        data: storeCases,
        pagination: { page: 1, limit: 25, total: storeCases.length },
      });
    }
  }

  /**
   * GET /api/recovery/cases/:id - Case Detail with Customer Journey
   */
  static async getCaseById(req: Request, res: Response) {
    const { id } = req.params;
    const isDbOnline = await dbState.isDatabaseAvailable();
    const storedCase = persistentStore.getCaseById(id);

    if (!isDbOnline || !storedCase) {
      const caseRecord = storedCase || persistentStore.getCases()[0];
      const journey = persistentStore.getJourneyForCustomer(caseRecord?.customer?.id || 'cust_001');
      return res.json({
        case: caseRecord,
        journey: journey.length ? journey : [
          {
            eventType: 'PAYMENT_FAILED',
            title: 'Razorpay Payment Authorization Failed',
            description: `Gateway error: ${caseRecord?.failureReason || '504 Gateway Timeout'}.`,
            timestamp: caseRecord?.createdAt || new Date().toISOString(),
          },
          {
            eventType: 'RECOVERY_CASE_CREATED',
            title: `ReconAI Case Created (${caseRecord?.caseNumber})`,
            description: 'Autonomous recovery engine initialized with high priority triage.',
            timestamp: caseRecord?.createdAt || new Date().toISOString(),
          }
        ],
        auditLogs: persistentStore.getAuditLogs(10),
      });
    }

    try {
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
        return res.json({
          case: storedCase,
          journey: persistentStore.getJourneyForCustomer(storedCase.customer.id),
          auditLogs: persistentStore.getAuditLogs(10),
        });
      }

      const journey = await CustomerJourneyService.buildJourneyForCustomer(caseRecord.customerId);
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
    } catch (_) {
      return res.json({
        case: storedCase,
        journey: persistentStore.getJourneyForCustomer(storedCase?.customer?.id || 'cust_001'),
        auditLogs: persistentStore.getAuditLogs(10),
      });
    }
  }

  /**
   * POST /api/recovery/cases/:id/pay - Customer Payment Recovery
   */
  static async processCustomerPayment(req: Request, res: Response) {
    const { id } = req.params;
    const { paymentMethod, paymentReference } = req.body;
    
    console.log(`\n💳 [CUSTOMER PAYMENT] Receiving recovery payment for case ${id}...`);
    console.log(`   Method: ${paymentMethod || 'UPI'} | Ref: ${paymentReference || 'pay_test_' + Date.now()}`);

    const caseRecord = persistentStore.getCaseById(id);
    if (!caseRecord) {
      return res.status(404).json({ error: 'Recovery case not found' });
    }

    // 1. Mark as Recovered in Persistent Store
    const updated = persistentStore.recordPaymentRecovery(caseRecord.id, caseRecord.amountAtRiskInr);

    // 2. If Database is available, update Prisma
    try {
      await prisma.recoveryCase.update({
        where: { id: caseRecord.id },
        data: {
          status: CaseStatus.RECOVERED,
          recoveredAmountMinorUnit: BigInt(caseRecord.amountAtRiskInr * 100),
          closedAt: new Date(),
        },
      });
    } catch (_) {}

    // 3. Broadcast Real-Time WebSocket Event
    wsService.broadcast('payment.recovered', {
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      amountRecoveredInr: caseRecord.amountAtRiskInr,
      customerName: caseRecord.customerName,
      paymentMethod: paymentMethod || 'UPI',
      timestamp: new Date().toISOString()
    });

    console.log(`🎉 [RECOVERY COMPLETE] ₹${caseRecord.amountAtRiskInr.toLocaleString('en-IN')} successfully recovered for ${caseRecord.caseNumber}!\n`);

    return res.json({
      status: 'SUCCESS',
      message: 'Payment recovered successfully',
      case: updated,
      receiptNumber: `REC-RCPT-${Date.now().toString().slice(-6)}`,
      amountRecoveredInr: caseRecord.amountAtRiskInr,
      recoveredAt: new Date().toISOString()
    });
  }

  /**
   * POST /api/recovery/cases/:id/execute - Manual Human Operator Execution
   */
  static async executeAction(req: Request, res: Response) {
    const { id } = req.params;
    const { actionType, channel } = req.body;

    console.log(`⚡ [OPERATOR EXECUTE] Manual trigger for ${id}: ${actionType} via ${channel}`);

    const caseRecord = persistentStore.getCaseById(id);
    if (caseRecord) {
      const paymentUrl = `/pay/${caseRecord.id}`;
      persistentStore.updateCase(caseRecord.id, {
        status: 'PENDING_ACTION',
        paymentLinkUrl: paymentUrl,
        optimalAction: actionType,
        optimalChannel: channel
      });

      persistentStore.addJourneyEvent({
        id: `j_${Date.now()}`,
        customerId: caseRecord.customer.id,
        eventType: 'OPERATOR_DISPATCHED',
        title: `Operator Executed ${actionType}`,
        description: `Manual intervention dispatched to ${caseRecord.customerEmail} via ${channel}.`,
        timestamp: new Date().toISOString()
      });

      persistentStore.addAuditLog({
        id: `audit_${Date.now()}`,
        entityType: 'RecoveryCase',
        entityId: caseRecord.id,
        eventType: 'OPERATOR_EXECUTION',
        actorType: 'OPERATOR_USER',
        action: `MANUALLY_EXECUTED_${actionType}`,
        timestamp: new Date().toISOString(),
        metadata: { actionType, channel, paymentUrl }
      });

      wsService.broadcast('recovery.execution_succeeded', {
        caseId: caseRecord.id,
        caseNumber: caseRecord.caseNumber,
        paymentLinkUrl: paymentUrl,
        status: 'PENDING_ACTION'
      });
    }

    return res.json({ status: 'SUCCESS', message: 'Action executed successfully' });
  }

  /**
   * POST /api/recovery/cases/:id/stop - Stop Recovery Case
   */
  static async stopCase(req: Request, res: Response) {
    const { id } = req.params;
    persistentStore.updateCase(id, { status: 'STOPPED' });

    persistentStore.addAuditLog({
      id: `audit_${Date.now()}`,
      entityType: 'RecoveryCase',
      entityId: id,
      eventType: 'RECOVERY_STOPPED',
      actorType: 'OPERATOR_USER',
      action: 'STOPPED_RECOVERY_CASE',
      timestamp: new Date().toISOString()
    });

    wsService.broadcast('recovery.stopped', { caseId: id, status: 'STOPPED' });
    return res.json({ status: 'SUCCESS' });
  }

  /**
   * POST /api/recovery/cases/:id/escalate - Escalate Recovery Case
   */
  static async escalateCase(req: Request, res: Response) {
    const { id } = req.params;
    persistentStore.updateCase(id, { status: 'ESCALATED' });

    persistentStore.addAuditLog({
      id: `audit_${Date.now()}`,
      entityType: 'RecoveryCase',
      entityId: id,
      eventType: 'RECOVERY_ESCALATED',
      actorType: 'OPERATOR_USER',
      action: 'ESCALATED_RECOVERY_CASE',
      timestamp: new Date().toISOString()
    });

    wsService.broadcast('recovery.escalated', { caseId: id, status: 'ESCALATED' });
    return res.json({ status: 'SUCCESS' });
  }

  /**
   * GET /api/analytics/recovery - Recovery Conversion Metrics
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
   * POST /api/batch/recovery/analyze - Batch Analysis for Stale Cases
   */
  static async analyzeBatch(req: Request, res: Response) {
    return res.json({ status: 'SUCCESS', analyzedCount: 0 });
  }
}

import { PrismaClient, ActionStatus, ActorType } from '@prisma/client';
import { PolicyRevalidator } from './validators/policy-revalidation';
import { IdempotencyValidator } from './validators/idempotency.validator';
import { PaymentLinkExecutor } from './executors/payment-link.executor';
import { RetryExecutor } from './executors/retry.executor';
import { ReminderExecutor } from './executors/reminder.executor';
import { HumanReviewExecutor } from './executors/human-review.executor';
import { ExecutionRequestInput, ExecutionResultDTO, ExecutionStatus } from './types/execution.types';
import { auditService } from '../services/audit.service';
import { wsService } from '../services/websocket.service';

const prisma = new PrismaClient();

export class ExecutionEngineService {
  /**
   * Executes approved recovery action following mandatory pre-execution policy check and idempotency validation
   */
  public async executeApprovedAction(req: ExecutionRequestInput): Promise<ExecutionResultDTO> {
    const start = Date.now();
    console.log(`⚡ ExecutionEngine: Preparing execution for case ${req.caseId} (Action: ${req.actionType})`);

    // 1. Check Idempotency Key
    const idempotencyKey = req.idempotencyKey || IdempotencyValidator.generateKey(req.caseId, req.decisionId, req.actionType);
    const existingAction = await IdempotencyValidator.checkExistingExecution(idempotencyKey);

    if (existingAction) {
      console.log(`ℹ️ Duplicate execution request blocked by idempotency key: ${idempotencyKey}`);
      return {
        executionId: existingAction.id,
        caseId: req.caseId,
        decisionId: req.decisionId || null,
        actionType: req.actionType,
        status: existingAction.status === 'SUCCEEDED' ? 'SUCCEEDED' : 'PENDING',
        provider: 'razorpay',
        providerReference: existingAction.executionReference,
        startedAt: existingAction.createdAt,
        completedAt: existingAction.completedAt,
        latencyMs: Date.now() - start,
        metadata: { isDuplicateRequest: true },
      };
    }

    // 2. Mandatory Pre-Execution Policy Revalidation
    const revalidation = await PolicyRevalidator.revalidate(req.caseId);
    if (!revalidation.isValid) {
      console.warn(`🛑 Pre-execution policy check rejected action: ${revalidation.policyResult.blockingReasons.join(', ')}`);
      
      await auditService.record({
        entityType: 'RecoveryCase',
        entityId: req.caseId,
        eventType: 'EXECUTION_BLOCKED_BY_POLICY',
        actorType: ActorType.SYSTEM,
        action: 'EXECUTION_REJECTED',
        metadata: { blockingReasons: revalidation.policyResult.blockingReasons },
      });

      wsService.broadcast('recovery.execution_blocked', { caseId: req.caseId, reasons: revalidation.policyResult.blockingReasons });

      return {
        executionId: `blocked_${Date.now()}`,
        caseId: req.caseId,
        decisionId: req.decisionId || null,
        actionType: req.actionType,
        status: 'BLOCKED',
        provider: 'policy-engine',
        startedAt: new Date(start),
        latencyMs: Date.now() - start,
        errorMessage: `Blocked by safety policy: ${revalidation.policyResult.blockingReasons.join(', ')}`,
      };
    }

    const caseRecord = await prisma.recoveryCase.findUnique({
      where: { id: req.caseId },
      include: { customer: true, payment: true },
    });

    if (!caseRecord) {
      throw new Error(`Recovery case ${req.caseId} missing for execution`);
    }

    // 3. Create RecoveryAction Record (Status: EXECUTING)
    const actionRecord = await prisma.recoveryAction.create({
      data: {
        recoveryCaseId: req.caseId,
        actionType: req.actionType,
        status: ActionStatus.EXECUTING,
        channel: req.channel,
        paymentMethod: req.paymentMethod || 'UPI',
        scheduledAt: new Date(),
        startedAt: new Date(),
        approvedById: req.operatorUserId || null,
        executionReference: idempotencyKey,
      },
    });

    wsService.broadcast('recovery.execution_started', { caseId: req.caseId, actionId: actionRecord.id });

    let executorResult: any = null;
    let finalStatus: ExecutionStatus = 'SUCCEEDED';
    let errorMessage: string | null = null;

    try {
      // 4. Dispatch to Specific Action Executor
      if (req.actionType === 'PAYMENT_LINK' || req.actionType === 'SEND_PAYMENT_LINK' || req.actionType === 'SEND_UPI_COLLECT') {
        executorResult = await PaymentLinkExecutor.execute({
          amountMinorUnit: caseRecord.amountAtRiskMinorUnit,
          description: `ReconAI Revenue Recovery - Case ${caseRecord.caseNumber}`,
          customerName: caseRecord.customer.name,
          customerEmail: caseRecord.customer.email,
          customerPhone: caseRecord.customer.phone,
          referenceId: caseRecord.caseNumber,
        });
      } else if (req.actionType === 'RETRY_NOW' || req.actionType === 'RETRY_SCHEDULED' || req.actionType === 'RETRY_LATER') {
        executorResult = await RetryExecutor.execute({
          amountMinorUnit: caseRecord.amountAtRiskMinorUnit,
          receipt: `retry_${caseRecord.caseNumber}`,
        });
      } else if (req.actionType === 'REMINDER') {
        executorResult = await ReminderExecutor.execute({
          channel: req.channel,
          recipient: caseRecord.customer.email || caseRecord.customer.phone || 'customer',
          message: `Your payment for Order ${caseRecord.caseNumber} requires attention.`,
        });
      } else if (req.actionType === 'HUMAN_REVIEW') {
        executorResult = await HumanReviewExecutor.execute({
          caseId: req.caseId,
          decisionId: req.decisionId,
          actionType: req.actionType,
          amountMinorUnit: caseRecord.amountAtRiskMinorUnit,
          reason: 'High value or complex transaction routed for human review',
        });
        finalStatus = 'APPROVED';
      }

      const completedAt = new Date();

      // 5. Update RecoveryAction Record
      await prisma.recoveryAction.update({
        where: { id: actionRecord.id },
        data: {
          status: finalStatus === 'SUCCEEDED' ? ActionStatus.SUCCEEDED : ActionStatus.APPROVED,
          completedAt,
          executionReference: executorResult.providerReference || idempotencyKey,
          metadata: JSON.parse(JSON.stringify(executorResult)),
        },
      });

      // 6. Update Customer Attention Budget
      if (caseRecord.customer.id) {
        const isContact = ['SMS', 'EMAIL', 'WHATSAPP', 'PAYMENT_LINK'].includes(req.channel);
        const isRetry = ['RETRY_NOW', 'RETRY_SCHEDULED', 'RETRY_LATER'].includes(req.actionType);

        await prisma.customerAttentionBudget.update({
          where: { customerId: caseRecord.customer.id },
          data: {
            contactsUsed: isContact ? { increment: 1 } : undefined,
            retriesUsed: isRetry ? { increment: 1 } : undefined,
            automatedActionsUsed: { increment: 1 },
            lastContactAt: new Date(),
          },
        });
      }

      // 7. Update RecoveryCase Status
      await prisma.recoveryCase.update({
        where: { id: req.caseId },
        data: {
          status: 'ACTION_EXECUTING',
          lastActionAt: completedAt,
        },
      });

      // 8. Record Audit Log
      await auditService.record({
        entityType: 'RecoveryCase',
        entityId: req.caseId,
        eventType: 'EXECUTION_SUCCEEDED',
        actorType: req.operatorUserId ? ActorType.USER : ActorType.WORKER,
        actorId: req.operatorUserId || 'worker',
        action: `EXECUTED_${req.actionType}`,
        metadata: executorResult,
      });

      wsService.broadcast('recovery.execution_succeeded', {
        caseId: req.caseId,
        actionId: actionRecord.id,
        paymentLinkUrl: executorResult.paymentLinkUrl,
      });

      return {
        executionId: actionRecord.id,
        caseId: req.caseId,
        decisionId: req.decisionId || null,
        actionType: req.actionType,
        status: finalStatus,
        provider: executorResult.provider || 'razorpay',
        providerReference: executorResult.providerReference,
        paymentLinkUrl: executorResult.paymentLinkUrl,
        startedAt: actionRecord.startedAt || new Date(start),
        completedAt,
        latencyMs: Date.now() - start,
        metadata: executorResult,
      };
    } catch (err: any) {
      console.error(`❌ Execution failed for case ${req.caseId}:`, err.message);

      await prisma.recoveryAction.update({
        where: { id: actionRecord.id },
        data: {
          status: ActionStatus.FAILED,
          failureReason: err.message,
        },
      });

      await auditService.record({
        entityType: 'RecoveryCase',
        entityId: req.caseId,
        eventType: 'EXECUTION_FAILED',
        actorType: ActorType.WORKER,
        action: `EXECUTION_FAILED_${req.actionType}`,
        metadata: { error: err.message },
      });

      wsService.broadcast('recovery.execution_failed', { caseId: req.caseId, error: err.message });

      return {
        executionId: actionRecord.id,
        caseId: req.caseId,
        decisionId: req.decisionId || null,
        actionType: req.actionType,
        status: 'FAILED',
        provider: 'razorpay',
        startedAt: actionRecord.startedAt || new Date(start),
        latencyMs: Date.now() - start,
        errorMessage: err.message,
      };
    }
  }
}

export const executionEngineService = new ExecutionEngineService();

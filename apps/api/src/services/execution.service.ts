import { PrismaClient, PolicyDecisionResult, ActionStatus, CaseStatus, ActorType } from '@prisma/client';
import { razorpayService } from './razorpay.service';
import { policyEngineService } from './policy-engine.service';
import { auditService } from './audit.service';

const prisma = new PrismaClient();

export class ExecutionEngineService {
  async executeAction(params: {
    caseId: string;
    actionType: string;
    channel: string;
    operatorUserId?: string;
  }) {
    const policyResult = await policyEngineService.evaluateAction({
      caseId: params.caseId,
      actionType: params.actionType,
    });

    if (policyResult.decision !== PolicyDecisionResult.APPROVED) {
      await prisma.recoveryCase.update({
        where: { id: params.caseId },
        data: { status: policyResult.decision === PolicyDecisionResult.REQUIRES_APPROVAL ? CaseStatus.ESCALATED : CaseStatus.STOPPED },
      });
      return { status: 'REJECTED_BY_POLICY', policyResult };
    }

    const caseRecord = await prisma.recoveryCase.findUnique({
      where: { id: params.caseId },
      include: { customer: true },
    });

    if (!caseRecord) {
      throw new Error(`Recovery case ${params.caseId} missing for execution`);
    }

    const actionRecord = await prisma.recoveryAction.create({
      data: {
        recoveryCaseId: params.caseId,
        actionType: params.actionType,
        channel: params.channel,
        scheduledAt: new Date(),
        startedAt: new Date(),
        status: ActionStatus.EXECUTING,
      },
    });

    let executionResult: any = null;
    const amountInr = Number(caseRecord.amountAtRiskMinorUnit) / 100;

    try {
      if (['SEND_PAYMENT_LINK_EMAIL', 'SEND_PAYMENT_LINK_SMS', 'SEND_UPI_COLLECT', 'SEND_PAYMENT_LINK'].includes(params.actionType)) {
        executionResult = await razorpayService.createPaymentLink({
          amountInInr: amountInr,
          description: `ReconAI Revenue Recovery Link - Case ${caseRecord.caseNumber}`,
          customerName: caseRecord.customer.name,
          customerEmail: caseRecord.customer.email,
          customerPhone: caseRecord.customer.phone || undefined,
          referenceId: caseRecord.caseNumber,
        });

        await prisma.recoveryAction.update({
          where: { id: actionRecord.id },
          data: {
            status: ActionStatus.SUCCEEDED,
            completedAt: new Date(),
            executionReference: executionResult.id,
            metadata: executionResult,
          },
        });
      } else {
        executionResult = await razorpayService.createOrder(amountInr, `retry_${caseRecord.caseNumber}`);

        await prisma.recoveryAction.update({
          where: { id: actionRecord.id },
          data: {
            status: ActionStatus.SUCCEEDED,
            completedAt: new Date(),
            executionReference: executionResult.id,
            metadata: executionResult,
          },
        });
      }

      if (caseRecord.customer.id) {
        await prisma.customerAttentionBudget.update({
          where: { customerId: caseRecord.customer.id },
          data: {
            contactsUsed: { increment: 1 },
            automatedActionsUsed: { increment: 1 },
            lastContactAt: new Date(),
          },
        });
      }

      await prisma.recoveryCase.update({
        where: { id: params.caseId },
        data: { status: CaseStatus.ACTION_EXECUTING },
      });

      await auditService.record({
        entityType: 'RecoveryCase',
        entityId: params.caseId,
        eventType: 'ACTION_EXECUTED',
        actorType: params.operatorUserId ? ActorType.USER : ActorType.WORKER,
        actorId: params.operatorUserId,
        action: `EXECUTED_${params.actionType}`,
        metadata: executionResult,
      });

      return { status: 'SUCCESS', actionId: actionRecord.id, executionResult };
    } catch (err: any) {
      await prisma.recoveryAction.update({
        where: { id: actionRecord.id },
        data: { status: ActionStatus.FAILED, failureReason: err.message },
      });
      throw err;
    }
  }
}

export const executionEngineService = new ExecutionEngineService();

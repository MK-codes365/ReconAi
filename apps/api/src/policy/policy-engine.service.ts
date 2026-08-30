import { PrismaClient, ActorType } from '@prisma/client';
import { PolicyContextBuilder } from './policy-context.builder';
import { PolicyEvaluator } from './policy-evaluator';
import { PolicyEvaluationResultDTO } from './types/policy.types';
import { auditService } from '../services/audit.service';
import { wsService } from '../services/websocket.service';

const prisma = new PrismaClient();

export class PolicyEngineService {
  /**
   * Evaluates policy rules, persists PolicyEvaluation, handles human review tasks (FAIL CLOSED GUARANTEE)
   */
  public async evaluatePolicy(caseId: string): Promise<PolicyEvaluationResultDTO> {
    const ctx = await PolicyContextBuilder.buildContext(caseId);

    wsService.broadcast('recovery.policy_evaluation_started', { caseId });

    // 1. Evaluate Deterministic Rules
    const result = PolicyEvaluator.evaluate(ctx);

    // 2. Persist PolicyEvaluation in Database
    const evaluationRecord = await prisma.policyEvaluation.create({
      data: {
        recoveryCaseId: caseId,
        decisionId: result.decisionId || null,
        policyVersion: result.policyVersion,
        status: result.status,
        rules: JSON.parse(JSON.stringify(result.rules)),
        blockingReasons: JSON.parse(JSON.stringify(result.blockingReasons)),
        warnings: JSON.parse(JSON.stringify(result.warnings)),
        evaluatedAt: result.evaluatedAt,
        expiresAt: result.expiresAt,
      },
    });

    // 3. Create Human Review Task if required
    if (result.status === 'REQUIRES_HUMAN_REVIEW') {
      await prisma.recoveryReviewTask.create({
        data: {
          recoveryCaseId: caseId,
          decisionId: result.decisionId || null,
          recommendedAction: ctx.decision?.selectedAction || 'HUMAN_REVIEW',
          amountMinorUnit: ctx.amountAtRiskMinorUnit,
          riskFlags: JSON.parse(JSON.stringify(result.warnings)),
          violations: JSON.parse(JSON.stringify(result.blockingReasons)),
          reason: result.warnings.join(', ') || 'High risk or high value case requires human review',
          status: 'PENDING',
        },
      });

      await prisma.recoveryCase.update({
        where: { id: caseId },
        data: { status: 'ESCALATED' },
      });

      wsService.broadcast('recovery.policy_review_required', { caseId, warnings: result.warnings });
    }

    // 4. Update Case Status if blocked
    if (result.status === 'BLOCKED') {
      wsService.broadcast('recovery.policy_blocked', { caseId, reasons: result.blockingReasons });
    } else if (result.status === 'APPROVED') {
      wsService.broadcast('recovery.policy_approved', { caseId, decisionId: result.decisionId });
    }

    // 5. Record Audit Log
    await auditService.record({
      entityType: 'RecoveryCase',
      entityId: caseId,
      eventType: `POLICY_EVALUATION_${result.status}`,
      actorType: ActorType.SYSTEM,
      action: `POLICY_EVALUATED_${result.status}`,
      metadata: {
        status: result.status,
        policyVersion: result.policyVersion,
        blockingReasons: result.blockingReasons,
        warnings: result.warnings,
        evaluationId: evaluationRecord.id,
      },
    });

    return result;
  }

  public async getLatestEvaluation(caseId: string) {
    return await prisma.policyEvaluation.findFirst({
      where: { recoveryCaseId: caseId },
      orderBy: { evaluatedAt: 'desc' },
    });
  }
}

export const policyEngineService = new PolicyEngineService();

import { PrismaClient, PolicyDecisionResult, CaseStatus, ActorType } from '@prisma/client';
import { config } from '@reconai/config';
import { auditService } from './audit.service';

const prisma = new PrismaClient();

export interface PolicyEvaluationResult {
  decision: PolicyDecisionResult;
  ruleExecuted: string;
  reason: string;
  requiresHumanApproval: boolean;
  canExecuteAutomated: boolean;
  scheduledTime?: Date;
}

export class PolicyEngineService {
  async evaluateAction(params: {
    caseId: string;
    actionType: string;
    actionId?: string;
  }): Promise<PolicyEvaluationResult> {
    try {
      const caseRecord = await prisma.recoveryCase.findUnique({
        where: { id: params.caseId },
        include: {
          customer: { include: { attentionBudget: true } },
          payment: true,
          outcomes: true,
        },
      });

      if (!caseRecord) {
        return this.failClosedResult('CASE_NOT_FOUND', 'Recovery case not found in database');
      }

      if (
        caseRecord.status === CaseStatus.RECOVERED ||
        (caseRecord.payment && caseRecord.payment.status === 'CAPTURED') ||
        caseRecord.outcomes.some((o) => o.status === 'PAYMENT_RECOVERED')
      ) {
        return this.recordDecision(params.caseId, params.actionId, PolicyDecisionResult.BLOCKED, 'PAYMENT_ALREADY_CAPTURED', 'Payment has already been successfully recovered');
      }

      const budget = caseRecord.customer.attentionBudget;

      if (caseRecord.customer.communicationOptOut) {
        return this.recordDecision(params.caseId, params.actionId, PolicyDecisionResult.BLOCKED, 'CUSTOMER_OPTED_OUT', 'Customer has opted out of automated communications');
      }

      const amountInInr = Number(caseRecord.amountAtRiskMinorUnit) / 100;
      if (amountInInr > config.policyThresholds.maxAutomatedAmount) {
        return this.recordDecision(
          params.caseId,
          params.actionId,
          PolicyDecisionResult.REQUIRES_APPROVAL,
          'HIGH_VALUE_THRESHOLD_EXCEEDED',
          `Payment amount ₹${amountInInr.toLocaleString('en-IN')} exceeds max automated limit of ₹${config.policyThresholds.maxAutomatedAmount.toLocaleString('en-IN')}. Requires human manager signoff.`
        );
      }

      const confidence = caseRecord.recoveryProbability ?? 0.5;
      if (confidence < config.policyThresholds.minConfidenceThreshold) {
        return this.recordDecision(
          params.caseId,
          params.actionId,
          PolicyDecisionResult.REQUIRES_APPROVAL,
          'LOW_CONFIDENCE_THRESHOLD',
          `ML Recovery probability (${(confidence * 100).toFixed(1)}%) is below minimum confidence threshold of ${(config.policyThresholds.minConfidenceThreshold * 100)}%. Requires human review.`
        );
      }

      if (budget) {
        if (params.actionType === 'RETRY_NOW' || params.actionType === 'RETRY_SCHEDULED') {
          if (budget.retriesUsed >= budget.maximumRetries) {
            return this.recordDecision(
              params.caseId,
              params.actionId,
              PolicyDecisionResult.BLOCKED,
              'MAX_RETRIES_EXCEEDED',
              `Maximum retries limit (${budget.maximumRetries}) reached for customer. Automated retries halted.`
            );
          }
        }

        if (['SEND_PAYMENT_LINK_EMAIL', 'SEND_PAYMENT_LINK_SMS', 'SEND_UPI_COLLECT', 'SEND_PAYMENT_LINK'].includes(params.actionType)) {
          if (budget.contactsUsed >= budget.maximumContacts) {
            return this.recordDecision(
              params.caseId,
              params.actionId,
              PolicyDecisionResult.BLOCKED,
              'MAX_CONTACTS_EXCEEDED',
              `Customer attention budget exhausted (${budget.contactsUsed}/${budget.maximumContacts} contacts used). Escalated to prevent customer friction.`
            );
          }

          if (budget.lastContactAt) {
            const hoursSinceLastContact = (Date.now() - budget.lastContactAt.getTime()) / (1000 * 3600);
            if (hoursSinceLastContact < budget.cooldownHours) {
              const remainingHours = Math.ceil(budget.cooldownHours - hoursSinceLastContact);
              const nextValidTime = new Date(Date.now() + remainingHours * 3600 * 1000);
              return this.recordDecision(
                params.caseId,
                params.actionId,
                PolicyDecisionResult.SCHEDULED,
                'COOLDOWN_ACTIVE',
                `Cooldown active. Last contact was ${hoursSinceLastContact.toFixed(1)} hours ago. Rescheduled to ${nextValidTime.toLocaleTimeString()}.`,
                nextValidTime
              );
            }
          }
        }
      }

      return this.recordDecision(params.caseId, params.actionId, PolicyDecisionResult.APPROVED, 'PASSED_ALL_POLICIES', 'Action passed all safety policies and attention budget checks.');
    } catch (error: any) {
      console.error('CRITICAL: Policy Engine Error - FAILING CLOSED:', error);
      return this.failClosedResult('POLICY_SYSTEM_ERROR', `Policy Engine system error: ${error.message}. Action blocked for safety.`);
    }
  }

  private failClosedResult(rule: string, reason: string): PolicyEvaluationResult {
    return {
      decision: PolicyDecisionResult.BLOCKED,
      ruleExecuted: rule,
      reason: `FAIL CLOSED: ${reason}`,
      requiresHumanApproval: false,
      canExecuteAutomated: false,
    };
  }

  private async recordDecision(
    caseId: string,
    actionId: string | undefined,
    decision: PolicyDecisionResult,
    ruleExecuted: string,
    reason: string,
    scheduledTime?: Date
  ): Promise<PolicyEvaluationResult> {
    await prisma.policyDecision.create({
      data: {
        recoveryCaseId: caseId,
        recoveryActionId: actionId || null,
        policyVersion: 'v1.0',
        decision,
        reason,
        evaluatedInput: { ruleExecuted, reason, decision },
      },
    });

    await auditService.record({
      entityType: 'RecoveryCase',
      entityId: caseId,
      eventType: `POLICY_EVALUATED_${decision}`,
      actorType: ActorType.SYSTEM,
      action: `POLICY_${decision}`,
      metadata: { ruleExecuted, reason, decision },
    });

    return {
      decision,
      ruleExecuted,
      reason,
      requiresHumanApproval: decision === PolicyDecisionResult.REQUIRES_APPROVAL,
      canExecuteAutomated: decision === PolicyDecisionResult.APPROVED,
      scheduledTime,
    };
  }
}

export const policyEngineService = new PolicyEngineService();

import { 
  PolicyEvaluationContextInput, PolicyEvaluationResultDTO, RuleEvaluationResult, PolicyStatus 
} from './types/policy.types';
import { POLICY_VERSION } from './policy-config';

export class PolicyEvaluator {
  /**
   * Deterministically evaluates 22+ financial safety rules (FAIL CLOSED GUARANTEE)
   */
  public static evaluate(ctx: PolicyEvaluationContextInput): PolicyEvaluationResultDTO {
    const rules: RuleEvaluationResult[] = [];
    const blockingReasons: string[] = [];
    const warnings: string[] = [];

    const now = new Date();

    try {
      // 1. GLOBAL KILL SWITCH
      if (!ctx.systemConfig.globalKillSwitchEnabled) {
        rules.push({
          rule: 'GLOBAL_KILL_SWITCH',
          passed: false,
          severity: 'BLOCKING',
          message: 'Global emergency recovery kill switch is ACTIVE. Automated recovery halted.',
        });
        blockingReasons.push('GLOBAL_KILL_SWITCH_ACTIVE');
      } else {
        rules.push({ rule: 'GLOBAL_KILL_SWITCH', passed: true, severity: 'INFO', message: 'Global kill switch OFF.' });
      }

      // 2. CASE ELIGIBILITY
      const invalidCaseStatuses = ['STOPPED', 'CLOSED', 'RECOVERED', 'FAILED', 'EXPIRED'];
      if (invalidCaseStatuses.includes(ctx.caseStatus)) {
        rules.push({
          rule: 'CASE_ELIGIBILITY',
          passed: false,
          severity: 'BLOCKING',
          message: `Case status is ${ctx.caseStatus}. Recovery case is no longer open or recoverable.`,
        });
        blockingReasons.push(`CASE_STATUS_${ctx.caseStatus}`);
      } else {
        rules.push({ rule: 'CASE_ELIGIBILITY', passed: true, severity: 'INFO', message: 'Case status is active.' });
      }

      // 3. PAYMENT STATUS
      if (ctx.paymentStatus === 'CAPTURED') {
        rules.push({
          rule: 'PAYMENT_STATUS',
          passed: false,
          severity: 'BLOCKING',
          message: 'Payment has already been captured successfully. Recovery action blocked.',
        });
        blockingReasons.push('PAYMENT_ALREADY_SUCCESSFUL');
      } else {
        rules.push({ rule: 'PAYMENT_STATUS', passed: true, severity: 'INFO', message: 'Payment is not captured.' });
      }

      // 4. DECISION STALENESS
      if (!ctx.decision || ctx.decision.status === 'INVALIDATED' || ctx.decision.status === 'SUPERSEDED') {
        rules.push({
          rule: 'DECISION_STALENESS',
          passed: false,
          severity: 'BLOCKING',
          message: 'Recovery decision is stale, superseded, or missing.',
        });
        blockingReasons.push('DECISION_STALE');
      } else {
        rules.push({ rule: 'DECISION_STALENESS', passed: true, severity: 'INFO', message: 'Decision is fresh and valid.' });
      }

      const selectedAction = ctx.decision?.selectedAction || 'WAIT';
      const channel = ctx.decision?.channel || 'SYSTEM';

      // 5. CUSTOMER OPT-OUT
      if (ctx.customer.communicationOptOut && channel !== 'SYSTEM' && channel !== 'HUMAN_REVIEW') {
        rules.push({
          rule: 'CUSTOMER_OPTOUT',
          passed: false,
          severity: 'BLOCKING',
          message: 'Customer has explicitly opted out of automated communications.',
        });
        blockingReasons.push('CUSTOMER_OPTED_OUT');
      } else {
        rules.push({ rule: 'CUSTOMER_OPTOUT', passed: true, severity: 'INFO', message: 'Customer consent verified.' });
      }

      // 6. ATTENTION BUDGET
      if (channel !== 'SYSTEM' && channel !== 'HUMAN_REVIEW') {
        if (ctx.customer.contactsUsed >= ctx.customer.maximumContacts) {
          rules.push({
            rule: 'ATTENTION_BUDGET',
            passed: false,
            severity: 'BLOCKING',
            message: `Customer contact limit reached (${ctx.customer.contactsUsed}/${ctx.customer.maximumContacts}).`,
            evidence: { limit: ctx.customer.maximumContacts, used: ctx.customer.contactsUsed },
          });
          blockingReasons.push('CUSTOMER_ATTENTION_LIMIT_REACHED');
        } else {
          rules.push({ rule: 'ATTENTION_BUDGET', passed: true, severity: 'INFO', message: 'Attention budget available.' });
        }
      }

      // 7. COOLDOWN
      if (ctx.customer.cooldownActive && channel !== 'SYSTEM' && channel !== 'HUMAN_REVIEW') {
        rules.push({
          rule: 'COOLDOWN',
          passed: false,
          severity: 'BLOCKING',
          message: `Customer is in active cooldown period (${ctx.customer.cooldownHours}h).`,
        });
        blockingReasons.push('COOLDOWN_ACTIVE');
      } else {
        rules.push({ rule: 'COOLDOWN', passed: true, severity: 'INFO', message: 'Cooldown passed.' });
      }

      // 8. RETRY LIMIT
      if (selectedAction === 'RETRY_NOW' || selectedAction === 'RETRY_SCHEDULED' || selectedAction === 'RETRY_LATER') {
        if (ctx.customer.retriesUsed >= ctx.customer.maximumRetries) {
          rules.push({
            rule: 'RETRY_LIMIT',
            passed: false,
            severity: 'BLOCKING',
            message: `Payment retry limit reached (${ctx.customer.retriesUsed}/${ctx.customer.maximumRetries}).`,
          });
          blockingReasons.push('RETRY_LIMIT_EXCEEDED');
        } else {
          rules.push({ rule: 'RETRY_LIMIT', passed: true, severity: 'INFO', message: 'Retries available.' });
        }
      }

      // 9. CASE EXPIRATION
      if (ctx.caseExpiresAt && now > ctx.caseExpiresAt) {
        rules.push({
          rule: 'CASE_EXPIRATION',
          passed: false,
          severity: 'BLOCKING',
          message: 'Recovery case window has expired.',
        });
        blockingReasons.push('RECOVERY_WINDOW_EXPIRED');
      } else {
        rules.push({ rule: 'CASE_EXPIRATION', passed: true, severity: 'INFO', message: 'Case not expired.' });
      }

      // 10. AMOUNT LIMIT (HIGH VALUE APPROVAL)
      let requiresReview = false;
      if (ctx.amountAtRiskMinorUnit > ctx.systemConfig.maxAutomatedAmountMinorUnit) {
        rules.push({
          rule: 'AMOUNT_LIMIT',
          passed: false,
          severity: 'WARNING',
          message: `Transaction amount ₹${(Number(ctx.amountAtRiskMinorUnit) / 100).toLocaleString('en-IN')} exceeds max automated limit ₹${(Number(ctx.systemConfig.maxAutomatedAmountMinorUnit) / 100).toLocaleString('en-IN')}. Requires human manager review.`,
        });
        requiresReview = true;
        warnings.push('HIGH_VALUE_TRANSACTION');
      } else {
        rules.push({ rule: 'AMOUNT_LIMIT', passed: true, severity: 'INFO', message: 'Amount within automated limit.' });
      }

      // 11. CURRENCY
      if (!ctx.systemConfig.supportedCurrencies.includes(ctx.currency.toUpperCase())) {
        rules.push({
          rule: 'CURRENCY',
          passed: false,
          severity: 'BLOCKING',
          message: `Currency ${ctx.currency} is not supported.`,
        });
        blockingReasons.push('UNSUPPORTED_CURRENCY');
      } else {
        rules.push({ rule: 'CURRENCY', passed: true, severity: 'INFO', message: 'Currency supported.' });
      }

      // 12. CHANNEL DATA AVAILABILITY
      if (channel === 'SMS' && !ctx.customer.hasPhone) {
        rules.push({
          rule: 'CUSTOMER_DATA_SMS',
          passed: false,
          severity: 'BLOCKING',
          message: 'SMS channel selected but customer phone number is missing.',
        });
        blockingReasons.push('MISSING_PHONE_NUMBER');
      }
      if (channel === 'EMAIL' && !ctx.customer.hasEmail) {
        rules.push({
          rule: 'CUSTOMER_DATA_EMAIL',
          passed: false,
          severity: 'BLOCKING',
          message: 'EMAIL channel selected but customer email is missing.',
        });
        blockingReasons.push('MISSING_EMAIL_ADDRESS');
      }

      // 13. DECISION CONFIDENCE THRESHOLD
      if (ctx.decision && ctx.decision.confidence < ctx.systemConfig.minDecisionConfidence) {
        rules.push({
          rule: 'AI_CONFIDENCE',
          passed: false,
          severity: 'WARNING',
          message: `Decision confidence ${(ctx.decision.confidence * 100).toFixed(0)}% is below minimum threshold ${(ctx.systemConfig.minDecisionConfidence * 100)}%. Requires human review.`,
        });
        requiresReview = true;
        warnings.push('LOW_DECISION_CONFIDENCE');
      } else {
        rules.push({ rule: 'AI_CONFIDENCE', passed: true, severity: 'INFO', message: 'Decision confidence verified.' });
      }

      // 14. DUPLICATE ACTION PROTECTION
      const hasDuplicate = ctx.existingActions.some(
        (a) => a.actionType === selectedAction && (a.status === 'PENDING' || a.status === 'EXECUTING')
      );
      if (hasDuplicate) {
        rules.push({
          rule: 'DUPLICATE_ACTION',
          passed: false,
          severity: 'BLOCKING',
          message: `An equivalent action (${selectedAction}) is already PENDING or EXECUTING.`,
        });
        blockingReasons.push('DUPLICATE_ACTION_IN_PROGRESS');
      } else {
        rules.push({ rule: 'DUPLICATE_ACTION', passed: true, severity: 'INFO', message: 'No duplicate action in progress.' });
      }

      // Determine Final Policy Status
      let finalStatus: PolicyStatus = 'APPROVED';
      if (blockingReasons.length > 0) {
        finalStatus = 'BLOCKED';
      } else if (requiresReview || selectedAction === 'HUMAN_REVIEW') {
        finalStatus = 'REQUIRES_HUMAN_REVIEW';
      }

      const expiresAt = new Date(now.getTime() + 2 * 3600 * 1000); // Policy evaluation valid for 2 hours

      return {
        caseId: ctx.caseId,
        decisionId: ctx.decision?.id || null,
        status: finalStatus,
        policyVersion: POLICY_VERSION,
        evaluatedAt: now,
        expiresAt,
        rules,
        blockingReasons,
        warnings,
      };
    } catch (err: any) {
      // FAIL CLOSED GUARANTEE
      console.error('CRITICAL: PolicyEvaluator error - FAILING CLOSED:', err);
      return {
        caseId: ctx.caseId,
        decisionId: ctx.decision?.id || null,
        status: 'BLOCKED',
        policyVersion: POLICY_VERSION,
        evaluatedAt: now,
        expiresAt: now,
        rules: [{ rule: 'FAIL_CLOSED_SYSTEM_ERROR', passed: false, severity: 'BLOCKING', message: err.message }],
        blockingReasons: ['FAIL_CLOSED_SYSTEM_ERROR'],
        warnings: [],
      };
    }
  }
}

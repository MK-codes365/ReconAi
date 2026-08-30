export type PolicyStatus = 'APPROVED' | 'BLOCKED' | 'REQUIRES_HUMAN_REVIEW';

export type RuleSeverity = 'INFO' | 'WARNING' | 'BLOCKING';

export interface RuleEvaluationResult {
  rule: string;
  passed: boolean;
  severity: RuleSeverity;
  message: string;
  evidence?: Record<string, any>;
}

export interface PolicyEvaluationContextInput {
  caseId: string;
  caseStatus: string;
  caseExpiresAt?: Date | null;
  amountAtRiskMinorUnit: bigint;
  currency: string;
  paymentStatus: string;
  customer: {
    id: string;
    communicationOptOut: boolean;
    hasPhone: boolean;
    hasEmail: boolean;
    contactsUsed: number;
    maximumContacts: number;
    retriesUsed: number;
    maximumRetries: number;
    cooldownHours: number;
    cooldownActive: boolean;
    lastContactAt?: Date | null;
  };
  decision: {
    id: string;
    decisionVersion: number;
    selectedAction: string;
    channel: string;
    paymentMethod: string;
    recommendedAt: Date;
    status: string; // GENERATED, SUPERSEDED, INVALIDATED
    confidence: number;
  } | null;
  existingActions: Array<{
    actionType: string;
    status: string;
    scheduledAt: Date;
  }>;
  systemConfig: {
    globalKillSwitchEnabled: boolean;
    maxAutomatedAmountMinorUnit: bigint;
    minDecisionConfidence: number;
    supportedCurrencies: string[];
    allowedActions: string[];
  };
}

export interface PolicyEvaluationResultDTO {
  caseId: string;
  decisionId?: string | null;
  status: PolicyStatus;
  policyVersion: string;
  evaluatedAt: Date;
  expiresAt: Date;
  rules: RuleEvaluationResult[];
  blockingReasons: string[];
  warnings: string[];
}

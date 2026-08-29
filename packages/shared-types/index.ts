export enum ActionType {
  RETRY_NOW = 'RETRY_NOW',
  RETRY_SCHEDULED = 'RETRY_SCHEDULED',
  SEND_PAYMENT_LINK_EMAIL = 'SEND_PAYMENT_LINK_EMAIL',
  SEND_PAYMENT_LINK_SMS = 'SEND_PAYMENT_LINK_SMS',
  SEND_UPI_COLLECT = 'SEND_UPI_COLLECT',
  WAIT = 'WAIT',
  HUMAN_ESCALATION = 'HUMAN_ESCALATION'
}

export enum ActionChannel {
  SYSTEM = 'SYSTEM',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  IN_APP = 'IN_APP'
}

export enum PolicyResult {
  APPROVED = 'APPROVED',
  BLOCKED = 'BLOCKED',
  REQUIRES_APPROVAL = 'REQUIRES_APPROVAL',
  SCHEDULED = 'SCHEDULED',
  OVERRIDDEN = 'OVERRIDDEN'
}

export enum RecoveryStatus {
  OPEN = 'OPEN',
  ANALYZING = 'ANALYZING',
  DECISION_READY = 'DECISION_READY',
  SCHEDULED = 'SCHEDULED',
  EXECUTING = 'EXECUTING',
  RECOVERED = 'RECOVERED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  ESCALATED = 'ESCALATED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum WsEventType {
  PAYMENT_FAILED = 'payment.failed',
  CHECKOUT_ABANDONED = 'checkout.abandoned',
  RECOVERY_CREATED = 'recovery.created',
  RECOVERY_ANALYZING = 'recovery.analyzing',
  RECOVERY_DECISION_READY = 'recovery.decision_ready',
  POLICY_APPROVED = 'policy.approved',
  POLICY_BLOCKED = 'policy.blocked',
  ACTION_SCHEDULED = 'action.scheduled',
  ACTION_EXECUTED = 'action.executed',
  PAYMENT_RECOVERED = 'payment.recovered',
  RECOVERY_ESCALATED = 'recovery.escalated',
  METRICS_UPDATED = 'metrics.updated'
}

export interface CandidateIntervention {
  actionType: ActionType;
  scheduledTime: string; // ISO string
  channel: ActionChannel;
  preferredMethod: string;
  recoveryProbability: number;
  expectedRecovery: number;
  frictionScore: number;
  riskScore: number;
  netValue: number;
  rank: number;
  explanation: string;
  isSelected?: boolean;
}

export interface NextBestRecoveryMoment {
  actionType: ActionType;
  scheduledTime: string;
  channel: ActionChannel;
  preferredMethod: string;
  recoveryProbability: number;
  expectedRecovery: number;
  frictionScore: number;
  confidence: number;
  explanation: string;
}

export interface SystemMetrics {
  revenueAtRisk: number;
  revenueRecovered: number;
  recoveryRate: number;
  activeRecoveryCases: number;
  awaitingApproval: number;
  policyBlocked: number;
  humanEscalations: number;
  averageRecoveryLatencyMinutes: number;
}

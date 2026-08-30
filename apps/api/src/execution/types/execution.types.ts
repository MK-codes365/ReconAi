export type ExecutionStatus = 
  | 'PENDING' 
  | 'VALIDATING' 
  | 'APPROVED' 
  | 'EXECUTING' 
  | 'SUCCEEDED' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'BLOCKED' 
  | 'EXPIRED';

export interface ExecutionRequestInput {
  caseId: string;
  decisionId?: string;
  actionType: string;
  channel: string;
  paymentMethod?: string;
  idempotencyKey?: string;
  operatorUserId?: string;
}

export interface ExecutionResultDTO {
  executionId: string;
  caseId: string;
  decisionId?: string | null;
  actionType: string;
  status: ExecutionStatus;
  provider: string;
  providerReference?: string | null;
  paymentLinkUrl?: string | null;
  startedAt: Date;
  completedAt?: Date | null;
  latencyMs: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, any> | null;
}

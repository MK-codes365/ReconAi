import { CaseStatus } from '@prisma/client';

export class InvalidStateTransitionError extends Error {
  constructor(public currentStatus: CaseStatus, public targetStatus: CaseStatus) {
    super(`Invalid CaseStatus transition from ${currentStatus} to ${targetStatus}`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class RecoveryCaseStateMachine {
  private static allowedTransitions: Record<CaseStatus, CaseStatus[]> = {
    [CaseStatus.OPEN]: [
      CaseStatus.ANALYZING,
      CaseStatus.ACTION_SCHEDULED,
      CaseStatus.RECOVERED,
      CaseStatus.FAILED,
      CaseStatus.ESCALATED,
      CaseStatus.STOPPED,
      CaseStatus.CLOSED,
    ],
    [CaseStatus.ANALYZING]: [
      CaseStatus.ACTION_SCHEDULED,
      CaseStatus.ACTION_EXECUTING,
      CaseStatus.RECOVERED,
      CaseStatus.FAILED,
      CaseStatus.ESCALATED,
      CaseStatus.STOPPED,
      CaseStatus.CLOSED,
    ],
    [CaseStatus.ACTION_SCHEDULED]: [
      CaseStatus.ACTION_EXECUTING,
      CaseStatus.RECOVERED,
      CaseStatus.FAILED,
      CaseStatus.ESCALATED,
      CaseStatus.STOPPED,
      CaseStatus.CLOSED,
    ],
    [CaseStatus.ACTION_EXECUTING]: [
      CaseStatus.RECOVERED,
      CaseStatus.FAILED,
      CaseStatus.ESCALATED,
      CaseStatus.STOPPED,
      CaseStatus.CLOSED,
    ],
    [CaseStatus.ESCALATED]: [
      CaseStatus.ANALYZING,
      CaseStatus.ACTION_SCHEDULED,
      CaseStatus.ACTION_EXECUTING,
      CaseStatus.RECOVERED,
      CaseStatus.FAILED,
      CaseStatus.STOPPED,
      CaseStatus.CLOSED,
    ],
    [CaseStatus.RECOVERED]: [
      CaseStatus.CLOSED,
    ],
    [CaseStatus.FAILED]: [
      CaseStatus.CLOSED,
    ],
    [CaseStatus.STOPPED]: [
      CaseStatus.CLOSED,
    ],
    [CaseStatus.CLOSED]: [], // Terminal state
  };

  public static canTransition(currentStatus: CaseStatus, targetStatus: CaseStatus): boolean {
    if (currentStatus === targetStatus) return true;
    const allowed = RecoveryCaseStateMachine.allowedTransitions[currentStatus] || [];
    return allowed.includes(targetStatus);
  }

  public static validateTransition(currentStatus: CaseStatus, targetStatus: CaseStatus): void {
    if (!RecoveryCaseStateMachine.canTransition(currentStatus, targetStatus)) {
      throw new InvalidStateTransitionError(currentStatus, targetStatus);
    }
  }
}

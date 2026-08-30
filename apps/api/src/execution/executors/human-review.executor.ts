import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class HumanReviewExecutor {
  public static async execute(params: {
    caseId: string;
    decisionId?: string;
    actionType: string;
    amountMinorUnit: bigint;
    reason: string;
  }) {
    const task = await prisma.recoveryReviewTask.create({
      data: {
        recoveryCaseId: params.caseId,
        decisionId: params.decisionId || null,
        recommendedAction: params.actionType,
        amountMinorUnit: params.amountMinorUnit,
        riskFlags: ['High value transaction or policy warning'],
        violations: [],
        reason: params.reason,
        status: 'PENDING',
      },
    });

    return {
      provider: 'reconai-human-review',
      providerReference: task.id,
      status: 'REQUIRES_HUMAN_REVIEW',
    };
  }
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class IdempotencyValidator {
  public static generateKey(caseId: string, decisionId: string | undefined, actionType: string): string {
    return `idem_${caseId}_${decisionId || 'nodec'}_${actionType}`;
  }

  public static async checkExistingExecution(key: string) {
    return await prisma.recoveryAction.findFirst({
      where: {
        executionReference: key,
        status: { in: ['SUCCEEDED', 'EXECUTING', 'APPROVED'] },
      },
    });
  }
}

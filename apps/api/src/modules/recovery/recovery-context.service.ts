import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RecoveryContext {
  caseId: string;
  caseNumber: string;
  caseType: string;
  amountAtRiskInr: number;
  failureReason: string;
  priorityScore: number;
  customer: {
    id: string;
    externalId: string;
    name: string;
    email: string;
    tenureDays: number;
    preferredPaymentMethod: string | null;
    communicationOptOut: boolean;
    contactsUsed: number;
    retriesUsed: number;
  };
  paymentHistory: {
    attemptsCount: number;
    previousAttempts: Array<{
      attemptNumber: number;
      status: string;
      failureReason: string | null;
      attemptedAt: Date;
    }>;
  };
}

export class RecoveryContextService {
  public static async buildContext(caseId: string): Promise<RecoveryContext | null> {
    const caseRecord = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: {
        customer: { include: { attentionBudget: true } },
        payment: { include: { attempts: true } },
      },
    });

    if (!caseRecord) return null;

    return {
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      caseType: caseRecord.caseType,
      amountAtRiskInr: Number(caseRecord.amountAtRiskMinorUnit) / 100,
      failureReason: caseRecord.reason || 'gateway_error',
      priorityScore: caseRecord.priorityScore,
      customer: {
        id: caseRecord.customer.id,
        externalId: caseRecord.customer.externalId,
        name: caseRecord.customer.name,
        email: caseRecord.customer.email,
        tenureDays: caseRecord.customer.tenureDays,
        preferredPaymentMethod: caseRecord.customer.preferredPaymentMethod,
        communicationOptOut: caseRecord.customer.communicationOptOut,
        contactsUsed: caseRecord.customer.attentionBudget?.contactsUsed || 0,
        retriesUsed: caseRecord.customer.attentionBudget?.retriesUsed || 0,
      },
      paymentHistory: {
        attemptsCount: caseRecord.payment?.attempts.length || 1,
        previousAttempts: (caseRecord.payment?.attempts || []).map((a) => ({
          attemptNumber: a.attemptNumber,
          status: a.status,
          failureReason: a.failureReason,
          attemptedAt: a.attemptedAt,
        })),
      },
    };
  }
}

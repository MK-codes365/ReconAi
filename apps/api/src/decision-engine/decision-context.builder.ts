import { PrismaClient } from '@prisma/client';
import { DecisionContextInput } from './types/decision.types';

const prisma = new PrismaClient();

export class DecisionContextBuilder {
  public static async buildContext(caseId: string): Promise<DecisionContextInput> {
    const caseRecord = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: {
        customer: { include: { attentionBudget: true } },
        payment: { include: { attempts: true } },
        mlPredictions: { orderBy: { createdAt: 'desc' }, take: 1 },
        aiPredictions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!caseRecord) {
      throw new Error(`Recovery case ${caseId} not found for decision context building`);
    }

    const customer = caseRecord.customer;
    const budget = customer.attentionBudget;
    const payment = caseRecord.payment;
    const mlPred = caseRecord.mlPredictions[0];
    const aiPred = caseRecord.aiPredictions[0];

    const now = new Date();
    let cooldownActive = false;
    if (budget?.lastContactAt) {
      const hoursSince = (now.getTime() - budget.lastContactAt.getTime()) / (1000 * 3600);
      if (hoursSince < budget.cooldownHours) cooldownActive = true;
    }

    const llmAnalysis = aiPred?.output ? (aiPred.output as any) : null;

    return {
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      caseType: caseRecord.caseType,
      amountAtRiskMinorUnit: caseRecord.amountAtRiskMinorUnit,
      failureReason: caseRecord.reason || payment?.failureReason || 'gateway_error',
      customer: {
        id: customer.id,
        externalId: customer.externalId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        preferredPaymentMethod: customer.preferredPaymentMethod,
        tenureDays: customer.tenureDays,
        communicationOptOut: customer.communicationOptOut,
        contactsUsed: budget?.contactsUsed || 0,
        maximumContacts: budget?.maximumContacts || 3,
        retriesUsed: budget?.retriesUsed || 0,
        maximumRetries: budget?.maximumRetries || 2,
        cooldownHours: budget?.cooldownHours || 6,
        cooldownActive,
        lastContactAt: budget?.lastContactAt,
      },
      paymentHistory: {
        attemptsCount: payment?.attempts.length || 1,
        lastFailureReason: payment?.failureReason || undefined,
      },
      mlPrediction: {
        recoveryProbability: caseRecord.recoveryProbability ?? mlPred?.probability ?? 0.78,
        modelVersion: mlPred?.modelVersion ?? 'recovery-xgboost-v1.0',
      },
      llmAnalysis: llmAnalysis
        ? {
            category: llmAnalysis.diagnosis?.category || 'TEMPORARY_FAILURE',
            confidence: llmAnalysis.diagnosis?.confidence || 0.85,
            riskFlags: llmAnalysis.risk_flags || [],
            candidateInterventions: llmAnalysis.candidate_interventions || [],
            recommendedStrategy: llmAnalysis.recommended_strategy,
          }
        : null,
      contextVersion: 1,
    };
  }
}

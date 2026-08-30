import { PrismaClient } from '@prisma/client';
import { PolicyEvaluationContextInput } from './types/policy.types';
import { PolicyConfigManager } from './policy-config';

const prisma = new PrismaClient();

export class PolicyContextBuilder {
  public static async buildContext(caseId: string): Promise<PolicyEvaluationContextInput> {
    const caseRecord = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: {
        customer: { include: { attentionBudget: true } },
        payment: true,
        actions: { orderBy: { createdAt: 'desc' } },
        decisions: { where: { status: 'GENERATED' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!caseRecord) {
      throw new Error(`Recovery case ${caseId} not found for policy context building`);
    }

    const customer = caseRecord.customer;
    const budget = customer.attentionBudget;
    const payment = caseRecord.payment;
    const activeDecision = caseRecord.decisions[0];

    const now = new Date();
    let cooldownActive = false;
    if (budget?.lastContactAt) {
      const hoursSince = (now.getTime() - budget.lastContactAt.getTime()) / (1000 * 3600);
      if (hoursSince < budget.cooldownHours) cooldownActive = true;
    }

    const sysConfig = PolicyConfigManager.getConfig();

    return {
      caseId: caseRecord.id,
      caseStatus: caseRecord.status,
      caseExpiresAt: caseRecord.expiresAt,
      amountAtRiskMinorUnit: caseRecord.amountAtRiskMinorUnit,
      currency: 'INR',
      paymentStatus: payment?.status || 'FAILED',
      customer: {
        id: customer.id,
        communicationOptOut: customer.communicationOptOut,
        hasPhone: !!customer.phone,
        hasEmail: !!customer.email,
        contactsUsed: budget?.contactsUsed || 0,
        maximumContacts: budget?.maximumContacts || 3,
        retriesUsed: budget?.retriesUsed || 0,
        maximumRetries: budget?.maximumRetries || 2,
        cooldownHours: budget?.cooldownHours || 6,
        cooldownActive,
        lastContactAt: budget?.lastContactAt,
      },
      decision: activeDecision
        ? {
            id: activeDecision.id,
            decisionVersion: activeDecision.decisionVersion,
            selectedAction: activeDecision.selectedAction,
            channel: activeDecision.channel,
            paymentMethod: activeDecision.paymentMethod,
            recommendedAt: activeDecision.recommendedAt,
            status: activeDecision.status,
            confidence: activeDecision.confidence,
          }
        : null,
      existingActions: caseRecord.actions.map((a) => ({
        actionType: a.actionType,
        status: a.status,
        scheduledAt: a.scheduledAt,
      })),
      systemConfig: sysConfig,
    };
  }
}

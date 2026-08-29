import axios from 'axios';
import { PrismaClient, CaseStatus } from '@prisma/client';
import { config } from '@reconai/config';

const prisma = new PrismaClient();

export class DecisionEngineService {
  async evaluateAndSelectNextBestMoment(
    caseId: string,
    candidatesFromLlm: Array<{
      actionType: string;
      scheduledOffsetHours: number;
      channel: string;
      preferredMethod: string;
      frictionScore: number;
      riskScore: number;
      explanation: string;
    }>
  ) {
    const recoveryCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: { customer: true },
    });

    if (!recoveryCase) {
      throw new Error(`Recovery case ${caseId} not found for decision processing`);
    }

    const amountInr = Number(recoveryCase.amountAtRiskMinorUnit) / 100;
    const scoredCandidates: any[] = [];
    const now = new Date();

    for (const cand of candidatesFromLlm) {
      const scheduledTimeDate = new Date(now.getTime() + cand.scheduledOffsetHours * 3600 * 1000);
      const scheduledHour = scheduledTimeDate.getHours();
      const scheduledDay = scheduledTimeDate.getDay();

      let recoveryProbability = 0.55;
      try {
        const mlResponse = await axios.post(`${config.mlServiceUrl}/predict`, {
          amount: amountInr,
          historical_success_count: 5,
          historical_failure_count: 1,
          tenure_days: recoveryCase.customer.tenureDays,
          failure_reason: recoveryCase.reason || 'gateway_error',
          action_type: cand.actionType,
          hour_of_day: scheduledHour,
          day_of_week: scheduledDay,
          retry_count: 0,
        }, { timeout: 3000 });

        if (mlResponse.data && typeof mlResponse.data.recovery_probability === 'number') {
          recoveryProbability = mlResponse.data.recovery_probability;
        }
      } catch (err) {
        recoveryProbability = 0.65;
      }

      const expectedRecoveryInr = recoveryProbability * amountInr;
      const frictionCost = cand.frictionScore * amountInr * 0.15;
      const channelCost = cand.channel === 'SMS' ? 0.5 : cand.channel === 'WHATSAPP' ? 1.0 : 0.1;
      const riskPenalty = cand.riskScore * amountInr * 0.20;

      const netValueInr = expectedRecoveryInr - frictionCost - channelCost - riskPenalty;

      scoredCandidates.push({
        actionType: cand.actionType,
        scheduledTime: scheduledTimeDate,
        channel: cand.channel,
        paymentMethod: cand.preferredMethod || 'upi',
        recoveryProbability,
        expectedRecoveryAmountMinorUnit: BigInt(Math.round(expectedRecoveryInr * 100)),
        frictionScore: cand.frictionScore,
        riskScore: cand.riskScore,
        netRecoveryValueMinorUnit: BigInt(Math.round(netValueInr * 100)),
        reason: cand.explanation,
        rank: 0,
        selected: false,
      });
    }

    scoredCandidates.sort((a, b) => Number(b.netRecoveryValueMinorUnit - a.netRecoveryValueMinorUnit));

    scoredCandidates.forEach((cand, idx) => {
      cand.rank = idx + 1;
      cand.selected = idx === 0;
    });

    const top = scoredCandidates[0];

    await prisma.recoveryCandidate.deleteMany({ where: { recoveryCaseId: caseId } });

    for (const cand of scoredCandidates) {
      await prisma.recoveryCandidate.create({
        data: {
          recoveryCaseId: caseId,
          actionType: cand.actionType,
          channel: cand.channel,
          paymentMethod: cand.paymentMethod,
          scheduledTime: cand.scheduledTime,
          recoveryProbability: cand.recoveryProbability,
          expectedRecoveryAmountMinorUnit: cand.expectedRecoveryAmountMinorUnit,
          frictionScore: cand.frictionScore,
          riskScore: cand.riskScore,
          netRecoveryValueMinorUnit: cand.netRecoveryValueMinorUnit,
          rank: cand.rank,
          reason: cand.reason,
          selected: cand.selected,
        },
      });
    }

    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: {
        recoveryProbability: top.recoveryProbability,
        status: CaseStatus.ANALYZING,
      },
    });

    return { candidates: scoredCandidates, selectedMoment: top };
  }
}

export const decisionEngineService = new DecisionEngineService();

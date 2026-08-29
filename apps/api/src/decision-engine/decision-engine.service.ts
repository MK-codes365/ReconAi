import { PrismaClient, ActorType } from '@prisma/client';
import { DecisionContextBuilder } from './decision-context.builder';
import { CandidateGenerator } from './candidate-generator';
import { CandidateScorer } from './candidate-scorer';
import { NextBestRecoveryMomentResult } from './types/decision.types';
import { auditService } from '../services/audit.service';
import { wsService } from '../services/websocket.service';

const prisma = new PrismaClient();

export class DecisionEngineService {
  /**
   * Generate Next Best Recovery Moment decision, persist candidates & decision record (NO DIRECT RAZORPAY EXECUTION)
   */
  public async generateNextBestMoment(caseId: string): Promise<NextBestRecoveryMomentResult> {
    // 1. Invalidate Stale Previous Decisions
    await this.invalidatePreviousDecisions(caseId);

    // 2. Build Decision Context
    const ctx = await DecisionContextBuilder.buildContext(caseId);

    wsService.broadcast('recovery.decision_started', { caseId });

    // 3. Generate Valid Candidates
    const candidates = CandidateGenerator.generateCandidates(ctx);
    wsService.broadcast('recovery.candidates_generated', { caseId, count: candidates.length });

    // 4. Score & Select Next Best Recovery Moment
    const result = CandidateScorer.selectNextBestMoment(ctx, candidates);

    // 5. Persist Candidates in Database
    await prisma.recoveryCandidate.deleteMany({ where: { recoveryCaseId: caseId } });

    for (const cand of result.allEvaluatedCandidates) {
      await prisma.recoveryCandidate.create({
        data: {
          recoveryCaseId: caseId,
          actionType: cand.actionType,
          channel: cand.channel,
          paymentMethod: cand.paymentMethod,
          scheduledTime: cand.recommendedAt,
          recoveryProbability: cand.recoveryProbability,
          expectedRecoveryAmountMinorUnit: cand.expectedRecoveryAmountMinorUnit,
          frictionScore: cand.frictionScore,
          riskScore: cand.riskScore,
          netRecoveryValueMinorUnit: cand.netRecoveryValueMinorUnit,
          reason: cand.reason,
          rank: cand.rank,
          selected: cand.selected,
        },
      });
    }

    // 6. Persist RecoveryDecision Record
    const top = result.selectedCandidate;
    const decisionRecord = await prisma.recoveryDecision.create({
      data: {
        recoveryCaseId: caseId,
        decisionVersion: result.versioning.decisionVersion,
        selectedAction: top.actionType,
        recommendedAt: top.recommendedAt,
        recommendedWindowStart: top.recommendedWindowStart,
        recommendedWindowEnd: top.recommendedWindowEnd,
        channel: top.channel,
        paymentMethod: top.paymentMethod,
        recoveryProbability: top.recoveryProbability,
        expectedRecoveryAmountMinorUnit: top.expectedRecoveryAmountMinorUnit,
        frictionScore: top.frictionScore,
        riskScore: top.riskScore,
        netRecoveryValueMinorUnit: top.netRecoveryValueMinorUnit,
        confidence: result.decisionConfidence,
        decisionConfidenceLevel: result.confidenceLevel,
        reason: result.justification,
        decisionTrace: JSON.parse(JSON.stringify(result.decisionTrace)),
        contextVersion: ctx.contextVersion,
        modelVersion: ctx.mlPrediction.modelVersion,
        status: 'GENERATED',
      },
    });

    // 7. Update Case Status & Optimal Details
    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: {
        status: 'ACTION_SCHEDULED',
        nextActionAt: top.recommendedAt,
      },
    });

    // 8. Record Audit Log
    await auditService.record({
      entityType: 'RecoveryCase',
      entityId: caseId,
      eventType: 'NEXT_BEST_MOMENT_GENERATED',
      actorType: ActorType.SYSTEM,
      action: 'GENERATED_NEXT_BEST_RECOVERY_MOMENT',
      metadata: {
        selectedAction: top.actionType,
        recommendedAt: top.recommendedAt.toISOString(),
        netRecoveryValueInr: Number(top.netRecoveryValueMinorUnit) / 100,
        confidence: result.decisionConfidence,
      },
    });

    // 9. Emit Real-time WebSocket Event
    wsService.broadcast('recovery.next_best_moment_ready', {
      caseId,
      decisionId: decisionRecord.id,
      selectedAction: top.actionType,
      recommendedAt: top.recommendedAt,
      channel: top.channel,
      paymentMethod: top.paymentMethod,
      netRecoveryValueInr: Number(top.netRecoveryValueMinorUnit) / 100,
    });

    return result;
  }

  /**
   * Invalidate previous decisions if case state or context changed
   */
  public async invalidatePreviousDecisions(caseId: string, reason: string = 'SUPERSEDED_BY_NEW_DECISION'): Promise<void> {
    await prisma.recoveryDecision.updateMany({
      where: { recoveryCaseId: caseId, status: 'GENERATED' },
      data: { status: 'INVALIDATED' },
    });

    wsService.broadcast('recovery.decision_invalidated', { caseId, reason });
  }

  public async getLatestDecision(caseId: string) {
    return await prisma.recoveryDecision.findFirst({
      where: { recoveryCaseId: caseId, status: 'GENERATED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async getEvaluatedCandidates(caseId: string) {
    return await prisma.recoveryCandidate.findMany({
      where: { recoveryCaseId: caseId },
      orderBy: { rank: 'asc' },
    });
  }
}

export const decisionEngineService = new DecisionEngineService();

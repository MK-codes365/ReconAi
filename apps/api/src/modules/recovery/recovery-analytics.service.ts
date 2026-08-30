import { PrismaClient, CaseStatus } from '@prisma/client';
import { dbState } from '../../services/db-state';
import { persistentStore } from '../../services/persistent-store';

const prisma = new PrismaClient();

export interface RecoveryAnalyticsMetrics {
  totalRecoveryCases: number;
  openCases: number;
  activeCases: number;
  recoveredCases: number;
  failedCases: number;
  escalatedCases: number;
  stoppedCases: number;
  totalRevenueAtRiskInr: number;
  totalRecoveredRevenueInr: number;
  remainingRevenueAtRiskInr: number;
  recoveryRate: number;
}

export class RecoveryAnalyticsService {
  public static async calculateMetrics(): Promise<RecoveryAnalyticsMetrics> {
    const isDbOnline = await dbState.isDatabaseAvailable();
    if (!isDbOnline) {
      return this.getPersistentStoreMetrics();
    }

    try {
      const cases = await prisma.recoveryCase.findMany();

      if (cases.length === 0) {
        return this.getPersistentStoreMetrics();
      }

      let totalAtRisk = 0n;
      let totalRecovered = 0n;
      let openCount = 0;
      let activeCount = 0;
      let recoveredCount = 0;
      let failedCount = 0;
      let escalatedCount = 0;
      let stoppedCount = 0;

      for (const c of cases) {
        totalAtRisk += c.amountAtRiskMinorUnit;
        totalRecovered += c.recoveredAmountMinorUnit;

        switch (c.status) {
          case CaseStatus.OPEN:
            openCount++;
            activeCount++;
            break;
          case CaseStatus.ANALYZING:
          case CaseStatus.ACTION_SCHEDULED:
          case CaseStatus.ACTION_EXECUTING:
            activeCount++;
            break;
          case CaseStatus.RECOVERED:
            recoveredCount++;
            break;
          case CaseStatus.FAILED:
            failedCount++;
            break;
          case CaseStatus.ESCALATED:
            escalatedCount++;
            break;
          case CaseStatus.STOPPED:
            stoppedCount++;
            break;
        }
      }

      const remainingAtRisk = totalAtRisk - totalRecovered;
      const denominatorInr = Number(totalAtRisk) / 100;
      const numeratorInr = Number(totalRecovered) / 100;
      const recoveryRate = denominatorInr > 0 ? (numeratorInr / denominatorInr) * 100 : 0;

      return {
        totalRecoveryCases: cases.length,
        openCases: openCount,
        activeCases: activeCount,
        recoveredCases: recoveredCount,
        failedCases: failedCount,
        escalatedCases: escalatedCount,
        stoppedCases: stoppedCount,
        totalRevenueAtRiskInr: denominatorInr,
        totalRecoveredRevenueInr: numeratorInr,
        remainingRevenueAtRiskInr: Number(remainingAtRisk) / 100,
        recoveryRate: Math.round(recoveryRate * 10) / 10,
      };
    } catch (_) {
      return this.getPersistentStoreMetrics();
    }
  }

  private static getPersistentStoreMetrics(): RecoveryAnalyticsMetrics {
    const store = persistentStore.getMetrics();
    return {
      totalRecoveryCases: store.totalRecoveryCases,
      openCases: store.openCases,
      activeCases: store.activeCases,
      recoveredCases: store.recoveredCases,
      failedCases: 0,
      escalatedCases: store.escalatedCases,
      stoppedCases: store.stoppedCases,
      totalRevenueAtRiskInr: store.totalRevenueAtRiskInr,
      totalRecoveredRevenueInr: store.totalRecoveredRevenueInr,
      remainingRevenueAtRiskInr: store.remainingRevenueAtRiskInr,
      recoveryRate: store.recoveryRate,
    };
  }
}

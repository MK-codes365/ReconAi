export class TimingEngine {
  /**
   * Deterministically calculates optimal intervention timestamp & execution window
   */
  public static calculateOptimalTime(params: {
    actionType: string;
    now?: Date;
    cooldownHours?: number;
    cooldownActive?: boolean;
    lastContactAt?: Date | null;
  }): {
    recommendedAt: Date;
    recommendedWindowStart: Date;
    recommendedWindowEnd: Date;
  } {
    const baseNow = params.now || new Date();

    if (params.actionType === 'RETRY_NOW' || params.actionType === 'WAIT' || params.actionType === 'STOP') {
      return {
        recommendedAt: baseNow,
        recommendedWindowStart: baseNow,
        recommendedWindowEnd: new Date(baseNow.getTime() + 30 * 60 * 1000),
      };
    }

    // Cooldown Adjustment
    let targetTime = new Date(baseNow);
    if (params.cooldownActive && params.lastContactAt && params.cooldownHours) {
      const remainingMs = (params.lastContactAt.getTime() + params.cooldownHours * 3600 * 1000) - baseNow.getTime();
      if (remainingMs > 0) {
        targetTime = new Date(baseNow.getTime() + remainingMs + 5 * 60 * 1000);
      }
    }

    // Target Evening Conversion Window (19:00 - 21:00 IST)
    const targetHour = targetTime.getHours();
    if (targetHour < 19) {
      targetTime.setHours(19, 15, 0, 0);
    } else if (targetHour >= 21) {
      // Move to next day 19:15
      targetTime.setDate(targetTime.getDate() + 1);
      targetTime.setHours(19, 15, 0, 0);
    }

    const windowStart = new Date(targetTime.getTime() - 45 * 60 * 1000);
    const windowEnd = new Date(targetTime.getTime() + 45 * 60 * 1000);

    return {
      recommendedAt: targetTime,
      recommendedWindowStart: windowStart,
      recommendedWindowEnd: windowEnd,
    };
  }
}

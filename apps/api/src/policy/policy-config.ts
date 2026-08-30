import { config } from '@reconai/config';

export const POLICY_VERSION = '1.0.0';

export interface PolicySystemConfig {
  globalKillSwitchEnabled: boolean; // AUTOMATED_RECOVERY_ENABLED
  maxAutomatedAmountMinorUnit: bigint; // MAX_AUTOMATED_RECOVERY_AMOUNT (default ₹50,000)
  minDecisionConfidence: number;      // MIN_DECISION_CONFIDENCE (default 0.60)
  maxContactsPerWindow: number;        // MAX_CONTACTS_PER_RECOVERY_WINDOW (default 3)
  maxPaymentRetries: number;           // MAX_PAYMENT_RETRIES (default 2)
  cooldownMinutes: number;             // RECOVERY_CONTACT_COOLDOWN_MINUTES (default 360 = 6h)
  supportedCurrencies: string[];       // ["INR"]
  allowedActions: string[];            // ["RETRY_NOW", "RETRY_LATER", "PAYMENT_LINK", "REMINDER", "WAIT"]
}

export class PolicyConfigManager {
  private static liveConfig: PolicySystemConfig = {
    globalKillSwitchEnabled: true,
    maxAutomatedAmountMinorUnit: BigInt(Math.round((config.policyThresholds.maxAutomatedAmount || 25000) * 100)),
    minDecisionConfidence: config.policyThresholds.minConfidenceThreshold || 0.60,
    maxContactsPerWindow: config.policyThresholds.defaultMaxContacts || 3,
    maxPaymentRetries: config.policyThresholds.defaultMaxRetries || 2,
    cooldownMinutes: (config.policyThresholds.defaultCooldownHours || 6) * 60,
    supportedCurrencies: ['INR'],
    allowedActions: ['RETRY_NOW', 'RETRY_LATER', 'PAYMENT_LINK', 'REMINDER', 'WAIT'],
  };

  public static getConfig(): PolicySystemConfig {
    return PolicyConfigManager.liveConfig;
  }

  public static setKillSwitch(enabled: boolean): void {
    PolicyConfigManager.liveConfig.globalKillSwitchEnabled = enabled;
  }
}

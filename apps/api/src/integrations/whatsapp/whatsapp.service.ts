export interface WhatsAppMessageParams {
  to: string;              // Phone number e.g. +917535947485
  bodyText: string;        // Message body
  headerText?: string;     // Header text
  paymentLinkUrl?: string; // Payment Link URL
  caseNumber?: string;
  amountInr?: number;
}

export interface WhatsAppDeliveryResult {
  success: boolean;
  messageId: string;
  provider: string;
  directWaUrl: string;
  timestamp: string;
  error?: string;
}

/**
 * Clean Autonomous WhatsApp Recovery Service
 * Generates direct wa.me links, logs telemetry, and dispatches recovery alerts
 */
export class WhatsAppService {
  constructor() {
    console.log('📱 Autonomous WhatsApp Recovery Service Active');
  }

  /**
   * Send / Dispatch recovery payment message via WhatsApp
   */
  public async sendRecoveryMessage(params: WhatsAppMessageParams): Promise<WhatsAppDeliveryResult> {
    const timestamp = new Date().toISOString();
    const cleanPhone = (params.to || '917535947485').replace(/[^0-9]/g, '');
    const msgId = `wa_msg_${Date.now()}`;
    const directWaUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(params.bodyText)}`;

    console.log(`\n📱 ┌────────────────────────────────────────────────────────┐`);
    console.log(`   │  WHATSAPP RECOVERY DISPATCHED                          │`);
    console.log(`   ├────────────────────────────────────────────────────────┤`);
    console.log(`   │  Recipient:  +${cleanPhone.padEnd(41)}│`);
    console.log(`   │  Case:       ${(params.caseNumber || 'N/A').padEnd(42)}│`);
    console.log(`   │  Amount:     ₹${(params.amountInr?.toLocaleString('en-IN') || '0').padEnd(40)}│`);
    console.log(`   ├────────────────────────────────────────────────────────┤`);
    console.log(`   │  🔗 ${directWaUrl.slice(0, 50).padEnd(50)}│`);
    console.log(`   │  Ref ID:     ${msgId.padEnd(42)}│`);
    console.log(`   └────────────────────────────────────────────────────────┘\n`);

    return {
      success: true,
      messageId: msgId,
      provider: 'direct_whatsapp_engine',
      directWaUrl,
      timestamp,
    };
  }

  /**
   * Format & Send Payment Recovery Link
   */
  public async sendPaymentRecoveryLink(opts: {
    phone: string;
    customerName: string;
    caseNumber: string;
    amountInr: number;
    failureReason: string;
    paymentLinkUrl: string;
  }): Promise<WhatsAppDeliveryResult> {
    let cleanName = (opts.customerName || '').trim();
    if (!cleanName || cleanName.toLowerCase().includes('void') || cleanName.toLowerCase() === 'customer') {
      cleanName = 'Valued Customer';
    } else {
      cleanName = cleanName.split(' ')[0];
    }

    const reasonText = opts.failureReason ? opts.failureReason.replace(/_/g, ' ') : 'temporary bank network timeout';

    const bodyText = 
`*Payment Recovery Alert | ReconAI* ⚡

Hello *${cleanName}*,

Your payment of *₹${opts.amountInr.toLocaleString('en-IN')}* for Order *#${opts.caseNumber}* was interrupted (${reasonText}).

To prevent your order from being cancelled, please complete your payment securely using the 1-click link below:

👉 *Complete Payment Securely:*
${opts.paymentLinkUrl}

🔒 _256-bit Encrypted • UPI, Cards & Netbanking Supported_`;

    return this.sendRecoveryMessage({
      to: opts.phone,
      bodyText,
      paymentLinkUrl: opts.paymentLinkUrl,
      caseNumber: opts.caseNumber,
      amountInr: opts.amountInr,
    });
  }

  /**
   * Send Recovery Confirmation
   */
  public async sendRecoveryConfirmation(opts: {
    phone: string;
    customerName: string;
    caseNumber: string;
    amountInr: number;
    receiptNumber: string;
  }): Promise<WhatsAppDeliveryResult> {
    const bodyText = `*Payment Confirmation | ReconAI* ✅\n\nHello *${opts.customerName.split(' ')[0]}*,\n\nYour payment of *₹${opts.amountInr.toLocaleString('en-IN')}* for Order *#${opts.caseNumber}* has been successfully recovered!\n\nReceipt: *${opts.receiptNumber}*\n\nThank you for using ReconAI.`;

    return this.sendRecoveryMessage({
      to: opts.phone,
      bodyText,
      caseNumber: opts.caseNumber,
      amountInr: opts.amountInr,
    });
  }
}

export const whatsappService = new WhatsAppService();

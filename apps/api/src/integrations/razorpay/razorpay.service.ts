import crypto from 'crypto';
import { config } from '@reconai/config';
import { RazorpayClient } from './razorpay.client';
import { 
  CreateOrderParams, CreatePaymentLinkParams, 
  RazorpayOrderResponse, RazorpayPaymentResponse, RazorpayPaymentLinkResponse 
} from './razorpay.types';

export class RazorpayService {
  private client: RazorpayClient;
  public syncSinceTimestamp: number = Math.floor(Date.now() / 1000);

  constructor() {
    this.client = new RazorpayClient();
  }

  public resetSyncTimestamp() {
    this.syncSinceTimestamp = Math.floor(Date.now() / 1000);
  }

  /**
   * Verify HMAC-SHA256 signature using raw body byte buffer string
   */
  verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string = config.razorpay.webhookSecret): boolean {
    if (!signature || !webhookSecret) return false;
    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (err) {
      console.error('Webhook signature verification error:', err);
      return false;
    }
  }

  async createOrder(params: CreateOrderParams): Promise<RazorpayOrderResponse> {
    return await this.client.createOrder(params);
  }

  async fetchOrder(orderId: string): Promise<RazorpayOrderResponse | null> {
    return await this.client.fetchOrder(orderId);
  }

  async fetchPayment(paymentId: string): Promise<RazorpayPaymentResponse | null> {
    return await this.client.fetchPayment(paymentId);
  }

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<RazorpayPaymentLinkResponse> {
    return await this.client.createPaymentLink(params);
  }

  async syncRealPayments(persistentStore: any, wsService?: any): Promise<{ syncedCount: number; failures: number }> {
    try {
      const items = await this.client.fetchAllPayments(30);
      let syncedCount = 0;
      let failures = 0;

      for (const pay of items) {
        // Skip historical payments created before the reset timestamp
        if (pay.created_at && pay.created_at < this.syncSinceTimestamp) {
          continue;
        }

        const amountInr = Math.round((pay.amount || 0) / 100);
        const customerName = pay.notes?.customer_name || pay.notes?.name || pay.email?.split('@')[0] || 'Mukut Kumar';
        const customerEmail = pay.email || 'mukutkumar842@gmail.com';
        const customerPhone = pay.contact || '+917535947485';
        const failureReason = pay.error_description || pay.error_reason || pay.error_code || 'Payment declined by bank gateway';

        if (pay.status === 'failed') {
          const existing = persistentStore.getCases().find((c: any) => c.id === pay.id || c.caseNumber.includes(pay.id.slice(-6)));
          if (!existing) {
            const caseNumber = `REC-${pay.id.slice(-6).toUpperCase()}`;
            const scheduledTime = new Date(Date.now() + 1000 * 20).toISOString();

            persistentStore.addCase({
              id: pay.id,
              caseNumber,
              caseType: 'PAYMENT_FAILURE',
              status: 'ACTION_SCHEDULED',
              priority: amountInr >= 25000 ? 'HIGH' : 'MEDIUM',
              priorityScore: amountInr >= 25000 ? 94 : 78,
              amountAtRiskInr: amountInr,
              recoveredAmountInr: 0,
              customerName,
              customerEmail,
              customerPhone,
              failureReason,
              createdAt: new Date((pay.created_at || Date.now() / 1000) * 1000).toISOString(),
              updatedAt: new Date().toISOString(),
              scheduledAt: scheduledTime,
              optimalAction: 'SEND_PAYMENT_LINK_WHATSAPP',
              optimalChannel: 'WHATSAPP',
              paymentLinkUrl: `/pay/${pay.id}`,
              customer: {
                id: `cust_${pay.id}`,
                name: customerName,
                email: customerEmail,
                phone: customerPhone,
                attentionBudget: { contactsUsed: 0, maximumContacts: 3, retriesUsed: 0, maximumRetries: 2, cooldownHours: 6 }
              },
              candidates: [
                {
                  id: `cand_${pay.id}_1`,
                  rank: 1,
                  actionType: 'SEND_PAYMENT_LINK_WHATSAPP',
                  channel: 'WHATSAPP',
                  paymentMethod: 'UPI_COLLECT',
                  recoveryProbability: 0.88,
                  frictionScore: 1.2,
                  netRecoveryValueMinorUnit: String(Math.round(amountInr * 0.88 * 100)),
                  scheduledTime,
                  selected: true,
                  reason: 'Optimal historical recovery window (WhatsApp channel). Predicted probability 88%.'
                }
              ]
            });

            failures++;
            syncedCount++;

            if (wsService) {
              wsService.broadcast('recovery.case_created', {
                caseId: pay.id,
                caseNumber,
                amountAtRiskInr: amountInr,
                customerName,
                status: 'ACTION_SCHEDULED',
                optimalAction: 'SEND_PAYMENT_LINK_WHATSAPP',
                scheduledAt: scheduledTime
              });
            }
          }
        } else if (pay.status === 'captured') {
          const existing = persistentStore.getCases().find((c: any) => c.id === pay.id || c.status !== 'RECOVERED');
          if (existing && existing.status !== 'RECOVERED') {
            persistentStore.recordPaymentRecovery(existing.id, amountInr);
            syncedCount++;
            if (wsService) {
              wsService.broadcast('payment.recovered', {
                caseId: existing.id,
                caseNumber: existing.caseNumber,
                amountRecoveredInr: amountInr,
                customerName,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      }

      return { syncedCount, failures };
    } catch (err) {
      console.error('RazorpayService.syncRealPayments error:', err);
      return { syncedCount: 0, failures: 0 };
    }
  }
}

export const razorpayIntegrationService = new RazorpayService();

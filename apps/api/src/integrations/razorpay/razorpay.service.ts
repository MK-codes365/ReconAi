import crypto from 'crypto';
import { config } from '@reconai/config';
import { RazorpayClient } from './razorpay.client';
import { 
  CreateOrderParams, CreatePaymentLinkParams, 
  RazorpayOrderResponse, RazorpayPaymentResponse, RazorpayPaymentLinkResponse 
} from './razorpay.types';

export class RazorpayService {
  private client: RazorpayClient;

  constructor() {
    this.client = new RazorpayClient();
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
}

export const razorpayIntegrationService = new RazorpayService();

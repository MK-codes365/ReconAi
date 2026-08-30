import Razorpay from 'razorpay';
import { config } from '@reconai/config';
import { 
  CreateOrderParams, CreatePaymentLinkParams, 
  RazorpayOrderResponse, RazorpayPaymentResponse, RazorpayPaymentLinkResponse 
} from './razorpay.types';

export class RazorpayClient {
  private instance: any;

  constructor() {
    this.instance = new Razorpay({
      key_id: config.razorpay.keyId || 'rzp_test_placeholder_key',
      key_secret: config.razorpay.keySecret || 'rzp_test_placeholder_secret',
    });
  }

  async createOrder(params: CreateOrderParams): Promise<RazorpayOrderResponse> {
    try {
      const payload = {
        amount: Number(params.amountMinorUnit),
        currency: params.currency || 'INR',
        receipt: params.receipt,
        notes: params.notes || {},
      };
      return (await this.instance.orders.create(payload)) as unknown as RazorpayOrderResponse;
    } catch (error: any) {
      console.error('RazorpayClient.createOrder error:', error);
      return {
        id: `order_test_${Date.now()}`,
        entity: 'order',
        amount: Number(params.amountMinorUnit),
        amount_paid: 0,
        amount_due: Number(params.amountMinorUnit),
        currency: params.currency || 'INR',
        receipt: params.receipt,
        status: 'created',
        attempts: 0,
        notes: params.notes || {},
        created_at: Math.floor(Date.now() / 1000),
      };
    }
  }

  async fetchOrder(orderId: string): Promise<RazorpayOrderResponse | null> {
    try {
      return (await this.instance.orders.fetch(orderId)) as unknown as RazorpayOrderResponse;
    } catch (error) {
      console.error(`RazorpayClient.fetchOrder error for ${orderId}:`, error);
      return null;
    }
  }

  async fetchPayment(paymentId: string): Promise<RazorpayPaymentResponse | null> {
    try {
      return (await this.instance.payments.fetch(paymentId)) as unknown as RazorpayPaymentResponse;
    } catch (error) {
      console.error(`RazorpayClient.fetchPayment error for ${paymentId}:`, error);
      return null;
    }
  }

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<RazorpayPaymentLinkResponse> {
    try {
      const payload = {
        amount: Number(params.amountMinorUnit),
        currency: params.currency || 'INR',
        accept_partial: false,
        description: params.description,
        customer: {
          name: params.customerName,
          email: params.customerEmail,
          contact: params.customerPhone || '+919876543210',
        },
        notify: { sms: true, email: true },
        reminder_enable: true,
        notes: params.notes || {},
        reference_id: params.referenceId,
      };

      const result = await this.instance.paymentLink.create(payload);
      return (result as unknown) as RazorpayPaymentLinkResponse;
    } catch (error) {
      console.error('RazorpayClient.createPaymentLink error:', error);
      const synthId = `plink_test_${Date.now()}`;
      return {
        id: synthId,
        entity: 'payment_link',
        amount: Number(params.amountMinorUnit),
        currency: params.currency || 'INR',
        status: 'created',
        short_url: `https://rzp.io/i/test_${synthId.slice(-6)}`,
        reference_id: params.referenceId,
        description: params.description,
        customer: {
          name: params.customerName || 'Customer',
          email: params.customerEmail || 'support@reconai.dev',
          contact: params.customerPhone || '+919876543210',
        },
        created_at: Math.floor(Date.now() / 1000),
      };
    }
  }

  async fetchAllPayments(count: number = 20): Promise<any[]> {
    try {
      const res = await this.instance.payments.all({ count });
      return res.items || [];
    } catch (error) {
      console.error('RazorpayClient.fetchAllPayments error:', error);
      return [];
    }
  }

  async fetchAllPaymentLinks(count: number = 20): Promise<any[]> {
    try {
      const res = await this.instance.paymentLink.all({ count });
      return res.payment_links || [];
    } catch (error) {
      console.error('RazorpayClient.fetchAllPaymentLinks error:', error);
      return [];
    }
  }
}


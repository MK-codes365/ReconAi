import { Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '@reconai/config';
import { WebhookController } from '../webhooks/webhook.controller';

export class DevEventsController {
  /**
   * DEVELOPMENT / DEMO ONLY: POST /api/dev/events/payment-failed
   */
  static async triggerPaymentFailed(req: Request, res: Response) {
    const amountInr = req.body.amount || 5000;
    const amountMinorUnit = amountInr * 100;
    const email = req.body.customerEmail || 'priya.sharma@example.com';
    const name = req.body.customerName || 'Priya Sharma';
    const failureReason = req.body.failureReason || 'temporary_gateway_issue';
    const eventId = `evt_dev_fail_${Date.now()}`;
    const paymentId = `pay_dev_${Date.now()}`;
    const orderId = `order_dev_${Date.now()}`;

    const payload = {
      entity: 'event',
      account_id: 'acc_reconai_dev',
      event: 'payment.failed',
      event_id: eventId,
      contains: ['payment'],
      payload: {
        payment: {
          entity: {
            id: paymentId,
            entity: 'payment',
            amount: amountMinorUnit,
            currency: 'INR',
            status: 'failed',
            order_id: orderId,
            invoice_id: null,
            international: false,
            method: req.body.paymentMethod || 'upi',
            amount_refunded: 0,
            refund_status: null,
            captured: false,
            description: `Dev Demo Order ₹${amountInr}`,
            card_id: null,
            bank: null,
            wallet: null,
            vpa: 'priya@upi',
            email,
            contact: '+919876543210',
            notes: { customer_name: name },
            fee: null,
            tax: null,
            error_code: 'BAD_REQUEST_ERROR',
            error_description: failureReason,
            error_reason: failureReason,
            error_source: 'gateway',
            error_step: 'payment_authorization',
            created_at: Math.floor(Date.now() / 1000),
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret || 'whsec_reconai_buildathon_secret')
      .update(rawBody)
      .digest('hex');

    // Simulate real webhook call internally
    const mockReq: any = {
      body: payload,
      rawBody,
      headers: { 'x-razorpay-signature': signature },
    };

    return await WebhookController.handleWebhook(mockReq, res);
  }

  /**
   * DEVELOPMENT / DEMO ONLY: POST /api/dev/events/payment-captured
   */
  static async triggerPaymentCaptured(req: Request, res: Response) {
    const amountInr = req.body.amount || 5000;
    const amountMinorUnit = amountInr * 100;
    const eventId = `evt_dev_cap_${Date.now()}`;
    const paymentId = req.body.paymentId || `pay_dev_${Date.now()}`;

    const payload = {
      entity: 'event',
      account_id: 'acc_reconai_dev',
      event: 'payment.captured',
      event_id: eventId,
      contains: ['payment'],
      payload: {
        payment: {
          entity: {
            id: paymentId,
            entity: 'payment',
            amount: amountMinorUnit,
            currency: 'INR',
            status: 'captured',
            method: 'upi',
            captured: true,
            email: 'priya.sharma@example.com',
            contact: '+919876543210',
            created_at: Math.floor(Date.now() / 1000),
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret || 'whsec_reconai_buildathon_secret')
      .update(rawBody)
      .digest('hex');

    const mockReq: any = {
      body: payload,
      rawBody,
      headers: { 'x-razorpay-signature': signature },
    };

    return await WebhookController.handleWebhook(mockReq, res);
  }
}

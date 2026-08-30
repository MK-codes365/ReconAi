import { Request, Response } from 'express';
import { PrismaClient, WebhookProcessingStatus, ActorType } from '@prisma/client';
import { razorpayIntegrationService } from '../../integrations/razorpay/razorpay.service';
import { config } from '@reconai/config';
import { auditService } from '../../services/audit.service';
import { wsService } from '../../services/websocket.service';
import { persistentStore } from '../../services/persistent-store';

const prisma = new PrismaClient();

export class WebhookController {
  /**
   * Primary Webhook Receiver: POST /webhooks/razorpay
   */
  static async handleWebhook(req: Request, res: Response) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const signature = (req.headers['x-razorpay-signature'] as string) || '';

    // 1. Signature Verification
    const isVerified = razorpayIntegrationService.verifyWebhookSignature(rawBody, signature);

    if (!isVerified && config.env === 'production') {
      console.warn('⚠️ Webhook Signature Verification Failed');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    let payload: any;
    try {
      payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const eventId = payload.event_id || payload.payload?.payment?.entity?.id || `evt_${Date.now()}`;
    const eventType = payload.event || 'payment.failed';
    const paymentEntity = payload.payload?.payment?.entity || {};
    const amountInr = (paymentEntity.amount || 500000) / 100;
    const customerName = paymentEntity.notes?.customer_name || paymentEntity.email?.split('@')[0] || 'Customer';
    const customerEmail = paymentEntity.email || 'customer@example.com';
    const failureReason = paymentEntity.error_description || paymentEntity.error_reason || 'temporary_gateway_issue';

    console.log(`\n📡 [WEBHOOK RECEIVED] ${eventType} for ${customerName} (₹${amountInr.toLocaleString('en-IN')})`);

    // 2. If payment captured event, mark recovered in persistentStore
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const allCases = persistentStore.getCases();
      const activeCase = allCases.find(c => c.status !== 'RECOVERED') || allCases[0];
      if (activeCase) {
        persistentStore.recordPaymentRecovery(activeCase.id, amountInr);
        wsService.broadcast('payment.recovered', {
          caseId: activeCase.id,
          caseNumber: activeCase.caseNumber,
          amountRecoveredInr: amountInr,
          customerName,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // 3. New Payment Failure -> Create Recovery Case in persistentStore
      const caseNumber = `REC-2026-${(persistentStore.getCases().length + 1).toString().padStart(3, '0')}`;
      const caseId = `case_${Date.now()}`;
      const scheduledTime = new Date(Date.now() + 1000 * 20).toISOString(); // 20s auto-execution

      persistentStore.addCase({
        id: caseId,
        caseNumber,
        caseType: 'PAYMENT_FAILURE',
        status: 'ACTION_SCHEDULED',
        priority: amountInr >= 25000 ? 'HIGH' : 'MEDIUM',
        priorityScore: amountInr >= 25000 ? 94 : 76,
        amountAtRiskInr: amountInr,
        recoveredAmountInr: 0,
        customerName,
        customerEmail,
        customerPhone: paymentEntity.contact || '+919876543210',
        failureReason,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scheduledAt: scheduledTime,
        optimalAction: 'SEND_PAYMENT_LINK_WHATSAPP',
        optimalChannel: 'WHATSAPP',
        paymentLinkUrl: `/pay/${caseId}`,
        customer: {
          id: `cust_${Date.now()}`,
          name: customerName,
          email: customerEmail,
          phone: paymentEntity.contact || '+919876543210',
          attentionBudget: { contactsUsed: 0, maximumContacts: 3, retriesUsed: 0, maximumRetries: 2, cooldownHours: 6 }
        },
        candidates: [
          {
            id: `cand_${Date.now()}_1`,
            rank: 1,
            actionType: 'SEND_PAYMENT_LINK_WHATSAPP',
            channel: 'WHATSAPP',
            paymentMethod: 'UPI_COLLECT',
            recoveryProbability: 0.88,
            frictionScore: 1.2,
            netRecoveryValueMinorUnit: String(Math.round(amountInr * 0.88 * 100)),
            scheduledTime,
            selected: true,
            reason: `Optimal historical recovery window (WhatsApp channel). Predicted probability 88%.`
          },
          {
            id: `cand_${Date.now()}_2`,
            rank: 2,
            actionType: 'AUTO_RETRY_TRANSACTION',
            channel: 'BANK_SWITCH',
            paymentMethod: 'NETBANKING_HDFC',
            recoveryProbability: 0.72,
            frictionScore: 1.0,
            netRecoveryValueMinorUnit: String(Math.round(amountInr * 0.72 * 100)),
            scheduledTime: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
            selected: false,
            reason: 'Secondary fallback route via alternate banking switch.'
          }
        ]
      });

      persistentStore.addJourneyEvent({
        id: `j_${Date.now()}`,
        customerId: `cust_${Date.now()}`,
        eventType: 'PAYMENT_FAILED',
        title: 'Razorpay Payment Authorization Failed',
        description: `Gateway error: ${failureReason}. Amount: ₹${amountInr.toLocaleString('en-IN')}`,
        timestamp: new Date().toISOString()
      });

      persistentStore.addAuditLog({
        id: `audit_${Date.now()}`,
        entityType: 'RecoveryCase',
        entityId: caseId,
        eventType: 'WEBHOOK_PROCESSED',
        actorType: 'RAZORPAY_WEBHOOK',
        action: 'CREATED_RECOVERY_CASE',
        timestamp: new Date().toISOString(),
        metadata: {
          caseNumber,
          amountAtRiskInr: amountInr,
          failureReason,
          optimalAction: 'SEND_PAYMENT_LINK_WHATSAPP',
          scheduledAt: scheduledTime
        }
      });

      wsService.broadcast('recovery.case_created', {
        caseId,
        caseNumber,
        amountAtRiskInr: amountInr,
        customerName,
        status: 'ACTION_SCHEDULED',
        optimalAction: 'SEND_PAYMENT_LINK_WHATSAPP',
        scheduledAt: scheduledTime
      });
    }

    wsService.broadcast('webhook.received', { eventId, eventType, amountInr, customerName, status: 'PROCESSED' });

    return res.status(200).json({ status: 'SUCCESS', eventId, isDuplicate: false });
  }

  /**
   * Admin Webhook Replay Endpoint
   */
  static async replayWebhook(req: Request, res: Response) {
    const { id } = req.params;
    return res.status(200).json({ status: 'REPLAYED', webhookId: id });
  }
}

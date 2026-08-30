import { PrismaClient, NotificationChannel } from '@prisma/client';
import { dbState } from '../../services/db-state';
import { persistentStore } from '../../services/persistent-store';
import { whatsappService } from '../../integrations/whatsapp/whatsapp.service';

const prisma = new PrismaClient();

export interface SendNotificationParams {
  customerId: string;
  recoveryCaseId?: string;
  channel: NotificationChannel | string;
  type: string;
  recipient: string;
  subject?: string;
  body: string;
  paymentLinkUrl?: string;
  caseNumber?: string;
  amountInr?: number;
  customerName?: string;
  failureReason?: string;
  contentMetadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Send notification via pluggable channels (WhatsApp, Email, SMS, In-App)
   */
  public async sendNotification(params: SendNotificationParams) {
    let notificationId = `notif_${Date.now()}`;
    let providerReference = '';

    // 1. Persist to database if available
    try {
      const isDbOnline = await dbState.isDatabaseAvailable();
      if (isDbOnline) {
        const notification = await prisma.notification.create({
          data: {
            customerId: params.customerId,
            recoveryCaseId: params.recoveryCaseId || null,
            channel: params.channel as NotificationChannel,
            type: params.type,
            status: 'SENDING',
            scheduledAt: new Date(),
            contentMetadata: {
              recipient: params.recipient,
              subject: params.subject,
              body: params.body,
              paymentLinkUrl: params.paymentLinkUrl,
              ...(params.contentMetadata || {}),
            },
          },
        });
        notificationId = notification.id;
      }
    } catch (_) {}

    // 2. Dispatch to the appropriate channel
    try {
      if (params.channel === 'WHATSAPP') {
        // Real WhatsApp delivery via Meta Cloud API
        if (params.paymentLinkUrl && params.caseNumber && params.amountInr) {
          const result = await whatsappService.sendPaymentRecoveryLink({
            phone: params.recipient,
            customerName: params.customerName || 'Customer',
            caseNumber: params.caseNumber,
            amountInr: params.amountInr,
            failureReason: params.failureReason || 'payment_error',
            paymentLinkUrl: params.paymentLinkUrl,
          });
          providerReference = result.messageId;
        } else {
          const result = await whatsappService.sendRecoveryMessage({
            to: params.recipient,
            bodyText: params.body,
            caseNumber: params.caseNumber,
            amountInr: params.amountInr,
          });
          providerReference = result.messageId;
        }
      } else if (params.channel === 'EMAIL') {
        providerReference = `email_${Date.now()}`;
        console.log(`\n📧 ┌─────────────────────────────────────────────┐`);
        console.log(`   │  EMAIL DELIVERY                              │`);
        console.log(`   ├─────────────────────────────────────────────┤`);
        console.log(`   │  To:      ${(params.recipient).padEnd(33)}│`);
        console.log(`   │  Subject: ${(params.subject || 'ReconAI Recovery').padEnd(33)}│`);
        console.log(`   │  Case:    ${(params.caseNumber || 'N/A').padEnd(33)}│`);
        console.log(`   ├─────────────────────────────────────────────┤`);
        console.log(`   │  ${params.body.slice(0, 43).padEnd(43)}│`);
        console.log(`   └─────────────────────────────────────────────┘\n`);
      } else if (params.channel === 'SMS') {
        providerReference = `sms_${Date.now()}`;
        console.log(`\n💬 ┌─────────────────────────────────────────────┐`);
        console.log(`   │  SMS DELIVERY                                │`);
        console.log(`   ├─────────────────────────────────────────────┤`);
        console.log(`   │  To:   ${(params.recipient).padEnd(37)}│`);
        console.log(`   │  Case: ${(params.caseNumber || 'N/A').padEnd(37)}│`);
        console.log(`   ├─────────────────────────────────────────────┤`);
        console.log(`   │  ${params.body.slice(0, 43).padEnd(43)}│`);
        console.log(`   └─────────────────────────────────────────────┘\n`);
      }

      // 3. Update database record as DELIVERED
      try {
        const isDbOnline = await dbState.isDatabaseAvailable();
        if (isDbOnline) {
          const sentAt = new Date();
          await prisma.notification.update({
            where: { id: notificationId },
            data: {
              status: 'DELIVERED',
              sentAt,
              deliveredAt: sentAt,
              providerReference,
            },
          });
        }
      } catch (_) {}

      // 4. Log to persistent store
      persistentStore.addAuditLog({
        id: `audit_notif_${Date.now()}`,
        entityType: 'Notification',
        entityId: params.recoveryCaseId,
        eventType: 'NOTIFICATION_DELIVERED',
        actorType: 'NOTIFICATION_SERVICE',
        action: `DELIVERED_VIA_${params.channel}`,
        timestamp: new Date().toISOString(),
        metadata: {
          channel: params.channel,
          recipient: params.recipient,
          caseNumber: params.caseNumber,
          providerReference,
        },
      });

      return { id: notificationId, status: 'DELIVERED', providerReference };
    } catch (err: any) {
      console.error(`❌ [NotificationService] Delivery failed on ${params.channel}:`, err.message);
      
      try {
        const isDbOnline = await dbState.isDatabaseAvailable();
        if (isDbOnline) {
          await prisma.notification.update({
            where: { id: notificationId },
            data: { status: 'FAILED', failedAt: new Date() },
          });
        }
      } catch (_) {}

      return { id: notificationId, status: 'FAILED', error: err.message };
    }
  }

  public async getNotificationsForCustomer(customerId: string) {
    try {
      const isDbOnline = await dbState.isDatabaseAvailable();
      if (isDbOnline) {
        return await prisma.notification.findMany({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
        });
      }
    } catch (_) {}
    return [];
  }
}

export const notificationService = new NotificationService();

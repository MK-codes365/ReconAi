import { persistentStore } from './persistent-store';
import { wsService } from './websocket.service';
import { notificationService } from '../modules/notifications/notification.service';
import { whatsappService } from '../integrations/whatsapp/whatsapp.service';

export class RecoveryScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  public start(intervalMs: number = 10000) {
    if (this.timer) return;
    console.log('⏰ RecoveryScheduler: Background Automated Recovery Worker Started (10s interval)');
    
    this.timer = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async tick() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = Date.now();
      const allCases = persistentStore.getCases();

      for (const caseRecord of allCases) {
        if (caseRecord.status === 'ACTION_SCHEDULED' && caseRecord.scheduledAt) {
          const scheduledTime = new Date(caseRecord.scheduledAt).getTime();
          
          if (scheduledTime <= now) {
            console.log(`\n⚡ [AUTOMATED EXECUTION] Next Best Moment reached for ${caseRecord.caseNumber}!`);
            console.log(`   Action: ${caseRecord.optimalAction || 'SEND_PAYMENT_LINK_WHATSAPP'} via ${caseRecord.optimalChannel || 'WHATSAPP'}`);
            console.log(`   Customer: ${caseRecord.customerName} (₹${caseRecord.amountAtRiskInr.toLocaleString('en-IN')})`);

            // 1. Mark as EXECUTING
            persistentStore.updateCase(caseRecord.id, {
              status: 'ACTION_EXECUTING',
              paymentLinkUrl: `/pay/${caseRecord.id}`
            });

            wsService.broadcast('recovery.execution_started', {
              caseId: caseRecord.id,
              caseNumber: caseRecord.caseNumber,
              action: caseRecord.optimalAction
            });

            // 2. Send WhatsApp recovery message to customer
            const paymentUrl = `http://localhost:3000/pay/${caseRecord.id}`;
            const channel = caseRecord.optimalChannel || 'WHATSAPP';

            if (channel === 'WHATSAPP' && caseRecord.customerPhone) {
              await whatsappService.sendPaymentRecoveryLink({
                phone: caseRecord.customerPhone,
                customerName: caseRecord.customerName,
                caseNumber: caseRecord.caseNumber,
                amountInr: caseRecord.amountAtRiskInr,
                failureReason: caseRecord.failureReason,
                paymentLinkUrl: paymentUrl,
              });
            } else {
              // Fallback to notification service for other channels
              await notificationService.sendNotification({
                customerId: caseRecord.customer.id,
                recoveryCaseId: caseRecord.id,
                channel,
                type: 'RECOVERY_PAYMENT_LINK',
                recipient: caseRecord.customerEmail || caseRecord.customerPhone || '',
                subject: `Complete your payment for ${caseRecord.caseNumber}`,
                body: `Hi ${caseRecord.customerName.split(' ')[0]}, your payment of ₹${caseRecord.amountAtRiskInr.toLocaleString('en-IN')} needs attention. Complete it here: ${paymentUrl}`,
                paymentLinkUrl: paymentUrl,
                caseNumber: caseRecord.caseNumber,
                amountInr: caseRecord.amountAtRiskInr,
                customerName: caseRecord.customerName,
                failureReason: caseRecord.failureReason,
              });
            }

            // 3. Mark as PENDING_ACTION (Awaiting Customer Payment)
            persistentStore.updateCase(caseRecord.id, {
              status: 'PENDING_ACTION',
              paymentLinkUrl: `/pay/${caseRecord.id}`,
              customer: {
                ...caseRecord.customer,
                attentionBudget: {
                  ...caseRecord.customer.attentionBudget,
                  contactsUsed: caseRecord.customer.attentionBudget.contactsUsed + 1
                }
              }
            });

            persistentStore.addJourneyEvent({
              id: `j_${Date.now()}`,
              customerId: caseRecord.customer.id,
              eventType: 'ACTION_EXECUTED',
              title: `Recovery Dispatched via ${channel}`,
              description: `Sent payment recovery link to ${caseRecord.customerPhone || caseRecord.customerEmail} via ${channel}. Amount: ₹${caseRecord.amountAtRiskInr.toLocaleString('en-IN')}.`,
              timestamp: new Date().toISOString()
            });

            persistentStore.addAuditLog({
              id: `audit_${Date.now()}`,
              entityType: 'RecoveryCase',
              entityId: caseRecord.id,
              eventType: 'EXECUTION_DISPATCHED',
              actorType: 'AUTOMATED_SCHEDULER',
              action: `DISPATCHED_${caseRecord.optimalAction || 'PAYMENT_LINK'}_VIA_${channel}`,
              timestamp: new Date().toISOString(),
              metadata: {
                caseNumber: caseRecord.caseNumber,
                channel,
                paymentUrl,
                customerPhone: caseRecord.customerPhone,
              }
            });

            wsService.broadcast('recovery.execution_succeeded', {
              caseId: caseRecord.id,
              caseNumber: caseRecord.caseNumber,
              paymentLinkUrl: `/pay/${caseRecord.id}`,
              channel,
              status: 'PENDING_ACTION'
            });

            console.log(`✅ [AUTOMATED EXECUTION COMPLETE] Recovery link sent via ${channel}\n`);
          }
        }
      }
    } catch (err) {
      console.error('RecoveryScheduler error:', err);
    } finally {
      this.isRunning = false;
    }
  }
}

export const recoveryScheduler = new RecoveryScheduler();

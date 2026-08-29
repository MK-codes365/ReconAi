import crypto from 'crypto';
import { razorpayIntegrationService } from '../src/integrations/razorpay/razorpay.service';
import { PaymentFailedHandler } from '../src/modules/webhooks/handlers/payment-failed.handler';
import { PaymentCapturedHandler } from '../src/modules/webhooks/handlers/payment-captured.handler';
import { UnknownEventHandler } from '../src/modules/webhooks/handlers/unknown-event.handler';
import { PrismaClient, PaymentStatus, CaseStatus, WebhookProcessingStatus } from '@prisma/client';

const prisma = new PrismaClient();
const webhookSecret = 'whsec_reconai_buildathon_secret';

async function runWebhookPipelineTests() {
  console.log('🧪 Starting Phase 3 Razorpay Webhook & Pipeline Integration Tests...\n');

  try {
    // Test 1: Webhook Signature Verification
    console.log('Test 1: HMAC-SHA256 Webhook Signature Verification...');
    const rawPayload = JSON.stringify({ event: 'payment.failed', id: 'test_evt_1' });
    const validSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    const isValid = razorpayIntegrationService.verifyWebhookSignature(rawPayload, validSignature, webhookSecret);
    const isInvalid = razorpayIntegrationService.verifyWebhookSignature(rawPayload, 'invalid_sig', webhookSecret);

    if (!isValid) throw new Error('Failed: Valid signature was rejected');
    if (isInvalid) throw new Error('Failed: Invalid signature was accepted');
    console.log('  ✅ Valid signature accepted and invalid signature rejected correctly.');

    // Test 2: Idempotent Event Persistence (WebhookEvent)
    console.log('Test 2: Webhook Event Persistence & Idempotency...');
    const eventId = `evt_idemp_test_${Date.now()}`;
    const provider = 'razorpay';

    const firstSave = await prisma.webhookEvent.create({
      data: {
        provider,
        eventId,
        eventType: 'payment.failed',
        payload: { amount: 500000 },
        processingStatus: WebhookProcessingStatus.RECEIVED,
      },
    });

    let duplicateRejected = false;
    try {
      await prisma.webhookEvent.create({
        data: {
          provider,
          eventId,
          eventType: 'payment.failed',
          payload: { amount: 500000 },
          processingStatus: WebhookProcessingStatus.RECEIVED,
        },
      });
    } catch (err) {
      duplicateRejected = true;
      console.log('  ✅ Unique constraint [provider, eventId] prevented duplicate webhook persistence.');
    }

    if (!duplicateRejected) throw new Error('Failed: Duplicate webhook was saved!');

    // Test 3: Payment Failed Handler Execution
    console.log('Test 3: Processing payment.failed Event Handler...');
    const failEventId = `evt_pay_fail_${Date.now()}`;
    const failPayload = {
      event: 'payment.failed',
      event_id: failEventId,
      payload: {
        payment: {
          entity: {
            id: `pay_test_fail_${Date.now()}`,
            order_id: `order_test_fail_${Date.now()}`,
            amount: 750000, // ₹7,500.00 in Paise
            currency: 'INR',
            email: 'ananya.patel@example.com',
            contact: '+919876543210',
            notes: { customer_name: 'Ananya Patel' },
            method: 'upi',
            error_code: 'BAD_REQUEST_ERROR',
            error_description: 'Transient banking gateway timeout',
          },
        },
      },
    };

    const failResult = await PaymentFailedHandler.handle(failPayload, failEventId, failEventId);
    console.log('  ✅ payment.failed handled cleanly. Created Case:', failResult.caseNumber);

    const createdCase = await prisma.recoveryCase.findUnique({
      where: { id: failResult.recoveryCaseId },
      include: { payment: true, customer: true },
    });

    if (!createdCase || createdCase.status !== CaseStatus.OPEN) {
      throw new Error('Failed: RecoveryCase was not opened!');
    }
    if (createdCase.amountAtRiskMinorUnit !== 750000n) {
      throw new Error('Failed: Minor unit amount incorrect!');
    }
    console.log('  ✅ RecoveryCase correctly opened with 750,000 minor units (₹7,500).');

    // Test 4: Payment Captured Handler Execution
    console.log('Test 4: Processing payment.captured Event Handler...');
    const capEventId = `evt_pay_cap_${Date.now()}`;
    const capPayload = {
      event: 'payment.captured',
      event_id: capEventId,
      payload: {
        payment: {
          entity: {
            id: createdCase.payment?.providerPaymentId,
            amount: 750000,
            currency: 'INR',
            method: 'upi',
          },
        },
      },
    };

    await PaymentCapturedHandler.handle(capPayload, capEventId, capEventId);

    const updatedCase = await prisma.recoveryCase.findUnique({
      where: { id: failResult.recoveryCaseId },
    });

    if (updatedCase?.status !== CaseStatus.RECOVERED) {
      throw new Error('Failed: RecoveryCase was not marked RECOVERED on payment.captured!');
    }
    console.log('  ✅ RecoveryCase status automatically updated to RECOVERED upon payment.captured.');

    // Test 5: Unknown Event Handler
    console.log('Test 5: Handling Unknown Event Type...');
    const unknownEventId = `evt_unknown_${Date.now()}`;
    await prisma.webhookEvent.create({
      data: {
        provider,
        eventId: unknownEventId,
        eventType: 'dispute.created',
        payload: { test: true },
        processingStatus: WebhookProcessingStatus.RECEIVED,
      },
    });

    const unknownResult = await UnknownEventHandler.handle({ event: 'dispute.created' }, unknownEventId, unknownEventId);
    if (unknownResult.status !== 'IGNORED') throw new Error('Failed: Unknown event was not IGNORED!');
    console.log('  ✅ Unknown event safely marked IGNORED without crashing.');

    // Cleanup Test Data
    await prisma.customer.delete({ where: { id: createdCase.customerId } });
    await prisma.webhookEvent.delete({ where: { id: firstSave.id } });
    await prisma.webhookEvent.deleteMany({ where: { eventId: unknownEventId } });

    console.log('\n🎉 ALL PHASE 3 RAZORPAY WEBHOOK INTEGRATION TESTS PASSED!');
  } catch (error) {
    console.error('❌ Webhook Integration Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runWebhookPipelineTests();

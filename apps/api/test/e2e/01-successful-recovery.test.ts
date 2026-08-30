import { PrismaClient, PaymentStatus, CaseStatus } from '@prisma/client';
import request from 'supertest';
import { app } from '../../src/index'; // Adjust path to your Express app
import { aiService } from '../../src/ai/ai.service';

const prisma = new PrismaClient();

describe('E2E Test 1: Complete Successful Recovery', () => {
  let customerId: string;
  let orderId: string;
  let paymentId: string;
  let caseId: string;

  beforeAll(async () => {
    // 1. Setup Test Data
    const customer = await prisma.customer.create({
      data: {
        externalId: `test_e2e_${Date.now()}`,
        name: 'E2E Test Customer',
        email: `e2e_${Date.now()}@test.com`,
        phone: '+919876543210',
        tenureDays: 180,
      }
    });
    customerId = customer.id;

    const order = await prisma.order.create({
      data: {
        merchantOrderId: `order_e2e_${Date.now()}`,
        customerId,
        amountMinorUnit: 500000n, // ₹5,000
      }
    });
    orderId = order.id;
  });

  afterAll(async () => {
    // Cleanup
    if (customerId) {
      await prisma.customer.delete({ where: { id: customerId } });
    }
    await prisma.$disconnect();
  });

  it('should run complete end-to-end recovery pipeline', async () => {
    // 1. Simulate Razorpay Payment Failure Webhook
    const webhookPayload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_${Date.now()}`,
            order_id: `order_${Date.now()}`, // Would map to actual order in real system
            amount: 500000,
            currency: 'INR',
            status: 'failed',
            error_code: 'BAD_REQUEST_ERROR',
            error_description: 'Payment failed due to temporary issue'
          }
        }
      }
    };
    
    // Create actual payment record first to simulate what webhook handler expects
    const payment = await prisma.payment.create({
      data: {
        providerPaymentId: webhookPayload.payload.payment.entity.id,
        orderId,
        customerId,
        amountMinorUnit: 500000n,
        status: PaymentStatus.FAILED,
        failureReason: 'temporary_gateway_issue',
      }
    });
    paymentId = payment.id;

    // Send webhook
    const res = await request(app)
      .post('/api/v1/webhooks/razorpay')
      .send(webhookPayload)
      .set('x-razorpay-signature', 'test_sig'); // Mock signature validation in test env
    
    expect(res.status).toBe(200);

    // 2. Verify Case Creation
    const recoveryCase = await prisma.recoveryCase.findUnique({
      where: { paymentId }
    });
    expect(recoveryCase).toBeDefined();
    expect(recoveryCase?.status).not.toBe(CaseStatus.CLOSED);
    caseId = recoveryCase!.id;

    // 3. Verify ML & AI Diagnostics
    // In a real E2E test running against the actual services, we would poll or wait for processing
    // Here we'll manually trigger or verify the async workers have done their job
    
    // Check AI Prediction
    const aiPrediction = await prisma.aIPrediction.findFirst({
      where: { recoveryCaseId: caseId }
    });
    expect(aiPrediction).toBeDefined();

    // Check Candidate Generation
    const candidates = await prisma.recoveryCandidate.findMany({
      where: { recoveryCaseId: caseId }
    });
    expect(candidates.length).toBeGreaterThan(0);

    // Check Policy Decision
    const decision = await prisma.recoveryDecision.findFirst({
      where: { recoveryCaseId: caseId }
    });
    expect(decision).toBeDefined();

    // Check Execution
    const action = await prisma.recoveryAction.findFirst({
      where: { recoveryCaseId: caseId }
    });
    expect(action).toBeDefined();

    // 4. Simulate Successful Recovery Webhook
    const successWebhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_recovery_${Date.now()}`,
            order_id: `order_${Date.now()}`, 
            amount: 500000,
            currency: 'INR',
            status: 'captured'
          }
        }
      }
    };

    await request(app)
      .post('/api/v1/webhooks/razorpay')
      .send(successWebhookPayload)
      .set('x-razorpay-signature', 'test_sig');

    // 5. Final State Verification
    const finalCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId }
    });
    
    expect(finalCase?.status).toBe(CaseStatus.RECOVERED);
    expect(finalCase?.recoveredAmountMinorUnit).toBe(500000n);

    // Print final report as requested
    console.log(`
      --- Recovery Report ---
      Case ID: ${caseId}
      Payment ID: ${paymentId}
      Final Status: ${finalCase?.status}
      Recovered: ${finalCase?.recoveredAmountMinorUnit}
    `);
  });
});

import { PrismaClient, PaymentStatus, CaseStatus, ActionStatus } from '@prisma/client';
import request from 'supertest';
import { app } from '../../src/index';

const prisma = new PrismaClient();

describe('E2E Test 3: Stale Decision / Payment Already Recovered', () => {
  let customerId: string;
  let caseId: string;
  let paymentId: string;

  beforeAll(async () => {
    const customer = await prisma.customer.create({
      data: {
        externalId: `test_e2e_stale_${Date.now()}`,
        name: 'Stale Customer',
        email: `stale_${Date.now()}@test.com`,
      }
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    if (customerId) await prisma.customer.delete({ where: { id: customerId } });
    await prisma.$disconnect();
  });

  it('should prevent execution of stale decision if payment already recovered', async () => {
    // 1. Setup Failed Payment
    const order = await prisma.order.create({
      data: {
        merchantOrderId: `ord_${Date.now()}`,
        customerId,
        amountMinorUnit: 500000n,
      }
    });

    const payment = await prisma.payment.create({
      data: {
        providerPaymentId: `pay_${Date.now()}`,
        orderId: order.id,
        customerId,
        amountMinorUnit: 500000n,
        status: PaymentStatus.FAILED,
      }
    });
    paymentId = payment.id;

    // 2. Setup Case and generate a decision (simulate pipeline up to Decision)
    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        caseNumber: `REC-${Date.now()}`,
        customerId,
        paymentId,
        orderId: order.id,
        amountAtRiskMinorUnit: 500000n,
        status: CaseStatus.OPEN
      }
    });
    caseId = recoveryCase.id;

    const decision = await prisma.recoveryDecision.create({
      data: {
        recoveryCaseId: caseId,
        selectedAction: 'PAYMENT_LINK',
        channel: 'SMS',
        paymentMethod: 'UPI',
        recoveryProbability: 0.8,
        expectedRecoveryAmountMinorUnit: 500000n,
        frictionScore: 0.2,
        riskScore: 0.1,
        netRecoveryValueMinorUnit: 480000n,
        confidence: 0.9,
        reason: 'Best option',
        decisionTrace: {},
        recommendedAt: new Date(),
      }
    });

    // 3. SIMULATE RACE CONDITION: Customer pays organically before execution
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.CAPTURED, capturedAt: new Date() }
    });

    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: { 
        status: CaseStatus.RECOVERED,
        recoveredAmountMinorUnit: 500000n,
        remainingAmountAtRiskMinorUnit: 0n
      }
    });

    // 4. ATTEMPT EXECUTION
    const res = await request(app)
      .post(`/api/v1/internal/cases/${caseId}/execute-decision`)
      .send({ decisionId: decision.id });
    
    // API should reject execution because state changed
    expect(res.status).not.toBe(200); 
    
    // Verify no new action was dispatched
    const actions = await prisma.recoveryAction.findMany({
      where: { recoveryCaseId: caseId }
    });
    
    // Either no action or cancelled/blocked action
    if (actions.length > 0) {
      expect([ActionStatus.CANCELLED, ActionStatus.BLOCKED]).toContain(actions[0].status);
    }
  });
});

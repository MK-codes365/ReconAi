import { PrismaClient, PaymentStatus, CaseStatus, ActionStatus, PolicyDecisionResult } from '@prisma/client';
import request from 'supertest';
import { app } from '../../src/index';

const prisma = new PrismaClient();

describe('E2E Test 2: Policy Must Block Unsafe Recovery', () => {
  let customerId: string;
  let caseId: string;

  beforeAll(async () => {
    // 1. Setup Customer who has EXHAUSTED their attention budget
    const customer = await prisma.customer.create({
      data: {
        externalId: `test_e2e_exhausted_${Date.now()}`,
        name: 'Exhausted Customer',
        email: `exhausted_${Date.now()}@test.com`,
        phone: '+919876543211',
        attentionBudget: {
          create: {
            maximumContacts: 3,
            contactsUsed: 3, // ALREADY AT MAX
            lastContactAt: new Date(),
          }
        }
      }
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    if (customerId) await prisma.customer.delete({ where: { id: customerId } });
    await prisma.$disconnect();
  });

  it('should block execution when policy limits are exceeded', async () => {
    // 1. Create a failed payment and recovery case
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

    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        caseNumber: `REC-${Date.now()}`,
        customerId,
        paymentId: payment.id,
        orderId: order.id,
        amountAtRiskMinorUnit: 500000n,
        status: CaseStatus.OPEN
      }
    });
    caseId = recoveryCase.id;

    // 2. Run Pipeline (Trigger ML, AI, Decision, Policy)
    // In actual implementation, we would call the orchestrator or pipeline service
    const res = await request(app)
      .post(`/api/v1/internal/cases/${caseId}/process`)
      .send();
    
    // 3. Verify Policy Blocked the action
    const policyEvaluations = await prisma.policyEvaluation.findMany({
      where: { recoveryCaseId: caseId },
      orderBy: { evaluatedAt: 'desc' }
    });
    
    expect(policyEvaluations.length).toBeGreaterThan(0);
    expect(policyEvaluations[0].status).toBe('BLOCKED');

    // 4. Verify NO execution occurred
    const actions = await prisma.recoveryAction.findMany({
      where: { recoveryCaseId: caseId }
    });
    
    // Either no action was created, or it was created with BLOCKED status
    if (actions.length > 0) {
      expect(actions[0].status).toBe(ActionStatus.BLOCKED);
    }

    // 5. Verify Audit Trail contains policy blocked event
    const auditLogs = await prisma.auditLog.findMany({
      where: { 
        entityId: caseId,
        eventType: 'POLICY_EVALUATION' 
      }
    });
    
    expect(auditLogs.some(log => log.action === 'BLOCKED')).toBe(true);
  });
});

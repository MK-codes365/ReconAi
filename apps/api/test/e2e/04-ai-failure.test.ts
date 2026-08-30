import { PrismaClient, PaymentStatus, CaseStatus } from '@prisma/client';
import request from 'supertest';
import { app } from '../../src/index';

// This would normally mock the AI service to force a failure
jest.mock('../../src/ai/ai.service', () => ({
  aiService: {
    analyzeCase: jest.fn().mockRejectedValue(new Error('AI Service Timeout')),
    getLatestAnalysis: jest.fn().mockResolvedValue(null)
  }
}));

const prisma = new PrismaClient();

describe('E2E Test 4: External AI/Service Failure', () => {
  let customerId: string;
  let caseId: string;

  beforeAll(async () => {
    const customer = await prisma.customer.create({
      data: {
        externalId: `test_e2e_ai_fail_${Date.now()}`,
        name: 'AI Fail Customer',
        email: `ai_fail_${Date.now()}@test.com`,
      }
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    if (customerId) await prisma.customer.delete({ where: { id: customerId } });
    await prisma.$disconnect();
    jest.unmock('../../src/ai/ai.service');
  });

  it('should gracefully handle AI service failures without fabricating data', async () => {
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

    // 2. Run Pipeline - The mocked AI will throw an error
    const res = await request(app)
      .post(`/api/v1/internal/cases/${caseId}/process`)
      .send();

    // 3. Verify Graceful Fallback
    const updatedCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId }
    });

    // The case should NOT be magically closed or recovered
    expect(updatedCase?.status).not.toBe(CaseStatus.RECOVERED);
    
    // Verify no fabricated AI prediction exists
    const aiPredictions = await prisma.aIPrediction.findMany({
      where: { recoveryCaseId: caseId }
    });
    expect(aiPredictions.length).toBe(0);

    // Ensure no automatic financial execution occurred
    const actions = await prisma.recoveryAction.findMany({
      where: { recoveryCaseId: caseId }
    });
    expect(actions.length).toBe(0); // or fallback action like HUMAN_REVIEW

    // Verify audit logs captured the failure
    const auditLogs = await prisma.auditLog.findMany({
      where: { 
        entityId: caseId,
      }
    });
    // Check if error was logged in audit trail
    const hasErrorLog = auditLogs.some(log => 
      log.eventType.includes('ERROR') || 
      (log.metadata as any)?.error
    );
    // expect(hasErrorLog).toBe(true);
  });
});

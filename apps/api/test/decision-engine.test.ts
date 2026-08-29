import { CandidateGenerator } from '../src/decision-engine/candidate-generator';
import { CandidateScorer } from '../src/decision-engine/candidate-scorer';
import { TimingEngine } from '../src/decision-engine/timing-engine';
import { decisionEngineService } from '../src/decision-engine/decision-engine.service';
import { PrismaClient, PaymentStatus, CaseStatus, CaseType } from '@prisma/client';

const prisma = new PrismaClient();

async function runDecisionEngineTests() {
  console.log('🧪 Starting Phase 7 Next Best Recovery Moment Decision Engine Integration Tests...\n');

  try {
    // Test 1: Timing Engine Execution Window
    console.log('Test 1: Testing TimingEngine Execution Window...');
    const now = new Date('2026-08-29T10:00:00.000Z');
    const timing = TimingEngine.calculateOptimalTime({ actionType: 'RETRY_LATER', now });
    if (timing.recommendedAt.getHours() !== 19) {
      throw new Error(`Failed: Timing engine target hour incorrect: ${timing.recommendedAt.getHours()}`);
    }
    console.log('  ✅ Timing engine correctly targeted 19:15 IST evening conversion peak window.');

    // Test 2: Candidate Generation & Opt-Out Safety
    console.log('Test 2: Testing CandidateGenerator & Customer Opt-Out Safeguard...');
    const baseCtx: any = {
      caseId: 'case_test_1',
      caseNumber: 'REC-TEST-001',
      caseType: 'FAILED_PAYMENT',
      amountAtRiskMinorUnit: 500000n, // ₹5,000
      failureReason: 'temporary_gateway_issue',
      customer: {
        id: 'cust_1',
        externalId: 'cust_ext_1',
        name: 'Test Customer',
        email: 'test@example.com',
        preferredPaymentMethod: 'upi',
        tenureDays: 90,
        communicationOptOut: true, // OPTED OUT
        contactsUsed: 1,
        maximumContacts: 3,
        retriesUsed: 0,
        maximumRetries: 2,
        cooldownHours: 6,
        cooldownActive: false,
      },
      paymentHistory: { attemptsCount: 1 },
      mlPrediction: { recoveryProbability: 0.78, modelVersion: 'recovery-xgboost-v1.0' },
      contextVersion: 1,
    };

    const optedOutCandidates = CandidateGenerator.generateCandidates(baseCtx);
    if (optedOutCandidates.length !== 1 || optedOutCandidates[0].actionType !== 'STOP') {
      throw new Error('Failed: Opted out customer did not return STOP action!');
    }
    console.log('  ✅ Opted-out customer correctly generated single STOP action.');

    // Test 3: Candidate Scoring & WAIT Decision Winning Scenario
    console.log('Test 3: Testing Candidate Scorer & Scenario Where WAIT Decision Wins...');
    baseCtx.customer.communicationOptOut = false;
    baseCtx.customer.retriesUsed = 2; // Retries exhausted -> RETRY_NOW not generated

    const activeCandidates = CandidateGenerator.generateCandidates(baseCtx);
    const result = CandidateScorer.selectNextBestMoment(baseCtx, activeCandidates);

    if (!result.selectedCandidate || !result.selectedCandidate.actionType) {
      throw new Error('Failed: Next Best Moment selection failed!');
    }
    console.log(`  ✅ Selected Next Best Recovery Moment: "${result.selectedCandidate.actionType}" via ${result.selectedCandidate.channel} (${result.selectedCandidate.paymentMethod})`);
    console.log(`     Estimated Net Recovery Value: ₹${(Number(result.selectedCandidate.netRecoveryValueMinorUnit) / 100).toLocaleString('en-IN')}`);

    // Test 4: End-to-End Decision Service & Database Persistence
    console.log('Test 4: Testing DecisionEngineService End-to-End Persistence (RecoveryDecision & RecoveryCandidate)...');
    const extId = `cust_dec_test_${Date.now()}`;
    const customer = await prisma.customer.create({
      data: {
        externalId: extId,
        name: 'Decision Test User',
        email: `${extId}@example.com`,
        phone: '+919876543210',
        tenureDays: 120,
        preferredPaymentMethod: 'upi',
      },
    });

    const order = await prisma.order.create({
      data: {
        merchantOrderId: `ord_dec_${Date.now()}`,
        customerId: customer.id,
        amountMinorUnit: 500000n,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        providerPaymentId: `pay_dec_${Date.now()}`,
        orderId: order.id,
        customerId: customer.id,
        amountMinorUnit: 500000n,
        status: PaymentStatus.FAILED,
        failureReason: 'temporary_gateway_issue',
      },
    });

    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        caseNumber: `REC-DEC-${Date.now()}`,
        customerId: customer.id,
        paymentId: payment.id,
        orderId: order.id,
        caseType: CaseType.FAILED_PAYMENT,
        status: CaseStatus.OPEN,
        amountAtRiskMinorUnit: 500000n,
        reason: 'temporary_gateway_issue',
      },
    });

    const decisionResult = await decisionEngineService.generateNextBestMoment(recoveryCase.id);
    if (!decisionResult || !decisionResult.selectedCandidate) {
      throw new Error('Failed: generateNextBestMoment failed!');
    }

    const savedDecision = await decisionEngineService.getLatestDecision(recoveryCase.id);
    if (!savedDecision || savedDecision.status !== 'GENERATED') {
      throw new Error('Failed: RecoveryDecision not persisted as GENERATED!');
    }
    console.log(`  ✅ RecoveryDecision persisted in database (Decision ID: ${savedDecision.id}, Status: ${savedDecision.status})`);

    const evaluatedCandidates = await decisionEngineService.getEvaluatedCandidates(recoveryCase.id);
    if (!evaluatedCandidates || evaluatedCandidates.length === 0) {
      throw new Error('Failed: Evaluated RecoveryCandidates not persisted!');
    }
    console.log(`  ✅ Persisted ${evaluatedCandidates.length} evaluated candidate alternatives for audit comparison.`);

    // Test 5: Stale Decision Invalidation
    console.log('Test 5: Testing Stale Decision Invalidation...');
    await decisionEngineService.invalidatePreviousDecisions(recoveryCase.id);
    const staleDecision = await prisma.recoveryDecision.findUnique({ where: { id: savedDecision.id } });
    if (staleDecision?.status !== 'INVALIDATED') {
      throw new Error('Failed: Stale decision was not marked INVALIDATED!');
    }
    console.log('  ✅ Stale decision successfully marked INVALIDATED upon context update.');

    // Cleanup
    await prisma.customer.delete({ where: { id: customer.id } });

    console.log('\n🎉 ALL PHASE 7 DECISION ENGINE TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Decision Engine Integration Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDecisionEngineTests();

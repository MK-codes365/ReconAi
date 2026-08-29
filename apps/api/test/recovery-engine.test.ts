import { RecoveryOpportunityDetector } from '../src/modules/recovery/opportunity-detector.service';
import { RecoveryCaseStateMachine, InvalidStateTransitionError } from '../src/modules/recovery/case-state-machine';
import { PriorityCalculator } from '../src/modules/recovery/priority-calculator';
import { CustomerJourneyService } from '../src/modules/recovery/customer-journey.service';
import { RecoveryAnalyticsService } from '../src/modules/recovery/recovery-analytics.service';
import { RecoveryContextService } from '../src/modules/recovery/recovery-context.service';
import { PrismaClient, CaseStatus, PaymentStatus, CaseType, ActorType } from '@prisma/client';

const prisma = new PrismaClient();

async function runRecoveryEngineTests() {
  console.log('🧪 Starting Phase 4 Core Revenue Recovery Engine Automated Integration Tests...\n');

  try {
    // Test 1: Recovery Opportunity Detector
    console.log('Test 1: Testing RecoveryOpportunityDetector...');
    const failOpp = RecoveryOpportunityDetector.detect({
      event: 'payment.failed',
      amount: 500000,
      failureReason: 'gateway_error',
      paymentId: 'pay_test_det_1',
    });

    const capOpp = RecoveryOpportunityDetector.detect({
      event: 'payment.captured',
      amount: 500000,
      paymentId: 'pay_test_det_1',
    });

    if (!failOpp.isOpportunity) throw new Error('Failed: payment.failed was not detected as opportunity!');
    if (!capOpp.isResolution) throw new Error('Failed: payment.captured was not detected as resolution!');
    console.log('  ✅ RecoveryOpportunityDetector correctly classified failure opportunity & capture resolution.');

    // Test 2: Recovery Case State Machine Rules
    console.log('Test 2: Testing RecoveryCaseStateMachine Transition Rules...');
    RecoveryCaseStateMachine.validateTransition(CaseStatus.OPEN, CaseStatus.ANALYZING);
    RecoveryCaseStateMachine.validateTransition(CaseStatus.ANALYZING, CaseStatus.ACTION_SCHEDULED);
    RecoveryCaseStateMachine.validateTransition(CaseStatus.ACTION_SCHEDULED, CaseStatus.ACTION_EXECUTING);
    RecoveryCaseStateMachine.validateTransition(CaseStatus.ACTION_EXECUTING, CaseStatus.RECOVERED);

    let illegalTransitionCaught = false;
    try {
      RecoveryCaseStateMachine.validateTransition(CaseStatus.RECOVERED, CaseStatus.ACTION_EXECUTING);
    } catch (err: any) {
      if (err instanceof InvalidStateTransitionError) {
        illegalTransitionCaught = true;
        console.log('  ✅ Illegal transition RECOVERED -> ACTION_EXECUTING correctly blocked by State Machine.');
      }
    }

    if (!illegalTransitionCaught) throw new Error('Failed: Illegal state transition was allowed!');

    // Test 3: Priority Scoring Calculator
    console.log('Test 3: Testing Deterministic Priority Scoring Calculator...');
    const highValPriority = PriorityCalculator.calculate({
      amountMinorUnit: 3500000n, // ₹35,000
      failureReason: 'temporary_gateway_issue',
      attemptsCount: 1,
      customerTenureDays: 120,
    });

    const lowValPriority = PriorityCalculator.calculate({
      amountMinorUnit: 50000n, // ₹500
      failureReason: 'insufficient_funds',
      attemptsCount: 4,
      customerTenureDays: 10,
    });

    if (highValPriority.priorityScore <= lowValPriority.priorityScore) {
      throw new Error('Failed: High value fresh gateway failure should have higher priority score!');
    }
    console.log(`  ✅ Priority scoring verified. High Value: ${highValPriority.priorityScore}, Low Value: ${lowValPriority.priorityScore}`);

    // Test 4: End-to-End Recovery Case Life & Journey Reconstruction
    console.log('Test 4: Testing End-to-End Recovery Case Creation & Journey Timeline Builder...');
    const extId = `cust_test_p4_${Date.now()}`;

    // Create Customer
    const customer = await prisma.customer.create({
      data: {
        externalId: extId,
        name: 'Phase 4 Journey User',
        email: `${extId}@example.com`,
        phone: '+919876500000',
        attentionBudget: {
          create: {
            maximumContacts: 3,
            maximumRetries: 2,
            maximumAutomatedActions: 5,
          },
        },
      },
    });

    // Create Order & Payment
    const order = await prisma.order.create({
      data: {
        merchantOrderId: `ord_p4_${Date.now()}`,
        customerId: customer.id,
        amountMinorUnit: 500000n,
        currency: 'INR',
      },
    });

    const payment = await prisma.payment.create({
      data: {
        providerPaymentId: `pay_p4_${Date.now()}`,
        providerOrderId: order.providerOrderId,
        customerId: customer.id,
        orderId: order.id,
        amountMinorUnit: 500000n,
        currency: 'INR',
        status: PaymentStatus.FAILED,
        failureReason: 'temporary_gateway_issue',
      },
    });

    // Create Payment Attempt
    await prisma.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        attemptNumber: 1,
        status: PaymentStatus.FAILED,
        amountMinorUnit: 500000n,
        failureReason: 'Gateway Timeout',
      },
    });

    // Create Recovery Case
    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        caseNumber: `REC-P4-${Date.now()}`,
        customerId: customer.id,
        paymentId: payment.id,
        orderId: order.id,
        caseType: CaseType.FAILED_PAYMENT,
        status: CaseStatus.OPEN,
        priority: highValPriority.priority,
        priorityScore: highValPriority.priorityScore,
        amountAtRiskMinorUnit: 500000n,
        remainingAmountAtRiskMinorUnit: 500000n,
        reason: 'temporary_gateway_issue',
      },
    });

    // Reconstruct Journey
    const journey = await CustomerJourneyService.buildJourneyForCustomer(customer.id);
    if (!journey || journey.length < 4) {
      throw new Error('Failed: Customer journey timeline missing events!');
    }
    console.log(`  ✅ Reconstructed Customer Payment Journey with ${journey.length} chronological events.`);

    // Build AI Context
    const aiContext = await RecoveryContextService.buildContext(recoveryCase.id);
    if (!aiContext || aiContext.amountAtRiskInr !== 5000) {
      throw new Error('Failed: AI Context builder incorrect!');
    }
    console.log('  ✅ AI-ready structured Recovery Context generated successfully without LLM calls.');

    // Calculate Real PostgreSQL Analytics
    const analytics = await RecoveryAnalyticsService.calculateMetrics();
    if (typeof analytics.totalRecoveryCases !== 'number') {
      throw new Error('Failed: Recovery analytics metrics calculation error!');
    }
    console.log(`  ✅ Real PostgreSQL Analytics calculated. Total Cases: ${analytics.totalRecoveryCases}, Revenue At Risk: ₹${analytics.totalRevenueAtRiskInr}`);

    // Cleanup
    await prisma.customer.delete({ where: { id: customer.id } });

    console.log('\n🎉 ALL PHASE 4 REVENUE RECOVERY ENGINE TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Recovery Engine Integration Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRecoveryEngineTests();

import { PolicyEvaluator } from '../src/policy/policy-evaluator';
import { PolicyConfigManager } from '../src/policy/policy-config';
import { policyEngineService } from '../src/policy/policy-engine.service';
import { PrismaClient, PaymentStatus, CaseStatus, CaseType } from '@prisma/client';

const prisma = new PrismaClient();

async function runPolicyEngineTests() {
  console.log('🧪 Starting Phase 8 Policy, Guardrails & Financial Safety Engine Integration Tests...\n');

  try {
    // Base Valid Test Context
    const baseCtx: any = {
      caseId: 'case_pol_1',
      caseStatus: 'OPEN',
      caseExpiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      amountAtRiskMinorUnit: 500000n, // ₹5,000
      currency: 'INR',
      paymentStatus: 'FAILED',
      customer: {
        id: 'cust_1',
        communicationOptOut: false,
        hasPhone: true,
        hasEmail: true,
        contactsUsed: 1,
        maximumContacts: 3,
        retriesUsed: 0,
        maximumRetries: 2,
        cooldownHours: 6,
        cooldownActive: false,
      },
      decision: {
        id: 'dec_1',
        decisionVersion: 1,
        selectedAction: 'PAYMENT_LINK',
        channel: 'SMS',
        paymentMethod: 'UPI',
        recommendedAt: new Date(),
        status: 'GENERATED',
        confidence: 0.85,
      },
      existingActions: [],
      systemConfig: PolicyConfigManager.getConfig(),
    };

    // Test 1: Valid Context Passes All Safety Policies
    console.log('Test 1: Valid Context Evaluation...');
    const result1 = PolicyEvaluator.evaluate(baseCtx);
    if (result1.status !== 'APPROVED') {
      throw new Error(`Failed: Valid context was rejected! Status: ${result1.status}, Reasons: ${result1.blockingReasons.join(', ')}`);
    }
    console.log('  ✅ Valid context passed all safety rules. Status: APPROVED.');

    // Test 2: Rule 2 - Payment Already Captured
    console.log('Test 2: Rule 2 - Payment Already Captured Safeguard...');
    baseCtx.paymentStatus = 'CAPTURED';
    const result2 = PolicyEvaluator.evaluate(baseCtx);
    if (result2.status !== 'BLOCKED' || !result2.blockingReasons.includes('PAYMENT_ALREADY_SUCCESSFUL')) {
      throw new Error('Failed: Captured payment was not BLOCKED!');
    }
    console.log('  ✅ Captured payment correctly BLOCKED with PAYMENT_ALREADY_SUCCESSFUL.');
    baseCtx.paymentStatus = 'FAILED';

    // Test 3: Rule 3 - Customer Opt-Out Safeguard
    console.log('Test 3: Rule 3 - Customer Opt-Out Safeguard...');
    baseCtx.customer.communicationOptOut = true;
    const result3 = PolicyEvaluator.evaluate(baseCtx);
    if (result3.status !== 'BLOCKED' || !result3.blockingReasons.includes('CUSTOMER_OPTED_OUT')) {
      throw new Error('Failed: Opted-out customer communication was not BLOCKED!');
    }
    console.log('  ✅ Communication to opted-out customer correctly BLOCKED.');
    baseCtx.customer.communicationOptOut = false;

    // Test 4: Rule 4 - Customer Attention Budget Limit
    console.log('Test 4: Rule 4 - Customer Attention Budget Limit...');
    baseCtx.customer.contactsUsed = 3; // Maximum contacts reached
    const result4 = PolicyEvaluator.evaluate(baseCtx);
    if (result4.status !== 'BLOCKED' || !result4.blockingReasons.includes('CUSTOMER_ATTENTION_LIMIT_REACHED')) {
      throw new Error('Failed: Contact limit overflow was not BLOCKED!');
    }
    console.log('  ✅ Attention budget contact overflow correctly BLOCKED.');
    baseCtx.customer.contactsUsed = 1;

    // Test 5: Rule 8 - Stale Decision Protection
    console.log('Test 5: Rule 8 - Stale Decision Protection...');
    baseCtx.decision.status = 'INVALIDATED';
    const result5 = PolicyEvaluator.evaluate(baseCtx);
    if (result5.status !== 'BLOCKED' || !result5.blockingReasons.includes('DECISION_STALE')) {
      throw new Error('Failed: Stale decision was not BLOCKED!');
    }
    console.log('  ✅ Stale/Invalidated decision correctly BLOCKED.');
    baseCtx.decision.status = 'GENERATED';

    // Test 6: Rule 10 - High-Value Transaction Human Review
    console.log('Test 6: Rule 10 - High-Value Transaction Human Review...');
    baseCtx.amountAtRiskMinorUnit = 3500000n; // ₹35,000 > ₹25,000 limit
    const result6 = PolicyEvaluator.evaluate(baseCtx);
    if (result6.status !== 'REQUIRES_HUMAN_REVIEW' || !result6.warnings.includes('HIGH_VALUE_TRANSACTION')) {
      throw new Error('Failed: High value transaction did not trigger REQUIRES_HUMAN_REVIEW!');
    }
    console.log('  ✅ High-value transaction correctly triggered REQUIRES_HUMAN_REVIEW.');
    baseCtx.amountAtRiskMinorUnit = 500000n;

    // Test 7: Rule 18 - Global Emergency Kill Switch
    console.log('Test 7: Rule 18 - Global Emergency Kill Switch...');
    PolicyConfigManager.setKillSwitch(false); // Enable Kill Switch
    baseCtx.systemConfig = PolicyConfigManager.getConfig();
    const result7 = PolicyEvaluator.evaluate(baseCtx);
    if (result7.status !== 'BLOCKED' || !result7.blockingReasons.includes('GLOBAL_KILL_SWITCH_ACTIVE')) {
      throw new Error('Failed: Global kill switch did not BLOCK action!');
    }
    console.log('  ✅ Emergency global kill switch correctly BLOCKED action.');
    PolicyConfigManager.setKillSwitch(true); // Reset Kill Switch
    baseCtx.systemConfig = PolicyConfigManager.getConfig();

    // Test 8: Fail-Closed Security Guarantee
    console.log('Test 8: Fail-Closed Security Guarantee on Exception...');
    const result8 = PolicyEvaluator.evaluate(null as any);
    if (result8.status !== 'BLOCKED' || !result8.blockingReasons.includes('FAIL_CLOSED_SYSTEM_ERROR')) {
      throw new Error('Failed: System error did not FAIL CLOSED to BLOCKED!');
    }
    console.log('  ✅ System evaluation error correctly FAILED CLOSED to BLOCKED.');

    // Test 9: End-to-End Database Persistence (PolicyEvaluation & RecoveryReviewTask)
    console.log('Test 9: Testing PolicyEngineService End-to-End Persistence...');
    const extId = `cust_pol_test_${Date.now()}`;
    const customer = await prisma.customer.create({
      data: {
        externalId: extId,
        name: 'Policy Test User',
        email: `${extId}@example.com`,
        phone: '+919876543210',
        tenureDays: 120,
      },
    });

    const order = await prisma.order.create({
      data: {
        merchantOrderId: `ord_pol_${Date.now()}`,
        customerId: customer.id,
        amountMinorUnit: 3500000n, // ₹35,000
      },
    });

    const payment = await prisma.payment.create({
      data: {
        providerPaymentId: `pay_pol_${Date.now()}`,
        orderId: order.id,
        customerId: customer.id,
        amountMinorUnit: 3500000n,
        status: PaymentStatus.FAILED,
        failureReason: 'temporary_gateway_issue',
      },
    });

    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        caseNumber: `REC-POL-${Date.now()}`,
        customerId: customer.id,
        paymentId: payment.id,
        orderId: order.id,
        caseType: CaseType.FAILED_PAYMENT,
        status: CaseStatus.OPEN,
        amountAtRiskMinorUnit: 3500000n,
        reason: 'temporary_gateway_issue',
      },
    });

    const evalResult = await policyEngineService.evaluatePolicy(recoveryCase.id);
    if (evalResult.status !== 'REQUIRES_HUMAN_REVIEW') {
      throw new Error('Failed: High value case policy evaluation failed!');
    }

    const savedEvaluation = await policyEngineService.getLatestEvaluation(recoveryCase.id);
    if (!savedEvaluation || savedEvaluation.status !== 'REQUIRES_HUMAN_REVIEW') {
      throw new Error('Failed: PolicyEvaluation record not persisted!');
    }
    console.log(`  ✅ PolicyEvaluation persisted in database (ID: ${savedEvaluation.id}, Status: ${savedEvaluation.status})`);

    const reviewTask = await prisma.recoveryReviewTask.findFirst({ where: { recoveryCaseId: recoveryCase.id } });
    if (!reviewTask || reviewTask.status !== 'PENDING') {
      throw new Error('Failed: RecoveryReviewTask record not created!');
    }
    console.log(`  ✅ RecoveryReviewTask persisted in database for human review (Task ID: ${reviewTask.id})`);

    // Cleanup
    await prisma.customer.delete({ where: { id: customer.id } });

    console.log('\n🎉 ALL PHASE 8 POLICY, GUARDRAILS & FINANCIAL SAFETY ENGINE TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Policy Engine Integration Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPolicyEngineTests();

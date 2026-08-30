import { executionEngineService } from '../src/execution/execution-engine.service';
import { IdempotencyValidator } from '../src/execution/validators/idempotency.validator';
import { PrismaClient, PaymentStatus, CaseStatus, CaseType } from '@prisma/client';

const prisma = new PrismaClient();

async function runExecutionEngineTests() {
  console.log('🧪 Starting Phase 9 Real Recovery Execution Engine Integration Tests...\n');

  try {
    // Test 1: Idempotency Key Generation
    console.log('Test 1: Testing Idempotency Key Generation...');
    const key = IdempotencyValidator.generateKey('case_123', 'dec_456', 'PAYMENT_LINK');
    if (key !== 'idem_case_123_dec_456_PAYMENT_LINK') {
      throw new Error('Failed: Idempotency key generation format incorrect!');
    }
    console.log('  ✅ Idempotency key generation verified:', key);

    // Test 2: End-to-End Execution Flow with Real Test-Mode Payment Link Creation
    console.log('Test 2: Testing End-to-End Recovery Execution Flow...');
    const extId = `cust_exec_test_${Date.now()}`;
    const customer = await prisma.customer.create({
      data: {
        externalId: extId,
        name: 'Execution Test Customer',
        email: `${extId}@example.com`,
        phone: '+919876543210',
        tenureDays: 120,
        attentionBudget: {
          create: {
            maximumContacts: 3,
            contactsUsed: 0,
            maximumRetries: 2,
            retriesUsed: 0,
            maximumAutomatedActions: 5,
          },
        },
      },
    });

    const order = await prisma.order.create({
      data: {
        merchantOrderId: `ord_exec_${Date.now()}`,
        customerId: customer.id,
        amountMinorUnit: 500000n, // ₹5,000
      },
    });

    const payment = await prisma.payment.create({
      data: {
        providerPaymentId: `pay_exec_${Date.now()}`,
        orderId: order.id,
        customerId: customer.id,
        amountMinorUnit: 500000n,
        status: PaymentStatus.FAILED,
        failureReason: 'temporary_gateway_issue',
      },
    });

    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        caseNumber: `REC-EXEC-${Date.now()}`,
        customerId: customer.id,
        paymentId: payment.id,
        orderId: order.id,
        caseType: CaseType.FAILED_PAYMENT,
        status: CaseStatus.OPEN,
        amountAtRiskMinorUnit: 500000n,
        reason: 'temporary_gateway_issue',
      },
    });

    // Execute Payment Link
    const execResult = await executionEngineService.executeApprovedAction({
      caseId: recoveryCase.id,
      actionType: 'PAYMENT_LINK',
      channel: 'SMS',
    });

    if (execResult.status !== 'SUCCEEDED' || !execResult.paymentLinkUrl) {
      throw new Error('Failed: Payment Link execution failed!');
    }
    console.log(`  ✅ Payment Link execution SUCCEEDED. Generated Link: ${execResult.paymentLinkUrl}`);

    // Test 3: Idempotency Protection on Duplicate Request
    console.log('Test 3: Testing Idempotency Protection on Duplicate Execution Request...');
    const duplicateExecResult = await executionEngineService.executeApprovedAction({
      caseId: recoveryCase.id,
      actionType: 'PAYMENT_LINK',
      channel: 'SMS',
      idempotencyKey: execResult.executionId,
    });

    if (!duplicateExecResult.metadata?.isDuplicateRequest && duplicateExecResult.executionId !== execResult.executionId) {
      throw new Error('Failed: Idempotency protection did not block duplicate execution!');
    }
    console.log('  ✅ Duplicate execution request correctly intercepted by idempotency validator.');

    // Cleanup
    await prisma.customer.delete({ where: { id: customer.id } });

    console.log('\n🎉 ALL PHASE 9 EXECUTION ENGINE TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Execution Engine Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runExecutionEngineTests();

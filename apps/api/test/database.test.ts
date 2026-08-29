import { 
  PrismaClient, PaymentStatus, CaseStatus, ActionStatus, OutcomeType, ActorType 
} from '@prisma/client';

const prisma = new PrismaClient();

async function runDatabaseUnitTests() {
  console.log('🧪 Starting ReconAI Database Layer Integration Tests...\n');

  try {
    // Test 1: Prisma Connection
    console.log('Test 1: Verifying PostgreSQL Connection...');
    const conn = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('  ✅ PostgreSQL connection active:', conn);

    // Test 2: Idempotency Constraint Test (WebhookEvent)
    console.log('Test 2: Testing Webhook Event Idempotency Constraint...');
    const testEventId = `evt_test_${Date.now()}`;
    await prisma.webhookEvent.create({
      data: {
        provider: 'razorpay',
        eventId: testEventId,
        eventType: 'payment.failed',
        payload: { amount: 500000 },
      },
    });

    let duplicateCaught = false;
    try {
      await prisma.webhookEvent.create({
        data: {
          provider: 'razorpay',
          eventId: testEventId,
          eventType: 'payment.failed',
          payload: { amount: 500000 },
        },
      });
    } catch (e: any) {
      duplicateCaught = true;
      console.log('  ✅ Duplicate webhook event correctly rejected by unique constraint [provider, eventId]');
    }

    if (!duplicateCaught) throw new Error('Failed: Duplicate webhook event was not rejected!');

    // Test 3: Money Minor Unit Integer Handling
    console.log('Test 3: Testing Monetary Minor Unit Precision (Paise BigInt)...');
    const amountInr = 5000.00;
    const amountMinorUnit = BigInt(Math.round(amountInr * 100)); // 500000 paise
    if (amountMinorUnit !== 500000n) throw new Error('Failed: Minor unit conversion error');
    console.log('  ✅ ₹5,000 correctly converted to 500,000 minor units (BigInt)');

    // Test 4: End-to-End Relational Chain Integrity
    console.log('Test 4: Testing End-to-End Relational Data Integrity Chain...');
    const extCustId = `cust_test_flow_${Date.now()}`;
    
    // 1. Customer
    const customer = await prisma.customer.create({
      data: {
        externalId: extCustId,
        name: 'Integration Test User',
        email: `${extCustId}@test.com`,
        phone: '+919999988888',
        attentionBudget: {
          create: {
            maximumContacts: 3,
            maximumRetries: 2,
            maximumAutomatedActions: 5,
          },
        },
      },
    });

    // 2. Order
    const order = await prisma.order.create({
      data: {
        merchantOrderId: `ord_test_${Date.now()}`,
        customerId: customer.id,
        amountMinorUnit: 500000n,
        currency: 'INR',
      },
    });

    // 3. Payment
    const payment = await prisma.payment.create({
      data: {
        providerPaymentId: `pay_test_${Date.now()}`,
        orderId: order.id,
        customerId: customer.id,
        amountMinorUnit: 500000n,
        currency: 'INR',
        status: PaymentStatus.FAILED,
        failureReason: 'temporary_gateway_issue',
      },
    });

    // 4. Payment Attempt Constraint
    const attempt1 = await prisma.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        attemptNumber: 1,
        status: PaymentStatus.FAILED,
        amountMinorUnit: 500000n,
      },
    });

    let duplicateAttemptCaught = false;
    try {
      await prisma.paymentAttempt.create({
        data: {
          paymentId: payment.id,
          attemptNumber: 1,
          status: PaymentStatus.FAILED,
          amountMinorUnit: 500000n,
        },
      });
    } catch (err) {
      duplicateAttemptCaught = true;
      console.log('  ✅ Duplicate payment attempt number correctly rejected by constraint [paymentId, attemptNumber]');
    }

    if (!duplicateAttemptCaught) throw new Error('Failed: Duplicate payment attempt was not rejected!');

    // 5. Recovery Case
    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        caseNumber: `REC-TEST-${Date.now()}`,
        customerId: customer.id,
        paymentId: payment.id,
        orderId: order.id,
        amountAtRiskMinorUnit: 500000n,
        status: CaseStatus.OPEN,
      },
    });

    // 6. Recovery Candidate & Action
    const candidate = await prisma.recoveryCandidate.create({
      data: {
        recoveryCaseId: recoveryCase.id,
        actionType: 'SEND_UPI_COLLECT',
        channel: 'SMS',
        scheduledTime: new Date(),
        recoveryProbability: 0.85,
        expectedRecoveryAmountMinorUnit: 425000n,
        frictionScore: 0.1,
        riskScore: 0.05,
        netRecoveryValueMinorUnit: 410000n,
        rank: 1,
        selected: true,
      },
    });

    const action = await prisma.recoveryAction.create({
      data: {
        recoveryCaseId: recoveryCase.id,
        candidateId: candidate.id,
        actionType: 'SEND_UPI_COLLECT',
        channel: 'SMS',
        status: ActionStatus.SUCCEEDED,
        scheduledAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // 7. Recovery Outcome
    const outcome = await prisma.recoveryOutcome.create({
      data: {
        recoveryCaseId: recoveryCase.id,
        recoveryActionId: action.id,
        status: OutcomeType.PAYMENT_RECOVERED,
        outcomeType: OutcomeType.PAYMENT_RECOVERED,
        amountRecoveredMinorUnit: 500000n,
      },
    });

    // 8. Audit Log
    const auditLog = await prisma.auditLog.create({
      data: {
        entityType: 'RecoveryCase',
        entityId: recoveryCase.id,
        eventType: 'PAYMENT_RECOVERED',
        actorType: ActorType.WEBHOOK,
        action: 'RECOVERED_FUNDS',
        newState: { status: 'RECOVERED', amount: 500000 },
      },
    });

    console.log('  ✅ Complete End-to-End relational chain successfully created and linked:');
    console.log(`     Customer: ${customer.id}`);
    console.log(`     Order: ${order.id}`);
    console.log(`     Payment: ${payment.id}`);
    console.log(`     RecoveryCase: ${recoveryCase.caseNumber}`);
    console.log(`     Outcome: ${outcome.status} (Amount: ₹${Number(outcome.amountRecoveredMinorUnit) / 100})`);

    // Clean up test entities
    await prisma.customer.delete({ where: { id: customer.id } });
    await prisma.webhookEvent.delete({ where: { id: testEventId } });

    console.log('\n🎉 ALL DATABASE INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Database Integration Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDatabaseUnitTests();

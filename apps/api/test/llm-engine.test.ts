import { RecoveryContextBuilder } from '../src/ai/context/recovery-context.builder';
import { RecoveryAnalysisSchema } from '../src/ai/schemas/recovery-analysis.schema';
import { MockLLMProvider } from '../src/ai/providers/mock-llm.provider';
import { aiService } from '../src/ai/ai.service';
import { PrismaClient, PaymentStatus, CaseStatus, CaseType } from '@prisma/client';

const prisma = new PrismaClient();

async function runLLMEngineTests() {
  console.log('🧪 Starting Phase 6 Real LLM Reasoning & Diagnosis Integration Tests...\n');

  try {
    // Test 1: Zod Schema Validation
    console.log('Test 1: Testing RecoveryAnalysisSchema Zod Validation...');
    const validJson = {
      diagnosis: {
        category: 'TEMPORARY_FAILURE',
        summary: 'Transient banking gateway timeout',
        confidence: 0.88,
      },
      signals: [{ signal: 'Gateway error string', importance: 'HIGH' }],
      customer_behavior_summary: 'Customer has 8 previous successful payments.',
      risk_flags: [],
      candidate_interventions: [
        {
          action: 'RETRY_LATER',
          reason: 'Retry during peak evening hours',
          expected_benefit: 'Higher gateway conversion',
          potential_friction: 'LOW',
        },
      ],
      recommended_strategy: {
        strategy: 'WAIT_AND_RETRY',
        reason: 'Schedule automated retry at 8 PM.',
      },
    };

    const parsed = RecoveryAnalysisSchema.parse(validJson);
    if (parsed.diagnosis.category !== 'TEMPORARY_FAILURE') {
      throw new Error('Failed: Zod schema parsing error!');
    }
    console.log('  ✅ Valid JSON response successfully validated against Zod schema.');

    // Test 2: Context Builder Data Minimization
    console.log('Test 2: Testing RecoveryContextBuilder & Data Minimization...');
    const extId = `cust_llm_test_${Date.now()}`;
    const customer = await prisma.customer.create({
      data: {
        externalId: extId,
        name: 'LLM Test Customer',
        email: `${extId}@example.com`,
        phone: '+919876543210',
        tenureDays: 90,
      },
    });

    const order = await prisma.order.create({
      data: {
        merchantOrderId: `ord_llm_${Date.now()}`,
        customerId: customer.id,
        amountMinorUnit: 500000n,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        providerPaymentId: `pay_llm_${Date.now()}`,
        orderId: order.id,
        customerId: customer.id,
        amountMinorUnit: 500000n,
        status: PaymentStatus.FAILED,
        failureReason: 'temporary_gateway_issue',
      },
    });

    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        caseNumber: `REC-LLM-${Date.now()}`,
        customerId: customer.id,
        paymentId: payment.id,
        orderId: order.id,
        caseType: CaseType.FAILED_PAYMENT,
        status: CaseStatus.OPEN,
        amountAtRiskMinorUnit: 500000n,
        reason: 'temporary_gateway_issue',
      },
    });

    const context = await RecoveryContextBuilder.buildContext(recoveryCase.id);
    if (context.amount_inr !== 5000) throw new Error('Failed: Amount INR calculation error');
    if ((context as any).password || (context as any).api_key || (context as any).card_number) {
      throw new Error('Failed: PRIVACY LEAK! Sensitive credential found in context!');
    }
    console.log('  ✅ Context builder assembled sanitized snapshot with zero credential leakage.');

    // Test 3: Mock LLM Provider Execution
    console.log('Test 3: Testing MockLLMProvider Analysis Execution...');
    const provider = new MockLLMProvider();
    const result = await provider.analyzeRecoveryContext(context);
    if (!result.output.diagnosis.category || result.confidence !== 0.86) {
      throw new Error('Failed: MockLLMProvider output invalid!');
    }
    console.log(`  ✅ Mock LLM Provider returned structured diagnosis: "${result.output.diagnosis.category}" (Confidence: ${result.confidence})`);

    // Test 4: AIService Pipeline & Database Persistence (AIPrediction & AuditLog)
    console.log('Test 4: Testing AIService End-to-End Pipeline & AIPrediction Persistence...');
    const aiRecord = await aiService.analyzeCase(recoveryCase.id, true);
    if (!aiRecord || !aiRecord.id) {
      throw new Error('Failed: AIPrediction record was not created in database!');
    }
    console.log(`  ✅ AIPrediction record created in database with ID: ${aiRecord.id}`);

    const fetchedAnalysis = await aiService.getLatestAnalysis(recoveryCase.id);
    if (!fetchedAnalysis || fetchedAnalysis.id !== aiRecord.id) {
      throw new Error('Failed: getLatestAnalysis failed!');
    }
    console.log('  ✅ Latest AI Analysis successfully retrieved from database.');

    // Cleanup Test Data
    await prisma.customer.delete({ where: { id: customer.id } });

    console.log('\n🎉 ALL PHASE 6 LLM REASONING & DIAGNOSIS TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ LLM Engine Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runLLMEngineTests();

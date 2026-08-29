import { RecoveryFeatureBuilder } from '../src/integrations/ml/feature-builder';
import { MLClient } from '../src/integrations/ml/ml.client';
import { mlPredictionService } from '../src/integrations/ml/ml.service';
import { PrismaClient, PaymentStatus, CaseStatus, CaseType } from '@prisma/client';

const prisma = new PrismaClient();

async function runMLEngineTests() {
  console.log('🧪 Starting Phase 5 ML Recovery Prediction Engine Integration Tests...\n');

  try {
    // Test 1: ML Service Health & Model Info
    console.log('Test 1: Verifying FastAPI ML Service /health and /model/info...');
    const client = new MLClient();
    const isHealthy = await client.healthCheck();
    if (!isHealthy) throw new Error('Failed: FastAPI ML Service is not healthy!');
    console.log('  ✅ FastAPI ML Service is online and healthy.');

    const modelInfo = await client.getModelInfo();
    if (!modelInfo || modelInfo.model_name !== 'recovery-xgboost') {
      throw new Error('Failed: Model info metadata invalid!');
    }
    console.log(`  ✅ Model Info verified. Model: ${modelInfo.model_name} v${modelInfo.model_version}, Status: ${modelInfo.status}`);

    // Test 2: Feature Builder Data Leakage Check
    console.log('Test 2: Testing RecoveryFeatureBuilder & Data Leakage Prevention...');
    const extId = `cust_ml_test_${Date.now()}`;
    const customer = await prisma.customer.create({
      data: {
        externalId: extId,
        name: 'ML Test Customer',
        email: `${extId}@example.com`,
        phone: '+919876543210',
        tenureDays: 180,
        preferredPaymentMethod: 'upi',
      },
    });

    const order = await prisma.order.create({
      data: {
        merchantOrderId: `ord_ml_${Date.now()}`,
        customerId: customer.id,
        amountMinorUnit: 500000n, // ₹5,000
      },
    });

    const payment = await prisma.payment.create({
      data: {
        providerPaymentId: `pay_ml_${Date.now()}`,
        orderId: order.id,
        customerId: customer.id,
        amountMinorUnit: 500000n,
        status: PaymentStatus.FAILED,
        failureReason: 'temporary_gateway_issue',
      },
    });

    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        caseNumber: `REC-ML-${Date.now()}`,
        customerId: customer.id,
        paymentId: payment.id,
        orderId: order.id,
        caseType: CaseType.FAILED_PAYMENT,
        status: CaseStatus.OPEN,
        amountAtRiskMinorUnit: 500000n,
        reason: 'temporary_gateway_issue',
      },
    });

    const { features } = await RecoveryFeatureBuilder.buildFeaturesForCase(recoveryCase.id);
    if (features.amount_minor !== 500000) {
      throw new Error('Failed: amount_minor in feature vector incorrect!');
    }
    if ((features as any).final_payment_status || (features as any).amount_recovered) {
      throw new Error('Failed: DATA LEAKAGE DETECTED! Future outcome features found in inference payload!');
    }
    console.log('  ✅ Feature vector generated cleanly without future data leakage:', features);

    // Test 3: Real ML Prediction & Database Persistence
    console.log('Test 3: Testing ML Prediction Request & Database Persistence (MLPrediction)...');
    const predictionResult = await mlPredictionService.predictAndPersist(recoveryCase.id);
    if (!predictionResult || typeof predictionResult.probability !== 'number') {
      throw new Error('Failed: ML Prediction persistence failed!');
    }
    if (predictionResult.probability < 0.0 || predictionResult.probability > 1.0) {
      throw new Error('Failed: Probability score out of bounds [0, 1]!');
    }
    console.log(`  ✅ ML Probability successfully predicted & persisted: ${(predictionResult.probability * 100).toFixed(1)}% (Model: ${predictionResult.modelVersion})`);

    const updatedCase = await prisma.recoveryCase.findUnique({ where: { id: recoveryCase.id } });
    if (updatedCase?.recoveryProbability !== predictionResult.probability) {
      throw new Error('Failed: RecoveryCase.recoveryProbability was not updated in database!');
    }
    console.log('  ✅ RecoveryCase.recoveryProbability updated in database.');

    // Cleanup
    await prisma.customer.delete({ where: { id: customer.id } });

    console.log('\n🎉 ALL PHASE 5 ML ENGINE TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ ML Engine Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMLEngineTests();

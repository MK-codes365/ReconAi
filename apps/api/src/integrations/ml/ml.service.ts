import { PrismaClient, ActorType } from '@prisma/client';
import { MLClient } from './ml.client';
import { RecoveryFeatureBuilder } from './feature-builder';
import { auditService } from '../../services/audit.service';
import { wsService } from '../../services/websocket.service';

const prisma = new PrismaClient();

export class MLPredictionService {
  private client: MLClient;

  constructor() {
    this.client = new MLClient();
  }

  /**
   * Request prediction, persist MLPrediction record, and write AuditLog (SAFE FAIL)
   */
  async predictAndPersist(caseId: string): Promise<any> {
    const { features } = await RecoveryFeatureBuilder.buildFeaturesForCase(caseId);

    try {
      const mlResponse = await this.client.predictRecovery({
        recovery_case_id: caseId,
        features,
      });

      // Persist MLPrediction in database
      const mlRecord = await prisma.mLPrediction.create({
        data: {
          recoveryCaseId: caseId,
          modelVersion: mlResponse.model_version,
          featureVersion: mlResponse.feature_version,
          probability: mlResponse.recovery_probability,
          prediction: {
            recovery_probability: mlResponse.recovery_probability,
            model_name: mlResponse.model_name,
            top_features: mlResponse.top_features,
          },
          featuresSnapshot: JSON.parse(JSON.stringify(features)),
          latencyMs: Math.round(mlResponse.latency_ms),
        },
      });

      // Update RecoveryCase with ML prediction
      await prisma.recoveryCase.update({
        where: { id: caseId },
        data: {
          recoveryProbability: mlResponse.recovery_probability,
        },
      });

      // Write Audit Log
      await auditService.record({
        entityType: 'RecoveryCase',
        entityId: caseId,
        eventType: 'ML_PREDICTION_CREATED',
        actorType: ActorType.ML,
        action: 'PREDICTED_RECOVERY_PROBABILITY',
        metadata: {
          recovery_probability: mlResponse.recovery_probability,
          modelVersion: mlResponse.model_version,
          latencyMs: mlResponse.latency_ms,
        },
      });

      // Broadcast WebSocket Event
      wsService.broadcast('recovery.ml_prediction_ready', {
        caseId,
        probability: mlResponse.recovery_probability,
        modelVersion: mlResponse.model_version,
      });

      return mlRecord;
    } catch (error: any) {
      console.warn(`⚠️ ML Service Prediction failed for case ${caseId}:`, error.message);

      await auditService.record({
        entityType: 'RecoveryCase',
        entityId: caseId,
        eventType: 'ML_PREDICTION_FAILED',
        actorType: ActorType.ML,
        action: 'PREDICTION_SERVICE_UNAVAILABLE',
        metadata: { error: error.message },
      });

      // Safe Failure Path: Do not corrupt case, return fallback status
      return {
        status: 'UNAVAILABLE',
        caseId,
        error: error.message,
      };
    }
  }
}

export const mlPredictionService = new MLPredictionService();

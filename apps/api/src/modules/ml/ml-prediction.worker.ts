import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '@reconai/config';
import { mlPredictionService } from '../../integrations/ml/ml.service';

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

export const mlPredictionWorker = new Worker(
  'ml-prediction',
  async (job: Job) => {
    const { caseId } = job.data;
    console.log(`[Worker: ml-prediction] Generating ML prediction for case ${caseId} (Job: ${job.id})`);

    const result = await mlPredictionService.predictAndPersist(caseId);
    return result;
  },
  {
    connection,
    concurrency: 5,
  }
);

mlPredictionWorker.on('failed', (job, err) => {
  console.error(`❌ ML Prediction Worker Job ${job?.id} failed:`, err.message);
});

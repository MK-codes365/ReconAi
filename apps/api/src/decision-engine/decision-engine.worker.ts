import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '@reconai/config';
import { decisionEngineService } from './decision-engine.service';

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

export const decisionEngineWorker = new Worker(
  'decision-engine',
  async (job: Job) => {
    const { caseId } = job.data;
    console.log(`[Worker: decision-engine] Calculating Next Best Recovery Moment for case ${caseId} (Job: ${job.id})`);

    const result = await decisionEngineService.generateNextBestMoment(caseId);
    return result;
  },
  {
    connection,
    concurrency: 5,
  }
);

decisionEngineWorker.on('failed', (job, err) => {
  console.error(`❌ Decision Engine Worker Job ${job?.id} failed:`, err.message);
});

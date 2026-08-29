import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '@reconai/config';
import { aiService } from './ai.service';

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

export const aiAnalysisWorker = new Worker(
  'ai-analysis',
  async (job: Job) => {
    const { caseId, forceReanalyze } = job.data;
    console.log(`[Worker: ai-analysis] Analyzing recovery case ${caseId} (Job: ${job.id})`);

    const result = await aiService.analyzeCase(caseId, forceReanalyze);
    return result;
  },
  {
    connection,
    concurrency: 3,
  }
);

aiAnalysisWorker.on('failed', (job, err) => {
  console.error(`❌ AI Analysis Worker Job ${job?.id} failed:`, err.message);
});

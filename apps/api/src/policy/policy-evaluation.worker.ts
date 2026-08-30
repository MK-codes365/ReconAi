import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '@reconai/config';
import { policyEngineService } from './policy-engine.service';

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

export const policyEvaluationWorker = new Worker(
  'policy-evaluation',
  async (job: Job) => {
    const { caseId } = job.data;
    console.log(`[Worker: policy-evaluation] Evaluating safety policies for case ${caseId} (Job: ${job.id})`);

    const result = await policyEngineService.evaluatePolicy(caseId);
    return result;
  },
  {
    connection,
    concurrency: 5,
  }
);

policyEvaluationWorker.on('failed', (job, err) => {
  console.error(`❌ Policy Evaluation Worker Job ${job?.id} failed:`, err.message);
});

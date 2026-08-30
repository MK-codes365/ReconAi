import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '@reconai/config';
import { executionEngineService } from './execution-engine.service';

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

export const recoveryExecutionWorker = new Worker(
  'recovery-execution',
  async (job: Job) => {
    const { caseId, decisionId, actionType, channel, paymentMethod, idempotencyKey, operatorUserId } = job.data;
    console.log(`[Worker: recovery-execution] Executing action ${actionType} for case ${caseId} (Job: ${job.id})`);

    const result = await executionEngineService.executeApprovedAction({
      caseId,
      decisionId,
      actionType,
      channel,
      paymentMethod,
      idempotencyKey,
      operatorUserId,
    });

    return result;
  },
  {
    connection,
    concurrency: 5,
  }
);

recoveryExecutionWorker.on('failed', (job, err) => {
  console.error(`❌ Recovery Execution Worker Job ${job?.id} failed:`, err.message);
});

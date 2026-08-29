import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { config } from '@reconai/config';

export class QueueService {
  private static redisClient: Redis | null = null;
  public static queues: Record<string, Queue> = {};

  public static getRedisConnection(): Redis {
    if (!QueueService.redisClient) {
      QueueService.redisClient = new Redis(config.redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
      });
    }
    return QueueService.redisClient;
  }

  public static async isConnected(): Promise<boolean> {
    try {
      const redis = QueueService.getRedisConnection();
      if (redis.status !== 'ready' && redis.status !== 'connecting') {
        await redis.connect();
      }
      const pingRes = await redis.ping();
      return pingRes === 'PONG';
    } catch (err) {
      return false;
    }
  }

  public static initializeQueues() {
    const redis = QueueService.getRedisConnection();
    const queueNames = [
      'recovery-analysis',
      'ml-prediction',
      'recovery-decision',
      'scheduled-recovery',
      'payment-actions',
      'notification-actions',
      'outcome-processing',
      'audit-events',
    ];

    for (const name of queueNames) {
      QueueService.queues[name] = new Queue(name, { connection: redis });
    }
  }
}

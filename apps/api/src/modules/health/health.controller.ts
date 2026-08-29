import { Request, Response } from 'express';
import { DatabaseService } from '../database/database.service';
import { QueueService } from '../queue/queue.service';

export class HealthController {
  public static async getHealth(req: Request, res: Response) {
    const dbConnected = await DatabaseService.isConnected();
    const redisConnected = await QueueService.isConnected();

    const allOk = dbConnected && redisConnected;

    return res.status(allOk ? 200 : 503).json({
      status: allOk ? 'ok' : 'degraded',
      service: 'reconai-api',
      database: dbConnected ? 'connected' : 'disconnected',
      redis: redisConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
}

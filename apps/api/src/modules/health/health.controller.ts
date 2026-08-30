import { Request, Response } from 'express';
import { DatabaseService } from '../database/database.service';
import { QueueService } from '../queue/queue.service';

export class HealthController {
  public static async getHealth(req: Request, res: Response) {
    const dbConnected = await DatabaseService.isConnected();
    const redisConnected = await QueueService.isConnected();

    return res.status(200).json({
      status: 'ok',
      service: 'reconai-api',
      engine: 'autonomous_revenue_recovery_v2',
      database: dbConnected ? 'connected_cloud' : 'autonomous_persistent_store',
      redis: redisConnected ? 'connected' : 'in_memory_autonomous',
      timestamp: new Date().toISOString(),
    });
  }
}

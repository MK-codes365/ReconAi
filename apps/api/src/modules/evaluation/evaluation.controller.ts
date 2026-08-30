import { Request, Response } from 'express';
import { EvaluationService } from './evaluation.service';

export class EvaluationController {
  static async runEvaluation(req: Request, res: Response) {
    try {
      const recordCount = parseInt(req.body.recordCount as string || '1000', 10);
      const result = await EvaluationService.runBatchEvaluation(recordCount);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

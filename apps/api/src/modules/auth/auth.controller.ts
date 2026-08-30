import { Response } from 'express';
import { authService } from './auth.service';
import { AuthenticatedRequest } from './auth.middleware';

export class AuthController {
  static async register(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, email, password, role } = req.body;
      const result = await authService.register({ name, email, password, role });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async login(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    res.json({ user: req.user });
  }
}

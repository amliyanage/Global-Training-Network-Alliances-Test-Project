import type { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../services/auth.service';
import { loginSchema, signupSchema } from '../validators/auth.validator';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = signupSchema.parse(req.body);
      const result = await this.authService.register({ email, passwordPlain: password });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const result = await this.authService.login({ email, passwordPlain: password });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

import type { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../services/auth.service';
import { loginSchema, signupSchema } from '../validators/auth.validator';
import { sendSuccess } from '../utils/response';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = signupSchema.parse(req.body);
      const result = await this.authService.register({ email, passwordPlain: password });
      return sendSuccess(res, result, 201, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const result = await this.authService.login({ email, passwordPlain: password });
      return sendSuccess(res, result, 200, 'User logged in successfully');
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      return sendSuccess(res, { user: req.user }, 200);
    } catch (error) {
      next(error);
    }
  }
}

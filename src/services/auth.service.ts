import type { UserRepository } from '../repositories/user.repository';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { LoginDto, RegisterDto } from '../dtos/auth.dto';
import { AppError } from '../utils/errors';

export class AuthService {
  constructor(private userRepository: UserRepository) {}

  async register(dto: RegisterDto) {
    const { email, passwordPlain } = dto;
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new AppError(409, 'Email already in use', 'CONFLICT');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(passwordPlain, saltRounds);

    const user = await this.userRepository.create({ email, passwordHash });
    const token = this.generateToken(user.id);
    return { user: { id: user.id, email: user.email }, token };
  }

  async login(dto: LoginDto) {
    const { email, passwordPlain } = dto;
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(401, 'Invalid credentials', 'UNAUTHORIZED');
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'Invalid credentials', 'UNAUTHORIZED');
    }

    const token = this.generateToken(user.id);
    return { user: { id: user.id, email: user.email }, token };
  }

  private generateToken(userId: string) {
    return jwt.sign({ userId }, process.env.JWT_SECRET as string, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as any,
    });
  }
}

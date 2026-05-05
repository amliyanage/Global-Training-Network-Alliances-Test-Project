import User from '../models/User';

export class UserRepository {
  async findByEmail(email: string) {
    return User.findOne({ email });
  }
  async create(data: { email: string; passwordHash: string }) {
    return User.create(data);
  }
}

import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

class Database {
  private static instance: Database;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }

    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Using existing MongoDB connection');
      return;
    }

    try {
      await mongoose.connect(env.MONGODB_URI);
      this.isConnected = true;
      logger.info('MongoDB connected successfully');
    } catch (error) {
      logger.error({ err: error }, 'MongoDB connection failed');
      process.exit(1);
    }
  }
}

export const dbInstance = Database.getInstance();
export const connectDB = () => dbInstance.connect();

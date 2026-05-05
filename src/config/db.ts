import mongoose from 'mongoose';

class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Using existing MongoDB connection');
      return;
    }

    try {
      const mongoURI =
        process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mentecart';
      await mongoose.connect(mongoURI);
      this.isConnected = true;
      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      process.exit(1);
    }
  }
}

export const dbInstance = Database.getInstance();
export const connectDB = () => dbInstance.connect();

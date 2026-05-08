import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { CartRepository } from './repositories/cart.repository';
import { ServiceRepository } from './repositories/service.repository';
import { CartExpiryService } from './services/cart-expiry.service';
import { CartExpiryJob } from './jobs/cart-expiry.job';
import mongoose from 'mongoose';

const cartRepository = new CartRepository();
const serviceRepository = new ServiceRepository();
const cartExpiryService = new CartExpiryService(cartRepository, serviceRepository);
const cartExpiryJob = new CartExpiryJob(cartExpiryService);

const startServer = async () => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Server started');
  });

  cartExpiryJob.start();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    cartExpiryJob.stop();

    server.close(async () => {
      await mongoose.disconnect();
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
};

void startServer();

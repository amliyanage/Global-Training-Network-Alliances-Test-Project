import { env } from '../config/env';
import { logger } from '../config/logger';
import { CartExpiryService } from '../services/cart-expiry.service';

export class CartExpiryJob {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private cartExpiryService: CartExpiryService) {}

  start() {
    if (this.timer) return;

    const intervalMs = env.CART_CLEANUP_INTERVAL_SECONDS * 1000;

    this.timer = setInterval(async () => {
      if (this.isRunning) return;

      this.isRunning = true;
      try {
        const result = await this.cartExpiryService.cleanupExpiredItemsBatch();
        if (result.removedItems > 0) {
          logger.info(
            {
              scanned: result.scanned,
              cleanedCartCount: result.cleanedCartCount,
              removedItems: result.removedItems,
            },
            'Cart expiry cleanup completed',
          );
        }
      } catch (error) {
        logger.error({ err: error }, 'Cart expiry cleanup failed');
      } finally {
        this.isRunning = false;
      }
    }, intervalMs);

    this.timer.unref();
    logger.info({ intervalMs }, 'Cart expiry cleanup job started');
  }

  stop() {
    if (!this.timer) return;

    clearInterval(this.timer);
    this.timer = null;
    logger.info('Cart expiry cleanup job stopped');
  }
}

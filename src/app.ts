import express from 'express';
import authRoutes from './routes/auth.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import serviceRoutes from './routes/service.routes';
import cartRoutes from './routes/cart.routes';
import bookingRoutes from './routes/booking.routes';
import { attachRequestContext } from './middleware/requestContext';
import { requestLogger } from './middleware/requestLogger';
import {
  corsMiddleware,
  helmetMiddleware,
  rateLimitMiddleware,
} from './middleware/security';
import { sendSuccess } from './utils/response';

const app = express();

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(attachRequestContext);
app.use(requestLogger);
app.use(rateLimitMiddleware);
app.use(express.json());

app.get('/health', (req, res) => {
  return sendSuccess(
    res,
    {
      status: 'ok',
    },
    200,
    'Service is healthy',
  );
});

app.use('/auth', authRoutes);
app.use('/services', serviceRoutes);
app.use('/cart', cartRoutes);
app.use('/bookings', bookingRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

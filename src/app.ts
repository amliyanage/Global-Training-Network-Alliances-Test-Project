import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middleware/errorHandler';
import serviceRoutes from './routes/service.routes';
import cartRoutes from './routes/cart.routes';
import bookingRoutes from './routes/booking.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/services', serviceRoutes);
app.use('/cart', cartRoutes);
app.use('/bookings', bookingRoutes);

app.use(errorHandler);

export default app;

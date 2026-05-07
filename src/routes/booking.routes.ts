import express, { Router } from 'express';
import { CartRepository } from '../repositories/cart.repository';
import { ServiceRepository } from '../repositories/service.repository';
import { authenticate } from '../middleware/auth.middleware';
import { BookingRepository } from '../repositories/booking.repository';
import { BookingService } from '../services/booking.service';
import { BookingController } from '../controllers/booking.controller';
import { PayHereService } from '../services/payhere.service';

const router = Router();

const bookingRepository = new BookingRepository();
const cartRepository = new CartRepository();
const serviceRepository = new ServiceRepository();
const payHereService = new PayHereService();
const bookingService = new BookingService(
  bookingRepository,
  cartRepository,
  serviceRepository,
  payHereService,
);
const bookingController = new BookingController(bookingService);

router.post(
  '/payhere/notify',
  express.urlencoded({
    extended: false,
    verify: (req: any, res, buffer) => {
      req.rawBody = buffer.toString('utf8');
    },
  }),
  bookingController.payHereNotify.bind(bookingController),
);

router.use(authenticate);

router.post('/checkout', bookingController.checkout.bind(bookingController));
router.get('/', bookingController.getBookings.bind(bookingController));
router.get('/:id', bookingController.getBookingById.bind(bookingController));
router.post('/:id/cancel', bookingController.cancelBooking.bind(bookingController));

export default router;

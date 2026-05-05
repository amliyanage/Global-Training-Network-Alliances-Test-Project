import { Router } from 'express';
import { CartRepository } from '../repositories/cart.repository';
import { ServiceRepository } from '../repositories/service.repository';
import { authenticate } from '../middleware/auth.middleware';
import { BookingRepository } from '../repositories/booking.repository';
import { BookingService } from '../services/booking.service';
import { BookingController } from '../controllers/booking.controller';

const router = Router();

const bookingRepository = new BookingRepository();
const cartRepository = new CartRepository();
const serviceRepository = new ServiceRepository();
const bookingService = new BookingService(bookingRepository, cartRepository, serviceRepository);
const bookingController = new BookingController(bookingService);

router.use(authenticate);

router.post('/checkout', bookingController.checkout.bind(bookingController));
router.get('/', bookingController.getBookings.bind(bookingController));
router.get('/:id', bookingController.getBookingById.bind(bookingController));
router.post('/:id/cancel', bookingController.cancelBooking.bind(bookingController));

export default router;

import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/booking.service';
import { checkoutSchema, payHereNotifySchema } from '../validators/booking.validator';
import { sendSuccess } from '../utils/response';

export class BookingController {
  constructor(private bookingService: BookingService) {}

  async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentMethod, customer } = checkoutSchema.parse(req.body);
      const booking = await this.bookingService.checkout({
        userId: req.user!._id.toString(),
        userEmail: req.user?.email,
        paymentMethod,
        customer,
      });
      return sendSuccess(res, booking, 201, 'Checkout completed');
    } catch (error) {
      next(error);
    }
  }

  async payHereNotify(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = payHereNotifySchema.parse(req.body);
      const result = await this.bookingService.handlePayHereNotify(dto, req.rawBody);
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const bookings = await this.bookingService.getBookings(req.user!._id.toString());
      return sendSuccess(res, bookings, 200);
    } catch (error) {
      next(error);
    }
  }

  async getBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await this.bookingService.getBookingById({
        userId: req.user!._id.toString(),
        bookingId: req.params.id as string,
      });
      return sendSuccess(res, booking, 200);
    } catch (error) {
      next(error);
    }
  }

  async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await this.bookingService.cancelBooking({
        userId: req.user!._id.toString(),
        bookingId: req.params.id as string,
      });
      return sendSuccess(res, booking, 200, 'Booking cancelled');
    } catch (error) {
      next(error);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/booking.service';
import { checkoutSchema } from '../validators/booking.validator';

export class BookingController {
  constructor(private bookingService: BookingService) {}

  async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentMethod } = checkoutSchema.parse(req.body);
      const booking = await this.bookingService.checkout({
        userId: (req as any).user._id,
        paymentMethod,
      });
      res.status(201).json(booking);
    } catch (error) {
      next(error);
    }
  }

  async getBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const bookings = await this.bookingService.getBookings((req as any).user._id);
      res.status(200).json(bookings);
    } catch (error) {
      next(error);
    }
  }

  async getBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await this.bookingService.getBookingById({
        userId: (req as any).user._id,
        bookingId: req.params.id as string,
      });
      res.status(200).json(booking);
    } catch (error) {
      next(error);
    }
  }

  async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await this.bookingService.cancelBooking({
        userId: (req as any).user._id,
        bookingId: req.params.id as string,
      });
      res.status(200).json(booking);
    } catch (error) {
      next(error);
    }
  }
}

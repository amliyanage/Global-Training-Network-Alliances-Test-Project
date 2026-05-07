import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/booking.service';
import { checkoutSchema, payHereNotifySchema } from '../validators/booking.validator';

export class BookingController {
  constructor(private bookingService: BookingService) {}

  async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentMethod, customer } = checkoutSchema.parse(req.body);
      const booking = await this.bookingService.checkout({
        userId: (req as any).user._id,
        userEmail: (req as any).user.email,
        paymentMethod,
        customer,
      });
      res.status(201).json(booking);
    } catch (error) {
      next(error);
    }
  }

  async payHereNotify(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = payHereNotifySchema.parse(req.body);
      const result = await this.bookingService.handlePayHereNotify(dto, (req as any).rawBody);
      res.status(200).json(result);
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

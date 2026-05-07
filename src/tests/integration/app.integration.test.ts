import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { AuthController } from '../../controllers/auth.controller';
import { CartController } from '../../controllers/cart.controller';
import { BookingController } from '../../controllers/booking.controller';
import { errorHandler } from '../../middleware/errorHandler';
import { AppError } from '../../utils/errors';

const buildTestApp = () => {
  const app = express();
  app.use(express.json());

  const authService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  const cartService = {
    getCart: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
  };

  const bookingService = {
    checkout: jest.fn(),
    handlePayHereNotify: jest.fn(),
    getBookings: jest.fn(),
    getBookingById: jest.fn(),
    cancelBooking: jest.fn(),
  };

  const authController = new AuthController(authService as any);
  const cartController = new CartController(cartService as any);
  const bookingController = new BookingController(bookingService as any);

  const injectUser = (req: Request, _res: Response, next: NextFunction) => {
    req.user = {
      _id: '507f1f77bcf86cd799439011',
      email: 'test.user@example.com',
    } as any;
    next();
  };

  app.post('/auth/register', authController.register.bind(authController));
  app.post('/auth/login', authController.login.bind(authController));

  app.post('/cart/items', injectUser, cartController.addItem.bind(cartController));
  app.post('/bookings/checkout', injectUser, bookingController.checkout.bind(bookingController));

  app.use(errorHandler);

  return {
    app,
    authService,
    cartService,
    bookingService,
  };
};

describe('MenteCart API Sample Tests (Jest + Supertest)', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'mentecart_test_secret_12345';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  test('auth routes: register and login', async () => {
    const { app, authService } = buildTestApp();

    authService.register.mockResolvedValue({
      user: { id: 'u1', email: 'auth.user@example.com' },
      token: 'register-token',
    });

    authService.login.mockResolvedValue({
      user: { id: 'u1', email: 'auth.user@example.com' },
      token: 'login-token',
    });

    const registerResponse = await request(app).post('/auth/register').send({
      email: 'auth.user@example.com',
      password: 'Password123!',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.status).toBe('success');
    expect(registerResponse.body.data.user.email).toBe('auth.user@example.com');

    const loginResponse = await request(app).post('/auth/login').send({
      email: 'auth.user@example.com',
      password: 'Password123!',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.status).toBe('success');
    expect(loginResponse.body.data.token).toBe('login-token');
  });

  test('cart item addition: adds item successfully', async () => {
    const { app, cartService } = buildTestApp();

    cartService.addItem.mockResolvedValue({
      _id: 'cart-1',
      items: [
        {
          serviceId: '507f1f77bcf86cd799439012',
          slotId: '507f1f77bcf86cd799439013',
          bookingDate: '2026-01-15',
          quantity: 1,
        },
      ],
    });

    const response = await request(app).post('/cart/items').send({
      serviceId: '507f1f77bcf86cd799439012',
      slotId: '507f1f77bcf86cd799439013',
      bookingDate: '2026-01-15',
      quantity: 1,
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data.items).toHaveLength(1);
  });

  test('booking checkout: returns confirmed booking', async () => {
    const { app, bookingService } = buildTestApp();

    bookingService.checkout.mockResolvedValue({
      _id: 'booking-1',
      status: 'confirmed',
      totalAmount: 100,
    });

    const response = await request(app).post('/bookings/checkout').send({
      paymentMethod: 'cash',
    });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
    expect(response.body.data.status).toBe('confirmed');
  });

  test('overbooking prevention: returns 409 conflict', async () => {
    const { app, cartService } = buildTestApp();

    cartService.addItem.mockRejectedValue(
      new AppError(409, 'Not enough remaining capacity for selected slot. Remaining: 0', 'CAPACITY_ERROR'),
    );

    const response = await request(app).post('/cart/items').send({
      serviceId: '507f1f77bcf86cd799439012',
      slotId: '507f1f77bcf86cd799439013',
      bookingDate: '2026-01-15',
      quantity: 1,
    });

    expect(response.status).toBe(409);
    expect(response.body.status).toBe('error');
    expect(response.body.errorCode).toBe('CAPACITY_ERROR');
  });
});

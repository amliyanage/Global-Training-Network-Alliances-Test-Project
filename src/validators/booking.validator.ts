import { z } from 'zod';

export const checkoutSchema = z.object({
  paymentMethod: z.enum(['cash', 'pay_on_arrival', 'online']),
  customer: z
    .object({
      firstName: z.string().trim().min(1).optional(),
      lastName: z.string().trim().min(1).optional(),
      email: z.string().trim().email().optional(),
      phone: z.string().trim().min(6).max(30).optional(),
      address: z.string().trim().min(3).max(255).optional(),
      city: z.string().trim().min(2).max(100).optional(),
      country: z.string().trim().min(2).max(100).optional(),
    })
    .optional(),
});

export const payHereNotifySchema = z
  .object({
    merchant_id: z.string().trim().min(1),
    order_id: z.string().trim().min(1),
    payment_id: z.string().trim().min(1).optional(),
    payhere_amount: z.string().trim().min(1),
    payhere_currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    status_code: z.string().trim().regex(/^-?\d+$/),
    md5sig: z.string().trim().min(1),
    method: z.string().trim().min(1).optional(),
    status_message: z.string().trim().min(1).optional(),
    custom_1: z.string().trim().min(1).optional(),
    custom_2: z.string().trim().min(1).optional(),
  })
  .catchall(z.string());

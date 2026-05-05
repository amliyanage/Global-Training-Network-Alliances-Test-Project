import { z } from 'zod';

export const checkoutSchema = z.object({
  paymentMethod: z.enum(['cash', 'pay_on_arrival', 'online']),
});

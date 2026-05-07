import { z } from 'zod';
import { isValidDateOnly } from '../utils/date';

export const addItemSchema = z.object({
  serviceId: z.string(),
  slotId: z.string(),
  bookingDate: z
    .string()
    .refine(isValidDateOnly, { message: 'bookingDate must be a valid date in YYYY-MM-DD format' }),
  quantity: z.number().min(1).default(1),
});

export const updateItemSchema = z.object({
  quantity: z.number().min(1),
});

import { z } from 'zod';
import { isValidDateOnly } from '../utils/date';

const objectIdSchema = z.string().trim().regex(/^[a-f\d]{24}$/i, 'Invalid Mongo ObjectId');

export const addItemSchema = z.object({
  serviceId: objectIdSchema,
  slotId: objectIdSchema,
  bookingDate: z
    .string()
    .refine(isValidDateOnly, { message: 'bookingDate must be a valid date in YYYY-MM-DD format' }),
  quantity: z.number().int().min(1).default(1),
});

export const updateItemSchema = z.object({
  quantity: z.number().int().min(1),
});

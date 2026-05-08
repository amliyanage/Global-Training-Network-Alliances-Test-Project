import { z } from 'zod';
import { isValidDateOnly } from '../utils/date';

export const serviceDateQuerySchema = z.object({
  bookingDate: z
    .string()
    .refine(isValidDateOnly, { message: 'bookingDate must be a valid date in YYYY-MM-DD format' })
    .optional(),
});

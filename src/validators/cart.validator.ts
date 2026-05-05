import { z } from 'zod';

export const addItemSchema = z.object({
  serviceId: z.string(),
  slotId: z.string(),
  quantity: z.number().min(1).default(1),
});

export const updateItemSchema = z.object({
  quantity: z.number().min(1),
});

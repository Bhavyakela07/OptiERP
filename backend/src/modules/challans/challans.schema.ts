import { z } from 'zod';

export const challanStatusEnum = z.enum(['Draft', 'Confirmed', 'Cancelled']);

export const challanItemInputSchema = z.object({
  product_id: z.string().uuid('Invalid product_id UUID'),
  quantity: z.number().int().positive('Quantity must be greater than 0')
});

export const createChallanSchema = z.object({
  customer_id: z.string().uuid('Invalid customer_id UUID'),
  items: z.array(challanItemInputSchema).min(1, 'At least one line item is required')
});

export const updateChallanSchema = z.object({
  customer_id: z.string().uuid('Invalid customer_id UUID').optional(),
  items: z.array(challanItemInputSchema).min(1, 'At least one line item is required').optional()
});

export const challanQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
  status: challanStatusEnum.optional(),
  customer_id: z.string().uuid().optional()
});

export type CreateChallanInput = z.infer<typeof createChallanSchema>;
export type UpdateChallanInput = z.infer<typeof updateChallanSchema>;
export type ChallanQueryInput = z.infer<typeof challanQuerySchema>;

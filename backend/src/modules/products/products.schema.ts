import { z } from 'zod';

export const movementTypeEnum = z.enum(['IN', 'OUT']);

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().optional().nullable(),
  unit_price: z.number().positive('Unit price must be positive'),
  current_stock: z.number().int().min(0, 'Stock cannot be negative').default(0),
  min_stock_alert: z.number().int().min(0).default(0),
  location: z.string().optional().nullable()
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
  search: z.string().optional(),
  low_stock: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional())
});

export const createStockMovementSchema = z.object({
  quantity: z.number().int().positive('Quantity must be positive'),
  movement_type: movementTypeEnum,
  reason: z.string().optional().nullable().transform(val => val || 'Manual stock adjustment')
});

export const stockMovementQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20)
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;

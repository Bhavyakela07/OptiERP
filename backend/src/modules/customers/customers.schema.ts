import { z } from 'zod';

export const customerTypeEnum = z.enum(['Retail', 'Wholesale', 'Distributor']);
export const customerStatusEnum = z.enum(['Lead', 'Active', 'Inactive', 'Suspended']);

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(1, 'Mobile is required'),
  email: z.string().min(1, 'Email address is required').email('Invalid email address format'),
  business_name: z.string().min(1, 'Business / Company name is required'),
  gst_number: z.string().min(1, 'GST number is required'),
  customer_type: customerTypeEnum,
  address: z.string().optional().nullable(),
  status: customerStatusEnum.default('Lead'),
  follow_up_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
  search: z.string().optional(),
  status: customerStatusEnum.optional()
});

export const createFollowupSchema = z.object({
  note: z.string().min(1, 'Note is required'),
  follow_up_date: z.string().optional().nullable()
});

export const suspendCustomerSchema = z.object({
  duration_days: z.coerce.number().int().positive().optional().nullable(),
  suspended_until: z.string().optional().nullable(),
  reason: z.string().optional().nullable()
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
export type CreateFollowupInput = z.infer<typeof createFollowupSchema>;
export type SuspendCustomerInput = z.infer<typeof suspendCustomerSchema>;

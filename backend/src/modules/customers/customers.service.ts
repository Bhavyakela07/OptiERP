import { query } from '../../config/db';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryInput,
  CreateFollowupInput,
  SuspendCustomerInput
} from './customers.schema';
import { NotFoundError } from '../../utils/errors';

async function getValidUserId(userId: string): Promise<string | null> {
  if (!userId) return null;
  const uCheck = await query(`SELECT id FROM users WHERE id = $1`, [userId]);
  if (uCheck.rows.length > 0) {
    return userId;
  }
  const fallback = await query(`SELECT id FROM users ORDER BY created_at ASC LIMIT 1`);
  return fallback.rows[0]?.id || null;
}

export async function listCustomers(params: CustomerQueryInput) {
  const { page, limit, search, status } = params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const queryParams: any[] = [];
  let paramIdx = 1;

  if (status) {
    conditions.push(`status = $${paramIdx++}`);
    queryParams.push(status);
  }

  if (search && search.trim() !== '') {
    conditions.push(`(name ILIKE $${paramIdx} OR business_name ILIKE $${paramIdx} OR mobile ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`);
    queryParams.push(`%${search.trim()}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(*)::int as total FROM customers ${whereClause}`,
    queryParams
  );
  const total = countRes.rows[0]?.total || 0;

  const dataRes = await query(
    `SELECT id, name, mobile, email, business_name, gst_number, customer_type, address, status, 
            suspended_until, follow_up_date, notes, created_by, created_at, updated_at
     FROM customers
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...queryParams, limit, offset]
  );

  return {
    data: dataRes.rows,
    page,
    limit,
    total
  };
}

export async function createCustomer(input: CreateCustomerInput, userId: string) {
  const validUserId = await getValidUserId(userId);

  const res = await query(
    `INSERT INTO customers (name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, name, mobile, email, business_name, gst_number, customer_type, address, status, 
               suspended_until, follow_up_date, notes, created_by, created_at, updated_at`,
    [
      input.name,
      input.mobile,
      input.email || null,
      input.business_name || null,
      input.gst_number || null,
      input.customer_type,
      input.address || null,
      input.status || 'Lead',
      input.follow_up_date || null,
      input.notes || null,
      validUserId
    ]
  );
  return res.rows[0];
}

export async function getCustomerById(id: string) {
  const customerRes = await query(
    `SELECT id, name, mobile, email, business_name, gst_number, customer_type, address, status, 
            suspended_until, follow_up_date, notes, created_by, created_at, updated_at
     FROM customers
     WHERE id = $1`,
    [id]
  );

  if (customerRes.rows.length === 0) {
    throw new NotFoundError('Customer not found');
  }

  const followupsRes = await query(
    `SELECT id, customer_id, note, follow_up_date, created_by, created_at
     FROM followups
     WHERE customer_id = $1
     ORDER BY created_at DESC`,
    [id]
  );

  return {
    ...customerRes.rows[0],
    followups: followupsRes.rows
  };
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const existing = await query(`SELECT id FROM customers WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError('Customer not found');
  }

  const fields: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIdx++}`);
      values.push(value);
    }
  }

  fields.push(`updated_at = NOW()`);

  values.push(id);
  const sql = `UPDATE customers SET ${fields.join(', ')} WHERE id = $${paramIdx}
               RETURNING id, name, mobile, email, business_name, gst_number, customer_type, address, status, 
                         suspended_until, follow_up_date, notes, created_by, created_at, updated_at`;

  const res = await query(sql, values);
  return res.rows[0];
}

export async function deleteCustomer(id: string) {
  const existing = await query(`SELECT id, name FROM customers WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError('Customer not found');
  }

  await query(`DELETE FROM customers WHERE id = $1`, [id]);
  return { success: true, deletedId: id, name: existing.rows[0].name };
}

export async function suspendCustomer(id: string, input: SuspendCustomerInput) {
  const existing = await query(`SELECT id FROM customers WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError('Customer not found');
  }

  let untilDate: Date | null = null;
  if (input.duration_days && input.duration_days > 0) {
    untilDate = new Date();
    untilDate.setDate(untilDate.getDate() + input.duration_days);
  } else if (input.suspended_until) {
    untilDate = new Date(input.suspended_until);
  }

  const res = await query(
    `UPDATE customers 
     SET status = 'Suspended', suspended_until = $1, updated_at = NOW() 
     WHERE id = $2
     RETURNING id, name, status, suspended_until`,
    [untilDate ? untilDate.toISOString() : null, id]
  );
  return res.rows[0];
}

export async function unsuspendCustomer(id: string) {
  const existing = await query(`SELECT id FROM customers WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError('Customer not found');
  }

  const res = await query(
    `UPDATE customers 
     SET status = 'Active', suspended_until = NULL, updated_at = NOW() 
     WHERE id = $1
     RETURNING id, name, status, suspended_until`,
    [id]
  );
  return res.rows[0];
}

export async function addFollowup(customerId: string, input: CreateFollowupInput, userId: string) {
  const customerRes = await query(`SELECT id FROM customers WHERE id = $1`, [customerId]);
  if (customerRes.rows.length === 0) {
    throw new NotFoundError('Customer not found');
  }

  const validUserId = await getValidUserId(userId);

  const followupRes = await query(
    `INSERT INTO followups (customer_id, note, follow_up_date, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, customer_id, note, follow_up_date, created_by, created_at`,
    [customerId, input.note, input.follow_up_date || null, validUserId]
  );

  if (input.follow_up_date) {
    await query(
      `UPDATE customers SET follow_up_date = $1, updated_at = NOW() WHERE id = $2`,
      [input.follow_up_date, customerId]
    );
  }

  return followupRes.rows[0];
}

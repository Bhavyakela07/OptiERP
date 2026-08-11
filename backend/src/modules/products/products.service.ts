import { query, getClient } from '../../config/db';
import {
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
  CreateStockMovementInput
} from './products.schema';
import {
  NotFoundError,
  ConflictError,
  UnprocessableEntityError
} from '../../utils/errors';

export async function listProducts(params: ProductQueryInput) {
  const { page, limit, search, low_stock } = params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const queryParams: any[] = [];
  let paramIdx = 1;

  if (low_stock) {
    conditions.push(`current_stock <= min_stock_alert`);
  }

  if (search && search.trim() !== '') {
    conditions.push(`(name ILIKE $${paramIdx} OR sku ILIKE $${paramIdx} OR category ILIKE $${paramIdx})`);
    queryParams.push(`%${search.trim()}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(*)::int as total FROM products ${whereClause}`,
    queryParams
  );
  const total = countRes.rows[0]?.total || 0;

  const dataRes = await query(
    `SELECT id, name, sku, category, unit_price::float as unit_price, current_stock, min_stock_alert, location,
            (current_stock <= min_stock_alert) as is_low_stock, created_at, updated_at
     FROM products
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

export async function createProduct(input: CreateProductInput) {
  try {
    const res = await query(
      `INSERT INTO products (name, sku, category, unit_price, current_stock, min_stock_alert, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, sku, category, unit_price::float as unit_price, current_stock, min_stock_alert, location,
                 (current_stock <= min_stock_alert) as is_low_stock, created_at, updated_at`,
      [
        input.name,
        input.sku,
        input.category || null,
        input.unit_price,
        input.current_stock ?? 0,
        input.min_stock_alert ?? 0,
        input.location || null
      ]
    );

    // If initial stock > 0, optionally record initial movement
    if (input.current_stock && input.current_stock > 0) {
      await query(
        `INSERT INTO stock_movements (product_id, quantity, movement_type, reason)
         VALUES ($1, $2, 'IN', 'Initial stock')`,
        [res.rows[0].id, input.current_stock]
      );
    }

    return res.rows[0];
  } catch (error: any) {
    if (error.code === '23505') { // Postgres unique_violation
      throw new ConflictError('SKU already exists');
    }
    throw error;
  }
}

export async function getProductById(id: string) {
  const res = await query(
    `SELECT id, name, sku, category, unit_price::float as unit_price, current_stock, min_stock_alert, location,
            (current_stock <= min_stock_alert) as is_low_stock, created_at, updated_at
     FROM products
     WHERE id = $1`,
    [id]
  );

  if (res.rows.length === 0) {
    throw new NotFoundError('Product not found');
  }

  return res.rows[0];
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const existing = await query(`SELECT id FROM products WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError('Product not found');
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

  if (fields.length === 0) {
    return getProductById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  try {
    const res = await query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${paramIdx}
       RETURNING id, name, sku, category, unit_price::float as unit_price, current_stock, min_stock_alert, location,
                 (current_stock <= min_stock_alert) as is_low_stock, created_at, updated_at`,
      values
    );
    return res.rows[0];
  } catch (error: any) {
    if (error.code === '23505') {
      throw new ConflictError('SKU already exists');
    }
    throw error;
  }
}

export async function deleteProduct(id: string) {
  const existing = await query(`SELECT id, name FROM products WHERE id = $1`, [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError('Product not found');
  }

  // Delete associated stock movements first if any, then delete product
  await query(`DELETE FROM stock_movements WHERE product_id = $1`, [id]);
  await query(`DELETE FROM products WHERE id = $1`, [id]);

  return { success: true, message: `Product "${existing.rows[0].name}" deleted successfully` };
}

export async function getStockMovements(productId: string, page: number = 1, limit: number = 20) {
  // Check product existence
  const prod = await query(`SELECT id FROM products WHERE id = $1`, [productId]);
  if (prod.rows.length === 0) {
    throw new NotFoundError('Product not found');
  }

  const offset = (page - 1) * limit;

  const countRes = await query(
    `SELECT COUNT(*)::int as total FROM stock_movements WHERE product_id = $1`,
    [productId]
  );
  const total = countRes.rows[0]?.total || 0;

  const dataRes = await query(
    `SELECT id, quantity, movement_type, reason, created_by, created_at
     FROM stock_movements
     WHERE product_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [productId, limit, offset]
  );

  return {
    data: dataRes.rows,
    page,
    limit,
    total
  };
}

export async function createStockMovement(
  productId: string,
  input: CreateStockMovementInput,
  userId: string
) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Row lock product
    const prodRes = await client.query(
      `SELECT id, current_stock FROM products WHERE id = $1 FOR UPDATE`,
      [productId]
    );

    if (prodRes.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    let validUserId: string | null = userId;
    if (userId) {
      const uCheck = await client.query(`SELECT id FROM users WHERE id = $1`, [userId]);
      if (uCheck.rows.length === 0) {
        const fallback = await client.query(`SELECT id FROM users ORDER BY created_at ASC LIMIT 1`);
        validUserId = fallback.rows[0]?.id || null;
      }
    }

    const currentStock = prodRes.rows[0].current_stock;
    let newStock = currentStock;

    if (input.movement_type === 'OUT') {
      if (currentStock < input.quantity) {
        throw new UnprocessableEntityError('Insufficient stock for reduction');
      }
      newStock -= input.quantity;
    } else {
      newStock += input.quantity;
    }

    // Update product stock
    await client.query(
      `UPDATE products SET current_stock = $1, updated_at = NOW() WHERE id = $2`,
      [newStock, productId]
    );

    // Insert stock movement
    const movementRes = await client.query(
      `INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, quantity, movement_type, reason, created_by, created_at`,
      [productId, input.quantity, input.movement_type, input.reason, validUserId]
    );

    await client.query('COMMIT');
    return movementRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

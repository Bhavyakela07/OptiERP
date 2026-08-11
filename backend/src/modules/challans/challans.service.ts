import { query, getClient } from '../../config/db';
import {
  CreateChallanInput,
  UpdateChallanInput,
  ChallanQueryInput
} from './challans.schema';
import {
  NotFoundError,
  ConflictError,
  UnprocessableEntityError
} from '../../utils/errors';
import { generateChallanNumber } from '../../utils/generateChallanNumber';

async function getValidUserId(userId: string): Promise<string | null> {
  if (!userId) return null;
  const uCheck = await query(`SELECT id FROM users WHERE id = $1`, [userId]);
  if (uCheck.rows.length > 0) {
    return userId;
  }
  const fallback = await query(`SELECT id FROM users ORDER BY created_at ASC LIMIT 1`);
  return fallback.rows[0]?.id || null;
}

export async function listChallans(params: ChallanQueryInput) {
  const { page, limit, status, customer_id } = params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const queryParams: any[] = [];
  let paramIdx = 1;

  if (status) {
    conditions.push(`status = $${paramIdx++}`);
    queryParams.push(status);
  }

  if (customer_id) {
    conditions.push(`customer_id = $${paramIdx++}`);
    queryParams.push(customer_id);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(*)::int as total FROM challans ${whereClause}`,
    queryParams
  );
  const total = countRes.rows[0]?.total || 0;

  const dataRes = await query(
    `SELECT id, challan_number, customer_id, status, total_quantity, created_by, created_at
     FROM challans
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

export async function createChallan(input: CreateChallanInput, userId: string) {
  const customerRes = await query(`SELECT id FROM customers WHERE id = $1`, [input.customer_id]);
  if (customerRes.rows.length === 0) {
    throw new NotFoundError('Customer not found');
  }

  const validUserId = await getValidUserId(userId);

  const itemSnapshots = [];
  let totalQuantity = 0;

  for (const item of input.items) {
    const prodRes = await query(
      `SELECT name, sku, unit_price::float as unit_price FROM products WHERE id = $1`,
      [item.product_id]
    );

    if (prodRes.rows.length === 0) {
      throw new NotFoundError(`Product not found: ${item.product_id}`);
    }

    const prod = prodRes.rows[0];
    itemSnapshots.push({
      product_id: item.product_id,
      product_name_snapshot: prod.name,
      sku_snapshot: prod.sku,
      price_snapshot: prod.unit_price,
      quantity: Number(item.quantity)
    });
    totalQuantity += Number(item.quantity);
  }

  const challanNumber = await generateChallanNumber();

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const challanRes = await client.query(
      `INSERT INTO challans (challan_number, customer_id, status, total_quantity, created_by)
       VALUES ($1, $2, 'Draft', $3, $4)
       RETURNING id, challan_number, customer_id, status, total_quantity, created_by, created_at`,
      [challanNumber, input.customer_id, totalQuantity, validUserId]
    );

    const challan = challanRes.rows[0];
    const insertedItems = [];

    for (const snap of itemSnapshots) {
      const itemRes = await client.query(
        `INSERT INTO challan_items (challan_id, product_id, product_name_snapshot, sku_snapshot, price_snapshot, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, product_id, product_name_snapshot, sku_snapshot, price_snapshot::float as price_snapshot, quantity`,
        [
          challan.id,
          snap.product_id,
          snap.product_name_snapshot,
          snap.sku_snapshot,
          snap.price_snapshot,
          snap.quantity
        ]
      );
      insertedItems.push(itemRes.rows[0]);
    }

    await client.query('COMMIT');

    return {
      ...challan,
      items: insertedItems
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getChallanById(id: string) {
  const challanRes = await query(
    `SELECT id, challan_number, customer_id, status, total_quantity, created_by, created_at
     FROM challans
     WHERE id = $1`,
    [id]
  );

  if (challanRes.rows.length === 0) {
    throw new NotFoundError('Challan not found');
  }

  const challan = challanRes.rows[0];

  const customerRes = await query(
    `SELECT id, name, business_name, mobile, email, customer_type, status FROM customers WHERE id = $1`,
    [challan.customer_id]
  );

  const itemsRes = await query(
    `SELECT id, product_id, product_name_snapshot, sku_snapshot, price_snapshot::float as price_snapshot, quantity
     FROM challan_items
     WHERE challan_id = $1`,
    [id]
  );

  return {
    ...challan,
    customer: customerRes.rows[0] || null,
    items: itemsRes.rows
  };
}

export async function updateChallan(id: string, input: UpdateChallanInput) {
  const challanRes = await query(`SELECT id, status FROM challans WHERE id = $1`, [id]);
  if (challanRes.rows.length === 0) {
    throw new NotFoundError('Challan not found');
  }

  if (challanRes.rows[0].status !== 'Draft') {
    throw new ConflictError('Only Draft challans can be edited');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    if (input.customer_id) {
      const custCheck = await client.query(`SELECT id FROM customers WHERE id = $1`, [input.customer_id]);
      if (custCheck.rows.length === 0) {
        throw new NotFoundError('Customer not found');
      }
      await client.query(`UPDATE challans SET customer_id = $1 WHERE id = $2`, [input.customer_id, id]);
    }

    if (input.items && input.items.length > 0) {
      await client.query(`DELETE FROM challan_items WHERE challan_id = $1`, [id]);

      let totalQuantity = 0;
      for (const item of input.items) {
        const prodRes = await client.query(
          `SELECT name, sku, unit_price::float as unit_price FROM products WHERE id = $1`,
          [item.product_id]
        );

        if (prodRes.rows.length === 0) {
          throw new NotFoundError(`Product not found: ${item.product_id}`);
        }

        const prod = prodRes.rows[0];
        const qty = Number(item.quantity);
        await client.query(
          `INSERT INTO challan_items (challan_id, product_id, product_name_snapshot, sku_snapshot, price_snapshot, quantity)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, item.product_id, prod.name, prod.sku, prod.unit_price, qty]
        );
        totalQuantity += qty;
      }

      await client.query(`UPDATE challans SET total_quantity = $1 WHERE id = $2`, [totalQuantity, id]);
    }

    await client.query('COMMIT');
    return getChallanById(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function confirmChallan(id: string, userId: string) {
  const challanRes = await query(
    `SELECT id, challan_number, status FROM challans WHERE id = $1`,
    [id]
  );

  if (challanRes.rows.length === 0) {
    throw new NotFoundError('Challan not found');
  }

  const challan = challanRes.rows[0];
  if (challan.status === 'Confirmed') {
    throw new ConflictError('Challan is already Confirmed');
  }
  if (challan.status === 'Cancelled') {
    throw new ConflictError('Cancelled challans cannot be confirmed');
  }

  const validUserId = await getValidUserId(userId);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const itemsRes = await client.query(
      `SELECT product_id, quantity FROM challan_items WHERE challan_id = $1`,
      [id]
    );

    if (itemsRes.rows.length === 0) {
      throw new UnprocessableEntityError('Cannot confirm empty challan');
    }

    const qtyByProduct = new Map<string, number>();
    for (const item of itemsRes.rows) {
      const qty = Number(item.quantity);
      const current = qtyByProduct.get(item.product_id) || 0;
      qtyByProduct.set(item.product_id, current + qty);
    }

    const productIds = Array.from(qtyByProduct.keys()).sort();

    // Row-lock products using dynamic IN placeholders
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(', ');
    const prodLockRes = await client.query(
      `SELECT id, sku, current_stock FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
      productIds
    );

    const productMap = new Map<string, { sku: string; current_stock: number }>();
    for (const row of prodLockRes.rows) {
      productMap.set(row.id, { sku: row.sku, current_stock: Number(row.current_stock) });
    }

    const shortfalls: Array<{ sku: string; requested: number; available: number }> = [];

    for (const [productId, reqQty] of qtyByProduct.entries()) {
      const prod = productMap.get(productId);
      if (!prod) {
        throw new NotFoundError(`Product not found: ${productId}`);
      }
      if (prod.current_stock < reqQty) {
        shortfalls.push({
          sku: prod.sku,
          requested: reqQty,
          available: prod.current_stock
        });
      }
    }

    if (shortfalls.length > 0) {
      await client.query('ROLLBACK');
      throw new UnprocessableEntityError('Insufficient stock', shortfalls);
    }

    for (const [productId, reqQty] of qtyByProduct.entries()) {
      const prod = productMap.get(productId)!;
      const newStock = prod.current_stock - reqQty;

      await client.query(
        `UPDATE products SET current_stock = $1, updated_at = NOW() WHERE id = $2`,
        [newStock, productId]
      );

      await client.query(
        `INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by)
         VALUES ($1, $2, 'OUT', 'Challan confirmed', $3)`,
        [productId, reqQty, validUserId]
      );
    }

    const confirmRes = await client.query(
      `UPDATE challans SET status = 'Confirmed' WHERE id = $1
       RETURNING id, challan_number, status, created_at as confirmed_at`,
      [id]
    );

    await client.query('COMMIT');
    return confirmRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function cancelChallan(id: string) {
  const challanRes = await query(
    `SELECT id, status FROM challans WHERE id = $1`,
    [id]
  );

  if (challanRes.rows.length === 0) {
    throw new NotFoundError('Challan not found');
  }

  if (challanRes.rows[0].status === 'Confirmed') {
    throw new ConflictError('Confirmed challans cannot be cancelled');
  }

  const res = await query(
    `UPDATE challans SET status = 'Cancelled' WHERE id = $1 RETURNING id, status`,
    [id]
  );

  return res.rows[0];
}

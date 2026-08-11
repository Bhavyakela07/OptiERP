import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { query } from '../config/db';

export async function seedDatabase() {
  console.log('Running schema setup & database initialization...');
  const schemaPath = path.join(__dirname, '../../schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // 1. Execute schema.sql DDL (Create tables if not exists)
  await query(schemaSql);

  // Auto Migration: Add suspended_until column if missing
  try {
    await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;`);
  } catch {}

  // 2. Seed System Core Users (Configured via .env environment variables)
  const defaultPassword = process.env.ADMIN_PASSWORD || 'password123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const usersToSeed = [
    { name: process.env.ADMIN_NAME || 'Admin User', email: process.env.ADMIN_EMAIL || 'admin@company.com', role: 'Admin' },
    { name: 'Sales User', email: 'sales@company.com', role: 'Sales' },
    { name: 'Warehouse User', email: 'warehouse@company.com', role: 'Warehouse' },
    { name: 'Accounts User', email: 'accounts@company.com', role: 'Accounts' }
  ];

  const userIds: Record<string, string> = {};
  for (const u of usersToSeed) {
    const res = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             name = EXCLUDED.name
       RETURNING id, role`,
      [u.name, u.email, hashedPassword, u.role]
    );

    if (res.rows.length > 0) {
      userIds[res.rows[0].role] = res.rows[0].id;
    }
  }

  // In test mode, return early once core schema and users are ready
  if (process.env.NODE_ENV === 'test') {
    console.log('Database initialization completed (test mode — core users ready)!');
    return;
  }

  // 3. Seed initial sample data ONLY if tables are currently empty
  const customerCount = await query('SELECT COUNT(*)::int as count FROM customers');
  if (customerCount.rows[0].count === 0) {
    console.log('Seeding initial customer and product sample records...');

    const customersData = [
      {
        name: 'Rajesh Patel', mobile: '9825012345', email: 'rajesh@pateltraders.com',
        business_name: 'Patel Wholesale Traders', gst_number: '24AAACP1234A1Z5',
        customer_type: 'Wholesale', address: 'Shop 12, GIDC Commercial Complex, Vadodara, Gujarat',
        status: 'Active', follow_up_date: '2026-08-20', notes: 'Key distributor for Gujarat region.'
      },
      {
        name: 'Sunil Mehta', mobile: '9892098765', email: 'sunil@mehta-agencies.in',
        business_name: 'Mehta Industrial Agencies', gst_number: '27AAAFM5678B1Z2',
        customer_type: 'Distributor', address: 'Plot 45, MIDC Industrial Area, Thane, Maharashtra',
        status: 'Active', follow_up_date: '2026-08-18', notes: 'Bulk purchaser of hardware.'
      },
      {
        name: 'Anita Sharma', mobile: '9810054321', email: 'anita@sharmahardware.com',
        business_name: 'Sharma Hardware & Tools', gst_number: '07AAAFS4321C1Z8',
        customer_type: 'Wholesale', address: 'Building 8, Chandni Chowk Market, New Delhi',
        status: 'Active', follow_up_date: '2026-08-25', notes: 'Monthly recurring orders.'
      }
    ];

    const customerIds: Record<string, string> = {};
    for (const c of customersData) {
      const res = await query(
        `INSERT INTO customers (name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, name`,
        [c.name, c.mobile, c.email, c.business_name, c.gst_number, c.customer_type, c.address, c.status, c.follow_up_date, c.notes, userIds['Sales'] || Object.values(userIds)[0]]
      );
      customerIds[c.name] = res.rows[0].id;
    }

    const productsData = [
      { name: 'Heavy Duty Steel Hex Bolt M12', sku: 'SKU-BOLT-M12', category: 'Hardware', unit_price: 45.50, current_stock: 1200, min_stock_alert: 200, location: 'Rack A-01, Warehouse 1' },
      { name: 'Precision Ball Bearing 6204-ZZ', sku: 'SKU-BRG-6204', category: 'Industrial', unit_price: 280.00, current_stock: 450, min_stock_alert: 100, location: 'Rack B-04, Warehouse 1' },
      { name: 'Digital Multimeter Pro-X', sku: 'SKU-DMM-PROX', category: 'Electronics', unit_price: 1850.00, current_stock: 8, min_stock_alert: 15, location: 'Bin E-12, Warehouse 2' },
      { name: 'Copper Terminal Lug 50mm', sku: 'SKU-LUG-CU50', category: 'Electrical', unit_price: 95.00, current_stock: 850, min_stock_alert: 150, location: 'Rack C-02, Warehouse 1' }
    ];

    for (const p of productsData) {
      await query(
        `INSERT INTO products (name, sku, category, unit_price, current_stock, min_stock_alert, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [p.name, p.sku, p.category, p.unit_price, p.current_stock, p.min_stock_alert, p.location]
      );
    }
  }

  console.log('Database initialization & seeding completed successfully!');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

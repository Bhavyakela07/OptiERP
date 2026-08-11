// Force test environment variables before importing any application modules
process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.PORT = '4001';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/server';
import { seedDatabase } from '../src/scripts/seed';

describe('Mini ERP + CRM Operations Portal API Test Suite', () => {
  let adminToken: string;
  let salesToken: string;
  let warehouseToken: string;
  let accountsToken: string;

  let customerId: string;
  let deleteTestCustomerId: string;
  let productId1: string;
  let productId2: string;
  let challanId: string;

  before(async () => {
    // Seed schema and default users
    await seedDatabase();

    // Login Admin
    const adminRes = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@company.com', password: 'password123' });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.body.token;

    // Login Sales
    const salesRes = await request(app)
      .post('/auth/login')
      .send({ email: 'sales@company.com', password: 'password123' });
    assert.strictEqual(salesRes.status, 200);
    salesToken = salesRes.body.token;

    // Login Warehouse
    const warehouseRes = await request(app)
      .post('/auth/login')
      .send({ email: 'warehouse@company.com', password: 'password123' });
    assert.strictEqual(warehouseRes.status, 200);
    warehouseToken = warehouseRes.body.token;

    // Login Accounts
    const accountsRes = await request(app)
      .post('/auth/login')
      .send({ email: 'accounts@company.com', password: 'password123' });
    assert.strictEqual(accountsRes.status, 200);
    accountsToken = accountsRes.body.token;
  });

  describe('1. Auth Module & Admin User Management', () => {
    it('GET /auth/me returns valid user info for Sales user', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${salesToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.email, 'sales@company.com');
      assert.strictEqual(res.body.role, 'Sales');
    });

    it('POST /auth/login fails with invalid credentials (401)', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'sales@company.com', password: 'wrongpassword' });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'Invalid email or password');
    });

    it('POST /auth/users allows Admin to generate user credentials', async () => {
      const res = await request(app)
        .post('/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Executive',
          email: 'newexec@company.com',
          password: 'password123',
          role: 'Sales'
        });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.email, 'newexec@company.com');
      assert.strictEqual(res.body.role, 'Sales');
    });

    it('POST /auth/users returns 403 Forbidden when non-admin attempts creation', async () => {
      const res = await request(app)
        .post('/auth/users')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          name: 'Hacker User',
          email: 'hacker@company.com',
          password: 'password123',
          role: 'Admin'
        });
      assert.strictEqual(res.status, 403);
    });

    it('Generated user can login successfully', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'newexec@company.com', password: 'password123' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.user.role, 'Sales');
    });
  });

  describe('2. Customers Module & Admin Deletion / Suspension Controls', () => {
    it('POST /customers creates a customer (Sales user permitted)', async () => {
      const res = await request(app)
        .post('/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          name: 'Acme Traders',
          mobile: '9876543210',
          email: 'acme@example.com',
          business_name: 'Acme Pvt Ltd',
          gst_number: '24AAAAA0000A1Z5',
          customer_type: 'Wholesale',
          address: '123 Market Road, Vadodara',
          status: 'Lead',
          follow_up_date: '2026-08-20',
          notes: 'Interested in bulk order'
        });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.name, 'Acme Traders');
      customerId = res.body.id;
    });

    it('POST /customers creates a secondary customer for deletion testing', async () => {
      const res = await request(app)
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Temp Customer For Delete',
          mobile: '9999999999',
          email: 'tempdelete@example.com',
          business_name: 'Temp Delete Pvt Ltd',
          gst_number: '24BBBBB0000B1Z5',
          customer_type: 'Retail'
        });
      assert.strictEqual(res.status, 201);
      deleteTestCustomerId = res.body.id;
    });

    it('POST /customers/:id/suspend suspends customer for 15 days (Admin only)', async () => {
      const res = await request(app)
        .post(`/customers/${customerId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ duration_days: 15 });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'Suspended');
      assert.ok(res.body.suspended_until);
    });

    it('POST /customers/:id/unsuspend reactivates customer account to Active', async () => {
      const res = await request(app)
        .post(`/customers/${customerId}/unsuspend`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'Active');
      assert.strictEqual(res.body.suspended_until, null);
    });

    it('DELETE /customers/:id returns 403 Forbidden for non-admin user', async () => {
      const res = await request(app)
        .delete(`/customers/${deleteTestCustomerId}`)
        .set('Authorization', `Bearer ${salesToken}`);
      assert.strictEqual(res.status, 403);
    });

    it('DELETE /customers/:id permanently deletes customer when requested by Admin', async () => {
      const res = await request(app)
        .delete(`/customers/${deleteTestCustomerId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });
  });

  describe('3. Products & Stock Movements Module', () => {
    it('POST /products creates product 1 (Warehouse user permitted)', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          name: 'Steel Widget',
          sku: 'SKU-1024',
          category: 'Hardware',
          unit_price: 150.0,
          current_stock: 30,
          min_stock_alert: 10,
          location: 'Warehouse A'
        });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.sku, 'SKU-1024');
      assert.strictEqual(res.body.current_stock, 30);
      assert.strictEqual(res.body.is_low_stock, false);
      productId1 = res.body.id;
    });

    it('POST /products creates product 2 with low stock', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          name: 'Copper Bolt',
          sku: 'SKU-2048',
          category: 'Hardware',
          unit_price: 45.0,
          current_stock: 5,
          min_stock_alert: 15,
          location: 'Warehouse B'
        });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.is_low_stock, true);
      productId2 = res.body.id;
    });

    it('POST /products returns 409 Conflict on duplicate SKU', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          name: 'Duplicate Steel',
          sku: 'SKU-1024',
          unit_price: 200.0,
          current_stock: 10
        });
      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.error, 'SKU already exists');
    });

    it('GET /products with low_stock=true filters low stock items correctly', async () => {
      const res = await request(app)
        .get('/products?low_stock=true')
        .set('Authorization', `Bearer ${salesToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.total, 1);
      assert.strictEqual(res.body.data[0].sku, 'SKU-2048');
    });

    it('DELETE /products/:id deletes product and linked stock movements (Admin/Warehouse permitted)', async () => {
      const tempRes = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          name: 'Temp Product For Delete',
          sku: 'SKU-TEMP-DELETE',
          unit_price: 100.0,
          current_stock: 5
        });
      assert.strictEqual(tempRes.status, 201);
      const tempId = tempRes.body.id;

      const delRes = await request(app)
        .delete(`/products/${tempId}`)
        .set('Authorization', `Bearer ${warehouseToken}`);
      assert.strictEqual(delRes.status, 200);
      assert.strictEqual(delRes.body.success, true);
    });
  });

  describe('4. Challans Module & Stock Transaction Rules', () => {
    it('POST /challans creates a draft challan with snapshot data', async () => {
      const res = await request(app)
        .post('/challans')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customer_id: customerId,
          items: [
            { product_id: productId1, quantity: 10 },
            { product_id: productId2, quantity: 2 }
          ]
        });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, 'Draft');
      assert.match(res.body.challan_number, /^CH-\d{4}-\d{4}$/);
      assert.strictEqual(res.body.items.length, 2);
      assert.strictEqual(res.body.items[0].sku_snapshot, 'SKU-1024');
      assert.strictEqual(res.body.items[0].price_snapshot, 150.0);
      challanId = res.body.id;
    });

    it('POST /challans/:id/confirm returns 422 Unprocessable Entity when requested stock > available', async () => {
      // Create draft challan requiring 50 units of product1 (only 30 available)
      const draftRes = await request(app)
        .post('/challans')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customer_id: customerId,
          items: [{ product_id: productId1, quantity: 50 }]
        });
      assert.strictEqual(draftRes.status, 201);
      const excessChallanId = draftRes.body.id;

      // Attempt to confirm
      const confirmRes = await request(app)
        .post(`/challans/${excessChallanId}/confirm`)
        .set('Authorization', `Bearer ${salesToken}`);

      assert.strictEqual(confirmRes.status, 422);
      assert.strictEqual(confirmRes.body.error, 'Insufficient stock');
      assert.strictEqual(confirmRes.body.details[0].sku, 'SKU-1024');
      assert.strictEqual(confirmRes.body.details[0].requested, 50);
      assert.strictEqual(confirmRes.body.details[0].available, 30);
    });

    it('POST /challans/:id/confirm successfully confirms valid challan & decrements stock', async () => {
      const confirmRes = await request(app)
        .post(`/challans/${challanId}/confirm`)
        .set('Authorization', `Bearer ${salesToken}`);

      assert.strictEqual(confirmRes.status, 200);
      assert.strictEqual(confirmRes.body.status, 'Confirmed');

      // Check product1 current_stock decremented from 30 -> 20
      const prodRes = await request(app)
        .get(`/products/${productId1}`)
        .set('Authorization', `Bearer ${warehouseToken}`);
      assert.strictEqual(prodRes.body.current_stock, 20);

      // Check stock_movements recorded type 'OUT'
      const moveRes = await request(app)
        .get(`/products/${productId1}/stock-movements`)
        .set('Authorization', `Bearer ${warehouseToken}`);
      const outMovements = moveRes.body.data.filter((m: any) => m.movement_type === 'OUT');
      assert.strictEqual(outMovements.length, 1);
      assert.strictEqual(outMovements[0].reason, 'Challan confirmed');
    });

    it('POST /challans/:id/confirm returns 409 Conflict when already confirmed', async () => {
      const confirmRes = await request(app)
        .post(`/challans/${challanId}/confirm`)
        .set('Authorization', `Bearer ${salesToken}`);
      assert.strictEqual(confirmRes.status, 409);
      assert.strictEqual(confirmRes.body.error, 'Challan is already Confirmed');
    });

    it('POST /challans/:id/cancel returns 409 Conflict for confirmed challan', async () => {
      const cancelRes = await request(app)
        .post(`/challans/${challanId}/cancel`)
        .set('Authorization', `Bearer ${salesToken}`);
      assert.strictEqual(cancelRes.status, 409);
      assert.strictEqual(cancelRes.body.error, 'Confirmed challans cannot be cancelled');
    });
  });
});

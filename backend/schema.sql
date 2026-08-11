CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin','Sales','Warehouse','Accounts')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  business_name TEXT,
  gst_number TEXT,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('Retail','Wholesale','Distributor')),
  address TEXT,
  status TEXT NOT NULL DEFAULT 'Lead' CHECK (status IN ('Lead','Active','Inactive','Suspended')),
  suspended_until TIMESTAMPTZ,
  follow_up_date DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  follow_up_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  category TEXT,
  unit_price NUMERIC(12,2) NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN','OUT')),
  reason TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Confirmed','Cancelled')),
  total_quantity INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_id UUID NOT NULL REFERENCES challans(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name_snapshot TEXT NOT NULL,
  sku_snapshot TEXT NOT NULL,
  price_snapshot NUMERIC(12,2) NOT NULL,
  quantity INTEGER NOT NULL
);

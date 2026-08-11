// TypeScript interfaces for the whole app

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Sales' | 'Warehouse' | 'Accounts';
  created_at?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

// Customers
export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  business_name?: string;
  gst_number?: string;
  customer_type: 'Retail' | 'Wholesale' | 'Distributor';
  address?: string;
  status: 'Lead' | 'Active' | 'Inactive' | 'Suspended';
  suspended_until?: string;
  follow_up_date?: string;
  notes?: string;
  created_at: string;
}

export interface FollowUp {
  id: string;
  customer_id: string;
  user_id: string;
  user_name?: string;
  note: string;
  follow_up_date?: string;
  created_at: string;
}

export interface CustomerDetail extends Customer {
  followups: FollowUp[];
}

// Products
export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  unit_price: number;
  current_stock: number;
  min_stock_alert: number;
  location?: string;
  is_low_stock: boolean;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'IN' | 'OUT';
  quantity: number;
  reason?: string;
  challan_id?: string;
  created_by?: string;
  created_at: string;
}

// Challans
export interface ChallanItem {
  id: string;
  challan_id: string;
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  price_snapshot: number;
  quantity: number;
  line_total: number;
}

export interface Challan {
  id: string;
  challan_number: string;
  customer_id: string;
  customer_name?: string;
  customer?: Customer;
  status: 'Draft' | 'Confirmed' | 'Cancelled';
  total_amount: number;
  created_by?: string;
  confirmed_at?: string;
  created_at: string;
  items?: ChallanItem[];
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

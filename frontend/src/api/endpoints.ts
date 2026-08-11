import api from './axios';
import type { Customer, CustomerDetail, FollowUp, PaginatedResponse, Product, StockMovement, Challan, User } from '../types';

// ─── Auth & User Management ───────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post<{ token: string; user: User }>('/auth/login', { email, password });

export const getMe = () => api.get<User>('/auth/me');

export const getHealth = () => api.get<{ status: string; dbConnected: boolean; timestamp: string }>('/health');

export const createUserApi = (data: { name: string; email: string; password: string; role: 'Admin' | 'Sales' | 'Warehouse' | 'Accounts' }) =>
  api.post<User>('/auth/users', data);

export const getUsersApi = () => api.get<User[]>('/auth/users');

// ─── Customers ────────────────────────────────────────────────────────
export const getCustomers = (params?: Record<string, any>) =>
  api.get<PaginatedResponse<Customer>>('/customers', { params });

export const getCustomer = (id: string) =>
  api.get<CustomerDetail>(`/customers/${id}`);

export const createCustomer = (data: Partial<Customer>) =>
  api.post<Customer>('/customers', data);

export const updateCustomer = (id: string, data: Partial<Customer>) =>
  api.put<Customer>(`/customers/${id}`, data);

export const deleteCustomerApi = (id: string) =>
  api.delete<{ success: boolean; deletedId: string; name: string }>(`/customers/${id}`);

export const suspendCustomerApi = (id: string, data: { duration_days?: number; suspended_until?: string; reason?: string }) =>
  api.post<Customer>(`/customers/${id}/suspend`, data);

export const unsuspendCustomerApi = (id: string) =>
  api.post<Customer>(`/customers/${id}/unsuspend`);

export const addFollowUp = (id: string, data: { note: string; follow_up_date?: string }) =>
  api.post<FollowUp>(`/customers/${id}/followups`, data);

// ─── Products ─────────────────────────────────────────────────────────
export const getProducts = (params?: Record<string, any>) =>
  api.get<PaginatedResponse<Product>>('/products', { params });

export const getProduct = (id: string) =>
  api.get<Product>(`/products/${id}`);

export const createProduct = (data: Partial<Product>) =>
  api.post<Product>('/products', data);

export const updateProduct = (id: string, data: Partial<Product>) =>
  api.put<Product>(`/products/${id}`, data);

export const deleteProductApi = (id: string) =>
  api.delete<{ success: boolean; message: string }>(`/products/${id}`);

export const getStockMovements = (id: string, params?: Record<string, any>) =>
  api.get<PaginatedResponse<StockMovement>>(`/products/${id}/stock-movements`, { params });

export const addStockMovement = (id: string, data: { quantity: number; movement_type: 'IN' | 'OUT'; reason?: string }) =>
  api.post<StockMovement>(`/products/${id}/stock-movements`, data);

// ─── Challans ─────────────────────────────────────────────────────────
export const getChallans = (params?: Record<string, any>) =>
  api.get<PaginatedResponse<Challan>>('/challans', { params });

export const getChallan = (id: string) =>
  api.get<Challan>(`/challans/${id}`);

export const createChallan = (data: { customer_id: string; items: { product_id: string; quantity: number }[] }) =>
  api.post<Challan>('/challans', data);

export const updateChallan = (id: string, data: any) =>
  api.put<Challan>(`/challans/${id}`, data);

export const confirmChallan = (id: string) =>
  api.post<Challan>(`/challans/${id}/confirm`);

export const cancelChallan = (id: string) =>
  api.post<Challan>(`/challans/${id}/cancel`);

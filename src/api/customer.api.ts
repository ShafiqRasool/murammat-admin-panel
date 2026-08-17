import api from './axios';

// ─── Types ─────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  address_line1: string | null;
  city_name: string | null;
  area_name: string | null;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  last_booking_at: string | null;
  total_spent: number;
  display_name: string;
  registration_method: string | null;
}

export interface CustomerFilters {
  period?: 'today' | '7days' | '21days' | '30days' | 'all';
  category_id?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateCustomerPayload {
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  password: string;
  address_line1?: string;
  city_id?: string;
  area_id?: string;
}

import type { Booking } from './booking.api';

// ─── API Response ────────────────────────────────────────────────────────
export interface PaginatedCustomers {
  data: Customer[];
  total: number;
  totalSpent: number;
  totalBookings: number;
}

// ─── API Calls ─────────────────────────────────────────────────────────
export const getCustomers = (filters: CustomerFilters = {}) =>
  api.get<PaginatedCustomers>('/admin/customers', { params: filters }).then(r => r.data);

export const getCustomerBookings = (id: string) =>
  api.get<Booking[]>(`/admin/customers/${id}/bookings`).then(r => r.data);

export const createCustomer = (payload: CreateCustomerPayload) =>
  api.post<Customer>('/admin/customers', payload).then(r => r.data);

export const deleteCustomer = (id: string) =>
  api.delete<{ message: string }>(`/admin/customers/${id}`).then(r => r.data);



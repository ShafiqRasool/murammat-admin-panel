import api from './axios';

// ─── Types ─────────────────────────────────────────────────────────────
export interface BookingItem {
  item_id: string;
  service_id: string;
  quantity: number;
  price: string | number;
  service_name: string;
  category_id: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  provider_id: string | null;
  status: string;
  scheduled_time: string;
  created_at: string;
  customer_email: string;
  customer_phone: string;
  customer_name: string;
  provider_name: string | null;
  total_amount: number;
  items: BookingItem[];
  has_complaint?: boolean;
  complaint_message?: string | null;
}

export interface BookingFilters {
  status?: string;
  search?: string;
  category_id?: string;
  dateSort?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedBookings {
  data: Booking[];
  total: number;
}

// ─── Booking Admin API ─────────────────────────────────────────────────
export const getAdminBookings = (filters: BookingFilters) =>
  api.get<PaginatedBookings>('/admin/bookings', { params: filters }).then(r => r.data);

export const assignBooking = (id: string, provider_id: string) =>
  api.post(`/admin/bookings/${id}/assign`, { provider_id }).then(r => r.data);

export const cancelBooking = (id: string) =>
  api.patch(`/admin/bookings/${id}/cancel`).then(r => r.data);

export interface CreateAdminBookingPayload {
  customer_id?: string; // Optional if manual_customer is provided
  manual_customer?: {
    first_name: string;
    last_name: string;
    phone: string;
    address_line1: string;
    city_id: string;
    area_id: string;
  };
  service_id: string;
  quantity: number;
  scheduled_time: string;
  problem_message?: string;
  is_auto_assign?: boolean;
  auto_assign_radius?: number;
  latitude?: number;
  longitude?: number;
}

export const createAdminBooking = (payload: CreateAdminBookingPayload) =>
  api.post<{ message: string, booking_id: string }>('/admin/bookings', payload).then(r => r.data);

export const getAutoAssignSetting = () =>
  api.get<{ auto_assign: boolean; radius?: number }>('/admin/bookings/auto-assign-setting').then(r => r.data);

export const updateAutoAssignSetting = (auto_assign: boolean, radius?: number) =>
  api.post<{ message: string; auto_assign: boolean; radius?: number }>('/admin/bookings/auto-assign-setting', { auto_assign, radius }).then(r => r.data);

export const reopenBooking = (id: string) =>
  api.post<{ message: string }>(`/admin/bookings/${id}/reopen`).then(r => r.data);

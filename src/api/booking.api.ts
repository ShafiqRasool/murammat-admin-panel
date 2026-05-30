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
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_time: string;
  created_at: string;
  customer_email: string;
  customer_phone: string;
  provider_name: string | null;
  total_amount: number;
  items: BookingItem[];
}

export interface BookingFilters {
  status?: string;
  search?: string;
  category_id?: string;
  dateSort?: 'asc' | 'desc';
}

// ─── Booking Admin API ─────────────────────────────────────────────────
export const getAdminBookings = (filters: BookingFilters) =>
  api.get<Booking[]>('/admin/bookings', { params: filters }).then(r => r.data);

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
}

export const createAdminBooking = (payload: CreateAdminBookingPayload) =>
  api.post<{ message: string, booking_id: string }>('/admin/bookings', payload).then(r => r.data);

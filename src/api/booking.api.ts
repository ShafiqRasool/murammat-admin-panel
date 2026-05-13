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

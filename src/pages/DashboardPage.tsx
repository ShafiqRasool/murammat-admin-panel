import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getCities, getAreas } from '../api/location.api';
import { getCategories, getServices, getParentCategories } from '../api/service.api';
import { getProviders } from '../api/provider.api';
import { getAdminBookings } from '../api/booking.api';
import { getCustomers } from '../api/customer.api';
import { getComplaints } from '../api/complaint.api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Modal from '../components/ui/Modal';

// ─── Helpers ─────────────────────────────────────────────────────────────
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtCurrency = (n: number) => `Rs ${n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString()}`;

// ─── Stat Card ─────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  title: string; value: string | number; subtitle: string;
  icon: React.ReactNode; color: string; trend?: string; trendUp?: boolean;
  onClick?: () => void;
}> = ({ title, value, subtitle, icon, color, trend, trendUp, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: '16px',
      padding: '22px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
    }}
    onMouseEnter={e => {
      if (onClick) {
        (e.currentTarget as HTMLElement).style.borderColor = color;
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 32px ${color}25`;
      }
    }}
    onMouseLeave={e => {
      if (onClick) {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
      }
    }}
  >
    <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '110px', height: '110px', borderRadius: '50%', background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</p>
        <p style={{ margin: '8px 0 0', fontSize: '30px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</p>
      </div>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        {icon}
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>{subtitle}</p>
      {trend && (
        <span style={{ fontSize: '11px', fontWeight: 700, color: trendUp ? '#16a34a' : '#dc2626', background: trendUp ? '#16a34a15' : '#dc262615', padding: '2px 7px', borderRadius: '10px' }}>
          {trendUp ? '↑' : '↓'} {trend}
        </span>
      )}
    </div>
  </div>
);

// ─── Section Header ────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
    {action}
  </div>
);

// ─── Chart Card ───────────────────────────────────────────────────────────
const ChartCard: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }> = ({ title, subtitle, action, children, style }) => (
  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '22px', boxShadow: 'var(--shadow-card)', ...style }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
        {subtitle && <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
    {children}
  </div>
);


// ─── Status Badge ─────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:   { bg: '#d9770615', color: '#d97706', label: 'Pending' },
    accepted:  { bg: '#00674F15', color: '#00674F', label: 'Accepted' },
    completed: { bg: '#16a34a15', color: '#16a34a', label: 'Completed' },
    cancelled: { bg: '#dc262615', color: '#dc2626', label: 'Cancelled' },
    started:   { bg: '#8b5cf615', color: '#8b5cf6', label: 'Started' },
    arrived:   { bg: '#ec489915', color: '#ec4899', label: 'Arrived' },
  };
  const s = map[status] ?? { bg: '#87878715', color: '#878787', label: status };
  return <span style={{ fontSize: '11px', fontWeight: 600, color: s.color, background: s.bg, padding: '3px 9px', borderRadius: '10px', textTransform: 'capitalize' }}>{s.label}</span>;
};

interface DateFilterProps {
  range: string;
  setRange: (val: string) => void;
  start: string;
  setStart: (val: string) => void;
  end: string;
  setEnd: (val: string) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ range, setRange, start, setStart, end, setEnd }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <select
        value={range}
        onChange={(e) => setRange(e.target.value)}
        style={{
          padding: '6px 12px',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          fontSize: '12px',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <option value="all">All Time</option>
        <option value="today">Today</option>
        <option value="7days">Last 7 Days</option>
        <option value="30days">Last 30 Days</option>
        <option value="thisMonth">This Month</option>
        <option value="lastMonth">Last Month</option>
        <option value="custom">Custom Range</option>
      </select>
      {range === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={{
              padding: '5px 8px',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>to</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={{
              padding: '5px 8px',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    cities: 0, areas: 0, services: 0, categories: 0,
    totalProviders: 0, pendingProviders: 0, approvedProviders: 0,
    totalCustomers: 0, totalBookings: 0, pendingBookings: 0,
    completedBookings: 0, cancelledBookings: 0, totalRevenue: 0,
    openComplaints: 0,
    todaysBookings: 0,
  });
  const [rawBookings, setRawBookings] = useState<any[]>([]);

  // Date Filters for Bookings & Revenue chart
  const [revenueRange, setRevenueRange] = useState('7days');
  const [revStart, setRevStart] = useState('');
  const [revEnd, setRevEnd] = useState('');

  // Date Filters for Booking Status chart
  const [statusRange, setStatusRange] = useState('7days');
  const [statusStart, setStatusStart] = useState('');
  const [statusEnd, setStatusEnd] = useState('');

  // Category breakdown states
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [breakdownRange, setBreakdownRange] = useState('today');
  const [breakdownStart, setBreakdownStart] = useState('');
  const [breakdownEnd, setBreakdownEnd] = useState('');
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [parentCategories, setParentCategories] = useState<any[]>([]);
  const [selectedParentCategory, setSelectedParentCategory] = useState<string>('all');

  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [bookingStatusData, setBookingStatusData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [providerApprovalData, setProviderApprovalData] = useState<any[]>([]);

  const getCategoryBreakdown = () => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (breakdownRange === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (breakdownRange === '7days') {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (breakdownRange === '20days') {
      startDate.setDate(now.getDate() - 20);
      startDate.setHours(0, 0, 0, 0);
    } else if (breakdownRange === '30days') {
      startDate.setMonth(now.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (breakdownRange === '90days') {
      startDate.setMonth(now.getMonth() - 3);
      startDate.setHours(0, 0, 0, 0);
    } else if (breakdownRange === 'custom') {
      if (breakdownStart) {
        startDate = new Date(breakdownStart);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date(0);
      }
      if (breakdownEnd) {
        endDate = new Date(breakdownEnd);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date();
      }
    } else {
      startDate = new Date(0);
      endDate = new Date();
    }

    const filteredBookings = rawBookings.filter(b => {
      const d = new Date(b.created_at);
      return d >= startDate && d <= endDate;
    });

    const categoryCounts: Record<string, number> = {};

    filteredBookings.forEach(b => {
      if (b.items && Array.isArray(b.items)) {
        const uniqueCatIds = new Set<string>();
        b.items.forEach((item: any) => {
          if (item.category_id) {
            uniqueCatIds.add(item.category_id);
          }
        });
        uniqueCatIds.forEach(catId => {
          categoryCounts[catId] = (categoryCounts[catId] || 0) + 1;
        });
      }
    });

    const list = allCategories
      .filter(cat => selectedParentCategory === 'all' || cat.parent_category_id === selectedParentCategory)
      .map(cat => {
        return {
          id: cat.id,
          name: cat.name,
          count: categoryCounts[cat.id] || 0
        };
      });

    if (selectedParentCategory === 'all') {
      Object.keys(categoryCounts).forEach(catId => {
        if (!list.some(x => x.id === catId)) {
          list.push({
            id: catId,
            name: 'Unknown Category',
            count: categoryCounts[catId]
          });
        }
      });
    }

    return list.sort((a, b) => b.count - a.count);
  };

  const isSuper = user?.roles?.includes('super-admin');
  const can = (p: string) => isSuper || user?.permissions?.includes(p) || false;

  const axisColor = isDark ? '#4a6a8a' : '#94afc8';
  const gridColor = isDark ? '#1f2d40' : '#e8f4fb';
  const tooltipBg = isDark ? '#1a2535' : '#ffffff';
  const tooltipBorder = isDark ? '#2a3a4f' : '#d1e8f5';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        can('view_locations') ? getCities() : Promise.resolve([]),
        can('view_locations') ? getAreas({ page: 1, limit: 1 }) : Promise.resolve({ total: 0 }),
        can('view_services') ? getCategories() : Promise.resolve([]),
        can('view_services') ? getServices() : Promise.resolve([]),
        can('view_providers') ? getProviders() : Promise.resolve([]),
        can('view_bookings') ? getAdminBookings({ limit: 1000 }) : Promise.resolve({ data: [], total: 0 }),
        can('view_customers') ? getCustomers({ limit: 1 }) : Promise.resolve({ data: [], total: 0, totalSpent: 0, totalBookings: 0 }),
        can('view_complaints') ? getComplaints({ limit: 200 }) : Promise.resolve({ data: [], total: 0 }),
        can('view_services') ? getParentCategories() : Promise.resolve([]),
      ]);

      const cities = results[0].status === 'fulfilled' ? (Array.isArray(results[0].value) ? results[0].value : (results[0].value as any)?.data ?? []) : [];
      const areasRes = results[1].status === 'fulfilled' ? results[1].value : { total: 0 };
      const categories = results[2].status === 'fulfilled' ? (Array.isArray(results[2].value) ? results[2].value : []) : [];
      const services = results[3].status === 'fulfilled' ? (Array.isArray(results[3].value) ? results[3].value : (results[3].value as any)?.data ?? []) : [];
      const providersRaw = results[4].status === 'fulfilled' ? results[4].value : [];
      const providerList: any[] = Array.isArray(providersRaw) ? providersRaw : (providersRaw as any)?.data ?? [];
      const bookingsRes = results[5].status === 'fulfilled' ? results[5].value : { data: [], total: 0 };
      const bookingsList: any[] = (bookingsRes as any)?.data ?? [];
      const customersRes = results[6].status === 'fulfilled' ? results[6].value : { total: 0, totalSpent: 0 };
      const complaintsRes = results[7].status === 'fulfilled' ? results[7].value : { data: [] };
      const complaintsList: any[] = (complaintsRes as any)?.data ?? [];
      const parentCategoriesRes = results[8]?.status === 'fulfilled' ? results[8].value : [];
      const parentCategoriesList = Array.isArray(parentCategoriesRes) ? parentCategoriesRes : (parentCategoriesRes as any)?.data ?? [];

      // Compute stats
      const isCompleted = (status: string) => ['completed', 'Rated & Reviewed', 'Work Done'].includes(status);
      const isPending = (status: string) => ['pending', 'BookingDone'].includes(status);
      const isCancelled = (status: string) => ['cancelled'].includes(status);

      const pending = bookingsList.filter(b => isPending(b.status)).length;
      const completed = bookingsList.filter(b => isCompleted(b.status)).length;
      const cancelled = bookingsList.filter(b => isCancelled(b.status)).length;
      const revenue = bookingsList.filter(b => isCompleted(b.status)).reduce((s, b) => s + (Number(b.total_amount) || 0), 0);
      const openComplaints = complaintsList.filter(c => c.status === 'open' || c.status === 'pending').length;

      // Filter today's bookings
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const todaysCount = bookingsList.filter(b => {
        const d = new Date(b.created_at);
        return d >= todayStart && d <= todayEnd;
      }).length;

      setStats({
        cities: (cities as any[]).length,
        areas: (areasRes as any)?.total ?? 0,
        categories: (categories as any[]).length,
        services: (services as any[]).length,
        totalProviders: providerList.length,
        pendingProviders: providerList.filter(p => p.approval_status === 'unapproved').length,
        approvedProviders: providerList.filter(p => p.approval_status === 'approved').length,
        totalCustomers: (customersRes as any)?.total ?? 0,
        totalBookings: (bookingsRes as any)?.total ?? bookingsList.length,
        pendingBookings: pending,
        completedBookings: completed,
        cancelledBookings: cancelled,
        totalRevenue: revenue,
        openComplaints,
        todaysBookings: todaysCount,
      });

      // Recent bookings (last 5)
      setRecentBookings(bookingsList.slice(0, 6));
      setRawBookings(bookingsList);
      setAllCategories(categories);
      setParentCategories(parentCategoriesList);

      // Provider approval bar
      setProviderApprovalData([
        { name: 'Approved', value: providerList.filter(p => p.approval_status === 'approved').length, color: '#16a34a' },
        { name: 'Pending', value: providerList.filter(p => p.approval_status === 'unapproved').length, color: '#d97706' },
        { name: 'Rejected', value: providerList.filter(p => p.approval_status === 'rejected').length, color: '#dc2626' },
      ]);

    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRevenueSubtitle = () => {
    if (revenueRange === 'today') return 'Today (Revenue in thousands PKR)';
    if (revenueRange === '7days') return 'Last 7 Days (Revenue in thousands PKR)';
    if (revenueRange === '30days') return 'Last 30 Days (Revenue in thousands PKR)';
    if (revenueRange === 'thisMonth') return 'This Month (Revenue in thousands PKR)';
    if (revenueRange === 'lastMonth') return 'Last Month (Revenue in thousands PKR)';
    if (revenueRange === 'custom') {
      const startStr = revStart ? new Date(revStart).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      const endStr = revEnd ? new Date(revEnd).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      return `Custom Range (${startStr || 'Start'} to ${endStr || 'End'}) (Revenue in thousands PKR)`;
    }
    return 'All Time (Revenue in thousands PKR)';
  };

  const getStatusSubtitle = () => {
    if (statusRange === 'today') return 'Today distribution';
    if (statusRange === '7days') return 'Last 7 Days distribution';
    if (statusRange === '30days') return 'Last 30 Days distribution';
    if (statusRange === 'thisMonth') return 'This Month distribution';
    if (statusRange === 'lastMonth') return 'Last Month distribution';
    if (statusRange === 'custom') {
      const startStr = statusStart ? new Date(statusStart).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      const endStr = statusEnd ? new Date(statusEnd).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      return `Custom Range (${startStr || 'Start'} to ${endStr || 'End'}) distribution`;
    }
    return 'All Time distribution';
  };

  // Recalculate dynamic chart data on filter changes
  useEffect(() => {
    if (!rawBookings || rawBookings.length === 0) {
      setMonthlyData([]);
      setBookingStatusData([]);
      return;
    }

    const isCompleted = (status: string) => ['completed', 'Rated & Reviewed', 'Work Done'].includes(status);
    const isPending = (status: string) => ['pending', 'BookingDone'].includes(status);
    const isCancelled = (status: string) => ['cancelled'].includes(status);

    // ─── 1. BOOKINGS & REVENUE FILTER & GROUPING ──────────────────────────────────
    const now = new Date();
    let revStartDate = new Date(now.getFullYear(), now.getMonth() - 5, 1); // default 6 months
    let revEndDate = now;

    if (revenueRange === 'today') {
      revStartDate = new Date();
      revStartDate.setHours(0, 0, 0, 0);
    } else if (revenueRange === '7days') {
      revStartDate = new Date();
      revStartDate.setDate(now.getDate() - 7);
    } else if (revenueRange === '30days') {
      revStartDate = new Date();
      revStartDate.setDate(now.getDate() - 30);
    } else if (revenueRange === 'thisMonth') {
      revStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (revenueRange === 'lastMonth') {
      revStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      revEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (revenueRange === 'custom') {
      if (revStart) revStartDate = new Date(revStart);
      if (revEnd) {
        revEndDate = new Date(revEnd);
        revEndDate.setHours(23, 59, 59, 999);
      }
    } else if (revenueRange === 'all') {
      const oldestBooking = rawBookings.reduce((min, b) => {
        const d = new Date(b.created_at);
        return d < min ? d : min;
      }, new Date());
      revStartDate = new Date(oldestBooking.getFullYear(), oldestBooking.getMonth(), 1);
    }

    const filteredRevenueBookings = rawBookings.filter(b => {
      const d = new Date(b.created_at);
      return d >= revStartDate && d <= revEndDate;
    });

    const diffTime = Math.abs(revEndDate.getTime() - revStartDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 35) {
      // Group by Day
      const getDaysInRange = (s: Date, e: Date) => {
        const dSlots: any[] = [];
        const start = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        const end = new Date(e.getFullYear(), e.getMonth(), e.getDate());
        while (start <= end) {
          dSlots.push({
            name: start.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
            year: start.getFullYear(),
            month: start.getMonth(),
            date: start.getDate(),
            bookings: 0,
            revenue: 0
          });
          start.setDate(start.getDate() + 1);
        }
        return dSlots;
      };

      const days = getDaysInRange(revStartDate, revEndDate);

      filteredRevenueBookings.forEach(b => {
        const d = new Date(b.created_at);
        const day = days.find(x => x.date === d.getDate() && x.month === d.getMonth() && x.year === d.getFullYear());
        if (day) {
          day.bookings++;
          if (isCompleted(b.status)) {
            day.revenue += Number(b.total_amount) || 0;
          }
        }
      });

      setMonthlyData(days.map(d => ({
        name: d.name,
        Bookings: d.bookings,
        Revenue: Math.round(d.revenue / 1000)
      })));
    } else {
      // Group by Month
      const getMonthsInRange = (s: Date, e: Date) => {
        const mSlots: any[] = [];
        const start = new Date(s.getFullYear(), s.getMonth(), 1);
        const end = new Date(e.getFullYear(), e.getMonth(), 1);
        while (start <= end) {
          mSlots.push({
            month: start.toLocaleString('default', { month: 'short' }),
            year: start.getFullYear(),
            m: start.getMonth(),
            y: start.getFullYear(),
            bookings: 0,
            revenue: 0
          });
          start.setMonth(start.getMonth() + 1);
        }
        return mSlots;
      };

      const months = getMonthsInRange(revStartDate, revEndDate);

      filteredRevenueBookings.forEach(b => {
        const d = new Date(b.created_at);
        const m = months.find(x => x.m === d.getMonth() && x.y === d.getFullYear());
        if (m) {
          m.bookings++;
          if (isCompleted(b.status)) {
            m.revenue += Number(b.total_amount) || 0;
          }
        }
      });

      setMonthlyData(months.map(m => ({
        name: `${m.month} ${String(m.year).substring(2)}`,
        Bookings: m.bookings,
        Revenue: Math.round(m.revenue / 1000)
      })));
    }

    // ─── 2. BOOKING STATUS PIE CHART FILTER & COUNT ─────────────────────────────
    let statusStartDate = new Date();
    statusStartDate.setDate(now.getDate() - 7); // Default to last 7 days
    let statusEndDate = now;

    if (statusRange === 'today') {
      statusStartDate = new Date();
      statusStartDate.setHours(0, 0, 0, 0);
    } else if (statusRange === '7days') {
      statusStartDate = new Date();
      statusStartDate.setDate(now.getDate() - 7);
    } else if (statusRange === '30days') {
      statusStartDate = new Date();
      statusStartDate.setDate(now.getDate() - 30);
    } else if (statusRange === 'thisMonth') {
      statusStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (statusRange === 'lastMonth') {
      statusStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      statusEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (statusRange === 'custom') {
      if (statusStart) statusStartDate = new Date(statusStart);
      if (statusEnd) {
        statusEndDate = new Date(statusEnd);
        statusEndDate.setHours(23, 59, 59, 999);
      }
    } else if (statusRange === 'all') {
      statusStartDate = new Date(0); // Epoch start
    }

    const filteredStatusBookings = rawBookings.filter(b => {
      const d = new Date(b.created_at);
      return d >= statusStartDate && d <= statusEndDate;
    });

    const sPending = filteredStatusBookings.filter(b => isPending(b.status)).length;
    const sCompleted = filteredStatusBookings.filter(b => isCompleted(b.status)).length;
    const sCancelled = filteredStatusBookings.filter(b => isCancelled(b.status)).length;

    setBookingStatusData([
      { name: 'Pending', value: sPending, color: '#d97706' },
      { name: 'Completed', value: sCompleted, color: '#16a34a' },
      { name: 'Cancelled', value: sCancelled, color: '#dc2626' },
      { name: 'Active', value: filteredStatusBookings.length - sPending - sCompleted - sCancelled, color: '#00674F' },
    ].filter(d => d.value > 0));

  }, [rawBookings, revenueRange, revStart, revEnd, statusRange, statusStart, statusEnd]);

  useEffect(() => { load(); }, [load]);


  const ICONS = {
    users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    money: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="2" y1="12" x2="22" y2="12"/></svg>,
    customer: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    wrench: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
    location: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>,
    alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="22" height="22"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  };

  const QuickLink = ({ label, icon, path, color }: { label: string; icon: React.ReactNode; path: string; color: string }) => (
    <button
      onClick={() => navigate(path)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
        padding: '16px 10px', borderRadius: '12px', border: '1px solid var(--border)',
        background: 'var(--surface-hover)', cursor: 'pointer', transition: 'all 0.15s ease',
        flex: '1 1 0', minWidth: '70px',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.background = `${color}12`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; }}
    >
      <div style={{ color, width: '36px', height: '36px', background: `${color}18`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
    </button>
  );

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Welcome back, {user?.email?.split('@')[0] || 'Admin'} 👋
          </h2>
          <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={load}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
            transition: 'all 0.15s ease',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="14" height="14"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      {/* ── Top Stats — Bookings & Revenue ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {can('view_bookings') && <>
          <StatCard title="Total Bookings" value={loading ? '—' : fmt(stats.totalBookings)} subtitle="All time" icon={ICONS.book} color="#00674F" onClick={() => setBreakdownModalOpen(true)} />
          <StatCard title="Today's Bookings" value={loading ? '—' : fmt(stats.todaysBookings)} subtitle="Booked today" icon={ICONS.clock} color="#00674F" onClick={() => { setBreakdownRange('today'); setBreakdownModalOpen(true); }} />
          <StatCard title="Pending" value={loading ? '—' : fmt(stats.pendingBookings)} subtitle="Awaiting assignment" icon={ICONS.clock} color="#d97706" trend={stats.pendingBookings > 0 ? `${stats.pendingBookings} new` : undefined} trendUp={false} onClick={() => navigate('/bookings')} />
          <StatCard title="Completed" value={loading ? '—' : fmt(stats.completedBookings)} subtitle="Successfully done" icon={ICONS.check} color="#16a34a" onClick={() => navigate('/bookings')} />
          <StatCard title="Total Revenue" value={loading ? '—' : fmtCurrency(stats.totalRevenue)} subtitle="From completed bookings" icon={ICONS.money} color="#8b5cf6" onClick={() => navigate('/commissions')} />
        </>}
      </div>

      {/* ── Second Row Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {can('view_customers') && <StatCard title="Customers" value={loading ? '—' : fmt(stats.totalCustomers)} subtitle="Registered users" icon={ICONS.customer} color="#ec4899" onClick={() => navigate('/customers')} />}
        {can('view_providers') && <>
          <StatCard title="Providers" value={loading ? '—' : fmt(stats.totalProviders)} subtitle="Registered professionals" icon={ICONS.users} color="#00674F" onClick={() => navigate('/providers')} />
          <StatCard title="Pending Approvals" value={loading ? '—' : fmt(stats.pendingProviders)} subtitle="Needs your review" icon={ICONS.clock} color="#d97706" trendUp={false} onClick={() => navigate('/providers')} />
        </>}
        {can('view_services') && <StatCard title="Services" value={loading ? '—' : fmt(stats.services)} subtitle={`${stats.categories} categories`} icon={ICONS.wrench} color="#0891b2" onClick={() => navigate('/services')} />}
        {can('view_locations') && <StatCard title="Locations" value={loading ? '—' : fmt(stats.cities)} subtitle={`${stats.areas} areas`} icon={ICONS.location} color="#7c3aed" onClick={() => navigate('/locations')} />}
        {can('view_complaints') && <StatCard title="Open Complaints" value={loading ? '—' : fmt(stats.openComplaints)} subtitle="Requires attention" icon={ICONS.alert} color="#dc2626" trendUp={false} onClick={() => navigate('/complaints')} />}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>

        {/* Monthly Bookings Area Chart */}
        {can('view_bookings') && (
          <ChartCard
            title="Bookings & Revenue"
            subtitle={getRevenueSubtitle()}
            action={
              <DateFilter
                range={revenueRange}
                setRange={setRevenueRange}
                start={revStart}
                setStart={setRevStart}
                end={revEnd}
                setEnd={setRevEnd}
              />
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="bGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00674F" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00674F" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '10px', color: 'var(--text-primary)' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="Bookings" stroke="#00674F" strokeWidth={2} fill="url(#bGrad)" dot={{ fill: '#00674F', r: 3 }} />
                <Area type="monotone" dataKey="Revenue" stroke="#8b5cf6" strokeWidth={2} fill="url(#rGrad)" dot={{ fill: '#8b5cf6', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Booking Status Pie Chart */}
        {can('view_bookings') && (
          <ChartCard
            title="Booking Status"
            subtitle={getStatusSubtitle()}
            action={
              <DateFilter
                range={statusRange}
                setRange={setStatusRange}
                start={statusStart}
                setStart={setStatusStart}
                end={statusEnd}
                setEnd={setStatusEnd}
              />
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={bookingStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {bookingStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '10px' }} formatter={(val: any, name: any) => [val, name]} />
                <Legend wrapperStyle={{ fontSize: '12px' }} formatter={(value: string, entry: any) => <span style={{ color: 'var(--text-secondary)' }}>{value}: {entry.payload?.value ?? 0}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* ── Provider Status Bar Chart ── */}
      {can('view_providers') && providerApprovalData.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <ChartCard title="Service Provider Status" subtitle="Approval breakdown of all registered providers">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={providerApprovalData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                <XAxis type="number" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: axisColor, fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '10px' }} cursor={{ fill: `${gridColor}80` }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: axisColor, fontSize: 11 }}>
                  {providerApprovalData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ── Quick Links ── */}
      <div style={{ marginBottom: '20px' }}>
        <SectionHeader title="Quick Navigation" />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {can('view_bookings') && <QuickLink label="Bookings" icon={ICONS.book} path="/bookings" color="#00674F" />}
          {can('view_customers') && <QuickLink label="Customers" icon={ICONS.customer} path="/customers" color="#ec4899" />}
          {can('view_providers') && <QuickLink label="Providers" icon={ICONS.users} path="/providers" color="#8b5cf6" />}
          {can('view_services') && <QuickLink label="Services" icon={ICONS.wrench} path="/services" color="#0891b2" />}
          {can('view_locations') && <QuickLink label="Locations" icon={ICONS.location} path="/locations" color="#7c3aed" />}
          {can('view_complaints') && <QuickLink label="Complaints" icon={ICONS.alert} path="/complaints" color="#dc2626" />}
          {can('view_call_requests') && <QuickLink label="Leads" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="18" height="18"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>} path="/call-requests" color="#16a34a" />}
          {can('view_blogs') && <QuickLink label="Blogs" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="18" height="18"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>} path="/blogs" color="#d97706" />}
          {can('manage_roles') && <QuickLink label="Staff" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} path="/roles-staff" color="#1B3A6B" />}
        </div>
      </div>

      {/* ── Recent Bookings Table ── */}
      {can('view_bookings') && recentBookings.length > 0 && (
        <ChartCard title="Recent Bookings" subtitle="Latest booking activity on the platform">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: isDark ? '#0a1a15' : '#005240' }}>
                  {['Customer', 'Service', 'Amount', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#a8c4e0', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b, i) => (
                  <tr
                    key={b.id}
                    style={{ borderBottom: i < recentBookings.length - 1 ? `1px solid var(--border)` : 'none', transition: 'background 0.12s', cursor: 'pointer' }}
                    onClick={() => navigate('/bookings')}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--table-row-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>{b.customer_name || b.customer_email || '—'}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{b.items?.[0]?.service_name || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#16a34a', fontWeight: 600 }}>Rs {Number(b.total_amount || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={b.status} /></td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(b.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <button
              onClick={() => navigate('/bookings')}
              style={{ fontSize: '13px', color: '#00674F', background: 'none', border: '1px solid #00674F40', borderRadius: '8px', padding: '7px 20px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s' }}
            >
              View All Bookings →
            </button>
          </div>
        </ChartCard>
      )}

      {breakdownModalOpen && (
        <Modal
          isOpen={breakdownModalOpen}
          onClose={() => setBreakdownModalOpen(false)}
          title="Bookings Breakdown by Category"
          subtitle="View booking counts for each category"
          width="600px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <button
                onClick={() => {
                  setBreakdownModalOpen(false);
                  navigate('/bookings');
                }}
                style={{
                  fontSize: '13px',
                  color: '#00674F',
                  background: 'none',
                  border: '1px solid #00674F40',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                View Bookings List →
              </button>
              <button
                onClick={() => setBreakdownModalOpen(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-hover)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Date range filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: 'var(--input-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Period:</span>
              <select
                value={breakdownRange}
                onChange={(e) => setBreakdownRange(e.target.value)}
                style={{
                  padding: '6px 12px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="20days">Last 20 Days</option>
                <option value="1month">Last 1 Month</option>
                <option value="3months">Last 3 Months</option>
                <option value="custom">Custom Range</option>
              </select>

              {breakdownRange === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="date"
                    value={breakdownStart}
                    onChange={(e) => setBreakdownStart(e.target.value)}
                    style={{
                      padding: '5px 8px',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>to</span>
                  <input
                    type="date"
                    value={breakdownEnd}
                    onChange={(e) => setBreakdownEnd(e.target.value)}
                    style={{
                      padding: '5px 8px',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Parent Category chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--input-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Parent Category:</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSelectedParentCategory('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid ' + (selectedParentCategory === 'all' ? '#00674F' : 'var(--border)'),
                    background: selectedParentCategory === 'all' ? '#00674F' : 'var(--card-bg)',
                    color: selectedParentCategory === 'all' ? '#fff' : 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  All Categories
                </button>
                {parentCategories.map(pc => (
                  <button
                    key={pc.id}
                    type="button"
                    onClick={() => setSelectedParentCategory(pc.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: '1px solid ' + (selectedParentCategory === pc.id ? '#00674F' : 'var(--border)'),
                      background: selectedParentCategory === pc.id ? '#00674F' : 'var(--card-bg)',
                      color: selectedParentCategory === pc.id ? '#fff' : 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {pc.name}
                  </button>
                ))}
              </div>
            </div>

            {/* List of categories and bookings */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--table-header-bg)' }}>
                <div style={{ flex: 2, fontSize: '11px', fontWeight: 700, color: 'var(--table-header-text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Service Category
                </div>
                <div style={{ flex: 1, fontSize: '11px', fontWeight: 700, color: 'var(--table-header-text)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>
                  Booking Count
                </div>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {getCategoryBreakdown().length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No bookings found for the selected range.
                  </div>
                ) : (
                  getCategoryBreakdown().map((item, idx, arr) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        padding: '12px 16px',
                        borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 2, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {item.name}
                      </div>
                      <div style={{ flex: 1, textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            background: item.count > 0 ? '#00674F20' : 'var(--border)',
                            color: item.count > 0 ? '#00674F' : 'var(--text-secondary)',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default DashboardPage;

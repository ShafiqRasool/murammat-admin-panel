import React, { useEffect, useState, useCallback } from 'react';
import { getAdminReviews } from '../api/review.api';
import { toast } from '../components/ui/Toast';
import Pagination from '../components/ui/Pagination';

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [metrics, setMetrics] = useState({
    total_reviews: 0,
    avg_rating: 0,
    count_5: 0,
    count_4: 0,
    count_3: 0,
    count_2: 0,
    count_1: 0,
  });

  // Search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, ratingFilter]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminReviews({
        page,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
        rating_filter: ratingFilter !== 'all' ? ratingFilter : undefined,
      });

      setReviews(res.data || []);
      setTotal(res.total || 0);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    } catch {
      toast('Failed to load reviews and ratings', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, ratingFilter]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out', padding: '24px' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Reviews & Ratings</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Monitor customer feedback, ratings breakdown, and technician service performance</p>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Average Rating</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⭐ {metrics.avg_rating > 0 ? metrics.avg_rating.toFixed(1) : '0.0'}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Reviews</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {metrics.total_reviews.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>5-Star Reviews</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {metrics.count_5.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>1-Star Reviews</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
            {metrics.count_1.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rating:</span>
          <select
            value={ratingFilter}
            onChange={e => setRatingFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'var(--input-bg)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Ratings / تمام ریٹنگز</option>
            <option value="5">5 Stars ⭐⭐⭐⭐⭐</option>
            <option value="4">4 Stars ⭐⭐⭐⭐</option>
            <option value="3">3 Stars ⭐⭐⭐</option>
            <option value="2">2 Stars ⭐⭐</option>
            <option value="1">1 Star ⭐</option>
          </select>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Customer, Provider, Comment…"
            style={{
              padding: '9px 14px 9px 36px',
              background: 'var(--input-bg)', border: '1px solid var(--border)',
              borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', width: '100%',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Reviews Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading reviews list…</div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
            <span style={{ flex: 1.2, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</span>
            <span style={{ flex: 1.2, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Provider / Partner</span>
            <span style={{ flex: 0.9, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rating</span>
            <span style={{ flex: 2, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Feedback Comment</span>
            <span style={{ flex: 0.9, fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</span>
          </div>

          {reviews.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No reviews found matching the criteria.</div>
          ) : (
            reviews.map((row, i) => {
              const stars = Number(row.rating || 5);

              return (
                <div
                  key={row.id}
                  style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: i < reviews.length - 1 ? '1px solid #1e3d3040' : 'none' }}
                >
                  {/* Customer */}
                  <span style={{ flex: 1.2, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontWeight: 600 }}>{row.customer_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{row.customer_phone || ''}</div>
                  </span>

                  {/* Provider */}
                  <span style={{ flex: 1.2, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontWeight: 600 }}>{row.provider_name || row.company_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{row.provider_phone || ''}</div>
                  </span>

                  {/* Rating Badge */}
                  <span style={{ flex: 0.9 }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      border: '1px solid #fde68a'
                    }}>
                      ⭐ {stars} / 5
                    </span>
                  </span>

                  {/* Comment */}
                  <span style={{ flex: 2, fontSize: '13px', color: 'var(--text-primary)', paddingRight: '12px' }}>
                    {row.comment && row.comment.trim() ? (
                      <span style={{ fontStyle: 'italic' }}>"{row.comment}"</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No written comment provided</span>
                    )}
                  </span>

                  {/* Date */}
                  <span style={{ flex: 0.9, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {new Date(row.created_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })
          )}

          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;

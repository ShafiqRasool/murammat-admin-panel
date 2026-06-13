import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(totalItems, currentPage * pageSize);

  // Generate page numbers to show (e.g. 1, 2, 3, ... or similar)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();

  const buttonStyle = (active: boolean, disabled: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid #1e3d30',
    background: active ? 'linear-gradient(135deg, #00674F, #00a87a)' : '#0a1a15',
    color: active ? '#fff' : disabled ? '#4a6b5e' : '#e8f5f0',
    fontSize: '13px',
    fontWeight: active ? 700 : 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    opacity: disabled ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    outline: 'none',
  });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      borderTop: '1px solid #1e3d30',
      background: '#0d241c',
      flexWrap: 'wrap',
      gap: '12px',
    }}>
      {/* Left section: Info */}
      <div style={{ fontSize: '13px', color: '#878787' }}>
        Showing <span style={{ color: '#e8f5f0', fontWeight: 600 }}>{startIdx}</span> to{' '}
        <span style={{ color: '#e8f5f0', fontWeight: 600 }}>{endIdx}</span> of{' '}
        <span style={{ color: '#e8f5f0', fontWeight: 600 }}>{totalItems}</span> entries
      </div>

      {/* Middle/Right section: Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Page Size selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#878787' }}>Page size:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{
              padding: '6px 10px',
              background: '#0a1a15',
              border: '1px solid #1e3d30',
              borderRadius: '8px',
              color: '#e8f5f0',
              fontSize: '13px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt} style={{ background: '#0a1a15', color: '#e8f5f0' }}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Page Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Previous Page */}
          <button
            type="button"
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={buttonStyle(false, currentPage === 1)}
            title="Previous Page"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="14" height="14">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* First page if not in visible range */}
          {pages[0] > 1 && (
            <>
              <button
                type="button"
                onClick={() => onPageChange(1)}
                style={buttonStyle(currentPage === 1, false)}
              >
                1
              </button>
              {pages[0] > 2 && <span style={{ color: '#4a6b5e', padding: '0 4px' }}>...</span>}
            </>
          )}

          {/* Page numbers */}
          {pages.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => onPageChange(p)}
              style={buttonStyle(currentPage === p, false)}
            >
              {p}
            </button>
          ))}

          {/* Last page if not in visible range */}
          {pages[pages.length - 1] < totalPages && (
            <>
              {pages[pages.length - 1] < totalPages - 1 && <span style={{ color: '#4a6b5e', padding: '0 4px' }}>...</span>}
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                style={buttonStyle(currentPage === totalPages, false)}
              >
                {totalPages}
              </button>
            </>
          )}

          {/* Next Page */}
          <button
            type="button"
            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={buttonStyle(false, currentPage === totalPages)}
            title="Next Page"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="14" height="14">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;

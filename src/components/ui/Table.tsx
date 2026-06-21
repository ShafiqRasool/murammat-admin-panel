import React from 'react';
import Button from './Button';
import Pagination from './Pagination';

interface Column {
  key: string;
  label: string;
  flex?: number;
}

interface TableProps {
  columns: Column[];
  rows: any[];
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  actions?: (row: any) => React.ReactNode;
  emptyText?: string;
  pagination?: {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
}

const Table: React.FC<TableProps> = ({ 
  columns, 
  rows, 
  onEdit, 
  onDelete, 
  actions,
  emptyText = 'No records found.',
  pagination
}) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
    {/* Header */}
    <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
      {columns.map(c => (
        <span key={c.key} style={{ flex: c.flex ?? 1, fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {c.label}
        </span>
      ))}
      <span style={{ width: '100px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</span>
    </div>

    {/* Rows */}
    {rows.length === 0 ? (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>{emptyText}</div>
    ) : (
      rows.map((row, i) => (
        <div
          key={row.id ?? i}
          style={{
            display: 'flex', alignItems: 'center', padding: '13px 16px',
            borderBottom: (i < rows.length - 1 || !!pagination) ? '1px solid var(--border-light)' : 'none',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--table-row-hover)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          {columns.map(c => (
            <span key={c.key} style={{ flex: c.flex ?? 1, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row[c.key] ?? '—'}
            </span>
          ))}
          <div style={{ width: '100px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            {actions ? actions(row) : (
              <>
                {onEdit && <Button variant="secondary" size="sm" onClick={() => onEdit(row)}>Edit</Button>}
                {onDelete && <Button variant="danger" size="sm" onClick={() => onDelete(row)}>Del</Button>}
              </>
            )}
          </div>
        </div>
      ))
    )}

    {/* Pagination */}
    {pagination && (
      <Pagination
        currentPage={pagination.currentPage}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        onPageChange={pagination.onPageChange}
        onPageSizeChange={pagination.onPageSizeChange}
      />
    )}
  </div>
);

export default Table;

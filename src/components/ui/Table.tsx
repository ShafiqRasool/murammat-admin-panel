import React from 'react';
import Button from './Button';

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
}

const Table: React.FC<TableProps> = ({ 
  columns, 
  rows, 
  onEdit, 
  onDelete, 
  actions,
  emptyText = 'No records found.' 
}) => (
  <div style={{ background: '#122b22', border: '1px solid #1e3d30', borderRadius: '12px', overflow: 'hidden' }}>
    <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid #1e3d30', background: '#0d241c' }}>
      {columns.map(c => (
        <span key={c.key} style={{ flex: c.flex ?? 1, fontSize: '11px', fontWeight: 700, color: '#878787', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {c.label}
        </span>
      ))}
      <span style={{ width: '100px', fontSize: '11px', fontWeight: 700, color: '#878787', textTransform: 'uppercase', textAlign: 'right' }}>Actions</span>
    </div>
    {rows.length === 0 ? (
      <div style={{ padding: '40px', textAlign: 'center', color: '#4a6b5e', fontSize: '14px' }}>{emptyText}</div>
    ) : (
      rows.map((row, i) => (
        <div
          key={row.id ?? i}
          style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderBottom: i < rows.length - 1 ? '1px solid #1e3d3060' : 'none', transition: 'background 0.12s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#183828'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          {columns.map(c => (
            <span key={c.key} style={{ flex: c.flex ?? 1, fontSize: '14px', color: '#e8f5f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
  </div>
);

export default Table;

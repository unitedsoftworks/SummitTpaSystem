import React from 'react';

export default function Table({ columns, data, onRowClick }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 10,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8f9fa' }}>
            {columns.map(col => (
              <th key={col.key} style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: 12,
                fontWeight: 600,
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '2px solid #e9ecef',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick && onRowClick(row)}
              style={{
                cursor: onRowClick ? 'pointer' : 'default',
                borderBottom: '1px solid #f0f0f0',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f9ff'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {columns.map(col => (
                <td key={col.key} style={{ padding: '12px 16px', fontSize: 14 }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#999',
                fontSize: 14,
              }}>
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

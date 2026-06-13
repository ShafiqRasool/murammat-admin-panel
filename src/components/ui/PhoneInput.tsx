import React from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, required = true }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const val = e.target.value.replace(/\D/g, '');
    onChange(val);
  };

  const hasTyped = value.length > 0;
  const isValid = !hasTyped || /^(03|3)\d{9}$/.test(value);

  return (
    <div style={{ width: '100%', marginBottom: '16px' }}>
      <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${isValid ? '#1e3d30' : '#dc2626'}` }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a1a15',
          borderRight: '1px solid #1e3d30',
          padding: '0 14px',
          color: '#878787',
          fontWeight: 700,
          fontSize: '13px',
          userSelect: 'none',
        }}>
          +92
        </div>
        <input
          required={required}
          type="tel"
          value={value}
          onChange={handleChange}
          placeholder="3001234567"
          maxLength={11}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: '#0a1a15',
            border: 'none',
            outline: 'none',
            color: '#e8f5f0',
            fontSize: '13px',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {!isValid && (
        <span style={{ color: '#f87171', fontSize: '11px', marginTop: '4px', display: 'block' }}>
          Invalid Pakistani phone format (e.g. 3xxxxxxxxx or 03xxxxxxxxx).
        </span>
      )}
    </div>
  );
};

import React from 'react';

interface FormInputProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className = '',
}) => {
  return (
    <div className="form-group">
      <label htmlFor={name} className="form-label">
        {label}
        {required && <span style={{ color: '#dc2626', marginLeft: '0.25rem' }}>*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`form-input ${className}`}
      />
    </div>
  );
};

export default FormInput;

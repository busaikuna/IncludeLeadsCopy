import React, { forwardRef } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, required, className = '', id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={`form-field ${className}`}>
        <label htmlFor={inputId} className="field-label">
          {label}
          {required && <span className="text-orange-500 ml-1" aria-hidden="true">*</span>}
        </label>
        <div className="field-wrapper">
          {leftIcon && (
            <span className="field-icon-left" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`form-field-input ${error ? 'border-red-500' : ''} ${leftIcon ? 'has-icon-left' : ''} ${rightIcon ? 'has-icon-right' : ''}`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {rightIcon && (
            <span className="field-icon-right" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, required, className = '', id, ...props }, ref) => {
    const selectId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={`form-field ${className}`}>
        <label htmlFor={selectId} className="field-label">
          {label}
          {required && <span className="text-orange-500 ml-1" aria-hidden="true">*</span>}
        </label>
        <div className="field-wrapper">
          <select
            ref={ref}
            id={selectId}
            className={`form-field-select ${error ? 'border-red-500' : ''}`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="field-icon-right" aria-hidden="true" />
        </div>
        {error && (
          <p id={`${selectId}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${selectId}-helper`} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, required, className = '', id, ...props }, ref) => {
    const textareaId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={`form-field ${className}`}>
        <label htmlFor={textareaId} className="field-label">
          {label}
          {required && <span className="text-orange-500 ml-1" aria-hidden="true">*</span>}
        </label>
        <div className="field-wrapper">
          <textarea
            ref={ref}
            id={textareaId}
            className={`form-field-textarea ${error ? 'border-red-500' : ''}`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${textareaId}-helper`} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ label, error, helperText, required, className = '', id, ...props }, ref) => {
    const dateId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={`form-field ${className}`}>
        <label htmlFor={dateId} className="field-label">
          {label}
          {required && <span className="text-orange-500 ml-1" aria-hidden="true">*</span>}
        </label>
        <div className="field-wrapper">
          <CalendarDays className="field-icon-left" aria-hidden="true" />
          <input
            ref={ref}
            type="date"
            id={dateId}
            className={`form-field-input has-icon-left ${error ? 'border-red-500' : ''}`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${dateId}-error` : helperText ? `${dateId}-helper` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${dateId}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${dateId}-helper`} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';

export interface MoveSelectProps {
  label?: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export const MoveSelect: React.FC<MoveSelectProps> = ({
  label,
  options,
  value,
  onChange,
  className = '',
  ...props
}) => {
  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label className="field-label">{label}</label>
      )}
      <div className="field-wrapper">
        <select
          className={`move-select ${className}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
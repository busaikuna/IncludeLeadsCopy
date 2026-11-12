import React, { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'default' | 'small';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'default',
    icon,
    iconPosition = 'left',
    fullWidth = false,
    loading = false,
    disabled,
    className = '',
    children,
    ...props
  }, ref) => {
    const baseClasses = `
      inline-flex items-center justify-center gap-2
      font-body font-semibold text-sm
      rounded-[var(--radius-btn)]
      transition-colors duration-150
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      ${fullWidth ? 'w-full' : ''}
    `;

    const variantClasses = variant === 'primary'
      ? `
        bg-[var(--orange)] border border-[var(--orange)] text-white
        hover:bg-[#d94e1e] hover:border-[#d94e1e]
        focus:ring-[var(--orange)]
      `
      : `
        bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)]
        hover:bg-[var(--bg)]
        focus:ring-[var(--navy)]
      `;

    const sizeClasses = size === 'small'
      ? 'h-8 px-3 text-xs'
      : 'h-[var(--btn-height)] px-[18px]';

    const iconElement = icon && (
      <span className="flex-shrink-0" aria-hidden="true">
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4' })
          : icon}
      </span>
    );

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {iconPosition === 'left' && iconElement}
            <span>{children}</span>
            {iconPosition === 'right' && iconElement}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Botão específico para "Salvar lead" com largura fixa
export const SaveButton: React.FC<ButtonProps> = (props) => (
  <Button
    variant="primary"
    icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>}
    className="w-[136px]"
    {...props}
  />
);

// Botão específico para "Registrar interação"
export const RegisterInteractionButton: React.FC<ButtonProps> = (props) => (
  <Button
    variant="primary"
    icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>}
    {...props}
  />
);

// Botão secundário genérico
export const SecondaryButton: React.FC<ButtonProps> = (props) => (
  <Button variant="secondary" {...props} />
);

// Botão "Cancelar" (sem ícone)
export const CancelButton: React.FC<ButtonProps> = (props) => (
  <Button variant="secondary" {...props} />
);

// Botão "Ver funil de vendas" com ícone columns-3
export const ViewFunnelButton: React.FC<ButtonProps> = (props) => (
  <Button
    variant="secondary"
    icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="14" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>}
    {...props}
  />
);

// Botão "Voltar ao funil" com ícone arrow-left
export const BackToFunnelButton: React.FC<ButtonProps> = (props) => (
  <Button
    variant="secondary"
    icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>}
    {...props}
  />
);
import React, { forwardRef } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'default' | 'form' | 'indicators' | 'funnel' | 'none';
  children: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'default', className = '', children, ...props }, ref) => {
    const paddingClasses = {
      default: 'p-[var(--card-padding)]',
      form: 'p-[var(--card-padding-form)]',
      indicators: 'p-[var(--card-padding-indicators)]',
      funnel: 'p-[var(--card-padding-funnel)]',
      none: '',
    };

    return (
      <div
        ref={ref}
        className={`card ${paddingClasses[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
  ...props
}) => (
  <div className={`flex items-center justify-between gap-6 ${className}`} {...props}>
    <div className="flex flex-col gap-1.5 min-w-0">
      <h2 className="card-title">{title}</h2>
      {subtitle && <p className="text-sm text-[var(--muted)]">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

export interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const CardSection: React.FC<CardSectionProps> = ({
  title,
  children,
  className = '',
  ...props
}) => (
  <div className={`flex flex-col gap-4 ${className}`} {...props}>
    {title && <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>}
    <div className="flex flex-col gap-4">{children}</div>
  </div>
);
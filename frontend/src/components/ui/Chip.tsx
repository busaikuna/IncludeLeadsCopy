import React from 'react';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({ children, className = '', ...props }) => (
  <span
    className={`chip ${className}`}
    {...props}
  >
    {children}
  </span>
);

export const AlertBox: React.FC<{ children: React.ReactNode; icon?: React.ReactNode; className?: string }> = ({
  children,
  icon = (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  className = '',
}) => (
  <div className={`alert-box ${className}`} role="alert">
    <span aria-hidden="true">{icon}</span>
    <span className="alert-text">{children}</span>
  </div>
);

export const StagePill: React.FC<{
  number: number;
  label: string;
  state: 'completed' | 'active' | 'future';
}> = ({ number, label, state }) => {
  const baseClasses = `
    flex flex-col items-center justify-center gap-1.5
    h-[var(--stage-pill-height)]
    px-[10px]
    rounded-[var(--radius-btn)]
    text-[11px]
    transition-all duration-150
  `;

  if (state === 'completed') {
    return (
      <div className={`${baseClasses} bg-[var(--bg)]`}>
        <span className="flex items-center justify-center gap-1.5">
          <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span className="stage-pill-completed">{label}</span>
        </span>
      </div>
    );
  }

  if (state === 'active') {
    return (
      <div className={`${baseClasses} bg-[var(--navy)]`}>
        <div className="flex items-center gap-1">
          <span className="stage-pill-active-num">{number}</span>
          <span className="stage-pill-active-text">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${baseClasses} bg-[var(--bg)]`}>
      <div className="flex items-center gap-1">
        <span className="stage-pill-future-num">{number}</span>
        <span className="stage-pill-future-text">{label}</span>
      </div>
    </div>
  );
};

export interface TimelineItemProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  meta: string;
  note: string;
  isLast?: boolean;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({
  icon,
  iconBg,
  title,
  meta,
  note,
  isLast = false,
}) => (
  <div className="flex gap-3 items-start">
    <div className="flex flex-col items-center gap-1 w-7 flex-shrink-0">
      <div
        className="w-[28px] h-[28px] rounded-[var(--radius-btn)] flex items-center justify-center"
        style={{ backgroundColor: iconBg }}
        aria-hidden="true"
      >
        {icon}
      </div>
      {!isLast && (
        <div className="w-[1px] h-[13px] bg-[var(--border)]" aria-hidden="true" />
      )}
    </div>
    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-4">
        <h4 className="timeline-title truncate">{title}</h4>
        <span className="timeline-meta whitespace-nowrap flex-shrink-0">{meta}</span>
      </div>
      <p className="timeline-note">{note}</p>
    </div>
  </div>
);

export interface IndicatorCardProps {
  label: string;
  icon: React.ReactNode;
  value: string | number;
  supportText: string;
  valueColor?: 'default' | 'orange';
  className?: string;
}

export const IndicatorCard: React.FC<IndicatorCardProps> = ({
  label,
  icon,
  value,
  supportText,
  valueColor = 'default',
  className = '',
}) => (
  <div className={`card p-[var(--card-padding-indicators)] flex flex-col gap-3 ${className}`}>
    <div className="flex items-center justify-between gap-2">
      <span className="indicator-label flex-1">{label}</span>
      <span className="flex-shrink-0" aria-hidden="true">{icon}</span>
    </div>
    <div className="indicator-value" style={{ color: valueColor === 'orange' ? 'var(--orange)' : 'var(--black)' }}>
      {value}
    </div>
    <p className="indicator-support">{supportText}</p>
  </div>
);

export interface ClosedDealCardProps {
  title: string;
  subtitle: string;
  wonCount: number;
  lostCount: number;
  totalCount: number;
  readingTitle: string;
  readingText: string;
  className?: string;
}

export const ClosedDealCard: React.FC<ClosedDealCardProps> = ({
  title,
  subtitle,
  wonCount,
  lostCount,
  totalCount,
  readingTitle,
  readingText,
  className = '',
}) => {
  const wonPercent = totalCount > 0 ? ((wonCount / totalCount) * 100).toFixed(1) : '0';
  const lostPercent = totalCount > 0 ? ((lostCount / totalCount) * 100).toFixed(1) : '0';
  const wonWidth = totalCount > 0 ? (wonCount / totalCount) * 100 : 0;

  return (
    <div className={`card p-[var(--card-padding)] flex flex-col gap-6 ${className}`}>
      <div className="flex flex-col gap-1.5">
        <h2 className="card-title">{title}</h2>
        <p className="closed-subtitle">{subtitle}</p>
      </div>

      <div className="flex gap-1 h-[14px]">
        <div
          className="h-full rounded-[var(--radius-bar)] bg-[var(--green)] flex-shrink-0"
          style={{ width: `${wonWidth}%` }}
          aria-label={`Ganhos: ${wonPercent}%`}
        />
        <div
          className="h-full rounded-[var(--radius-bar)] bg-[var(--red)] flex-1"
          aria-label={`Perdidos: ${lostPercent}%`}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-[36px] h-[36px] rounded-[var(--radius-btn)] bg-[var(--green-tint)] flex items-center justify-center flex-shrink-0">
            <svg className="w-[18px] h-[18px] text-[var(--green)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <span className="closed-status">Ganho</span>
            <span className="closed-percent">{wonPercent.replace('.', ',')}% dos encerrados</span>
          </div>
          <span className="closed-value ml-auto text-[var(--green)]">{wonCount}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-[36px] h-[36px] rounded-[var(--radius-btn)] bg-[var(--red-tint)] flex items-center justify-center flex-shrink-0">
            <svg className="w-[18px] h-[18px] text-[var(--red)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <span className="closed-status">Perdido</span>
            <span className="closed-percent">{lostPercent.replace('.', ',')}% dos encerrados</span>
          </div>
          <span className="closed-value ml-auto text-[var(--red)]">{lostCount}</span>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-6 flex flex-col gap-2.5">
        <span className="closed-reading-title">{readingTitle}</span>
        <p className="closed-reading-text">{readingText}</p>
      </div>
    </div>
  );
};
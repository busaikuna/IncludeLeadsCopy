import React from 'react';

export interface StageData {
  name: string;
  count: number;
  percentage: number;
  color: 'default' | 'orange';
}

export interface StageChartProps {
  title: string;
  subtitle: string;
  stages: StageData[];
  maxCount: number;
  className?: string;
}

export const StageChart: React.FC<StageChartProps> = ({
  title,
  subtitle,
  stages,
  maxCount,
  className = '',
}) => {
  const trackWidth = 696; // Largura fixa da trilha conforme especificação

  return (
    <div className={`card p-[var(--card-padding)] flex flex-col gap-6 ${className}`} style={{ width: '744px' }}>
      <div className="flex flex-col gap-1.5">
        <h2 className="card-title">{title}</h2>
        <p className="text-sm text-[var(--muted)]">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-[22px]">
        {stages.map((stage) => (
          <div key={stage.name} className="flex flex-col gap-[9px]">
            <div className="flex items-center justify-between">
              <span className="chart-stage-name">{stage.name}</span>
              <span className="chart-stage-meta whitespace-nowrap">
                {stage.count} leads · {stage.percentage.toFixed(1).replace('.', ',')}%
              </span>
            </div>
            <div className="relative h-[12px] w-full bg-[var(--bg)] rounded-[var(--radius-bar)] overflow-hidden" style={{ width: `${trackWidth}px` }}>
              <div
                className="h-full rounded-[var(--radius-bar)]"
                style={{
                  width: maxCount > 0 ? `${(stage.count / maxCount) * 100}%` : '0%',
                  backgroundColor: stage.color === 'orange' ? 'var(--orange)' : 'var(--black)',
                }}
                aria-label={`${stage.name}: ${stage.percentage.toFixed(1).replace('.', ',')}%`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border)] pt-4 flex items-center justify-between">
        <span className="chart-scale">0 leads</span>
        <span className="chart-scale">1</span>
        <span className="chart-scale">2</span>
        <span className="chart-scale">{maxCount} leads</span>
      </div>
    </div>
  );
};

export default StageChart;
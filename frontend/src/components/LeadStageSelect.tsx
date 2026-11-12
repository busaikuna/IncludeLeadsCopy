import { stageLabels, type LeadRecord, type StageSelection } from '../leads';

interface LeadStageSelectProps {
  lead: LeadRecord;
  label: string;
  disabled: boolean;
  onChange: (selection: StageSelection) => void;
  className?: string;
}

export function LeadStageSelect({
  lead,
  label,
  disabled,
  onChange,
  className = '',
}: LeadStageSelectProps) {
  return (
    <select
      aria-label={label}
      value={lead.outcome ?? lead.status}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as StageSelection)}
      className={`rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 disabled:opacity-60 ${className}`}
    >
      {Object.entries(stageLabels)
        .filter(([stage]) => stage !== 'fechado')
        .map(([stage, title]) => (
          <option key={stage} value={stage}>
            {title}
          </option>
        ))}
      <optgroup label={stageLabels.fechado}>
        {lead.status === 'fechado' && lead.outcome === null && (
          <option value="fechado" disabled>
            Fechado sem desfecho
          </option>
        )}
        <option value="GANHO">Ganho</option>
        <option value="PERDIDO">Perdido</option>
      </optgroup>
    </select>
  );
}

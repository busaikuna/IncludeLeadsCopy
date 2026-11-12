import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LeadMetrics } from '../../../backend/src/models/lead';
import { ApiError, request, sessionKey } from '../api';
import { stageLabels, stages } from '../leads';

export function useDashboardStats() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem(sessionKey);
  const [metrics, setMetrics] = useState<LeadMetrics | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    request<LeadMetrics>('/dashboard', { signal: controller.signal }, token)
      .then((data) => {
        if (!controller.signal.aborted) setMetrics(data);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          sessionStorage.removeItem(sessionKey);
          navigate('/login', { replace: true });
          return;
        }
        setError(error instanceof ApiError ? error.message : 'Não foi possível carregar o dashboard.');
      });
    return () => controller.abort();
  }, [attempt, navigate, token]);

  function refetch() {
    setError('');
    setMetrics(null);
    setAttempt((value) => value + 1);
  }

  const stats = metrics && {
    totalLeads: metrics.totalLeads,
    inProgressLeads: metrics.inProgress,
    closedLeads: metrics.closed,
    wonLeads: metrics.won,
    lostLeads: metrics.lost,
    overallConversion: metrics.conversionRate,
    closedConversion: metrics.closedConversionRate,
    stagesDistribution: stages.map((stage) => ({
      name: stageLabels[stage],
      count: metrics.byStage[stage],
      percentage: metrics.totalLeads > 0 ? 100 * metrics.byStage[stage] / metrics.totalLeads : 0,
      color: stage === 'fechado' ? 'orange' as const : 'default' as const,
    })),
  };

  return { stats, error, loading: !metrics && !error, refetch };
}

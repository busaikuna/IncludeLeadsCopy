import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { PageHeader } from '../components/layout/PageHeader';
import { ViewFunnelButton } from '../components/ui/Button';
import { IndicatorCard, ClosedDealCard } from '../components/ui/Chip';
import { StageChart } from '../components/charts/StageChart';
import { Users, Trophy, TrendingUp, Target } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { stats, loading, error, refetch } = useDashboardStats();

  const handleRefresh = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <PageHeader
          title="Dashboard"
          subtitle="Uma visão clara da sua operação comercial, do primeiro contato ao fechamento."
          actionButton={<ViewFunnelButton onClick={() => navigate('/funil')}>Ver funil de vendas</ViewFunnelButton>}
        />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-5 flex-1 flex flex-col gap-3 loading-skeleton" style={{ width: '274px', height: '174px' }} />
          ))}
        </div>
        <div className="flex gap-6">
          <div className="loading-skeleton flex-1" style={{ width: '744px', height: '400px' }} />
          <div className="loading-skeleton flex-1" style={{ height: '400px' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <PageHeader
          title="Dashboard"
          subtitle="Uma visão clara da sua operação comercial, do primeiro contato ao fechamento."
          actionButton={<ViewFunnelButton onClick={() => navigate('/funil')}>Ver funil de vendas</ViewFunnelButton>}
        />
        <div className="card p-8 text-center text-[var(--muted)]">
          <p>Erro ao carregar dashboard: {error}</p>
          <ViewFunnelButton variant="primary" onClick={handleRefresh} style={{ marginTop: '16px' }}>
            Tentar novamente
          </ViewFunnelButton>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const formatPercent = (value: number) => value.toFixed(1).replace('.', ',') + '%';
  const formatNumber = (value: number) => value.toLocaleString('pt-BR');

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        subtitle="Uma visão clara da sua operação comercial, do primeiro contato ao fechamento."
        actionButton={<ViewFunnelButton onClick={() => navigate('/funil')}>Ver funil de vendas</ViewFunnelButton>}
      />

      {/* Linha de 4 indicadores */}
      <div className="flex gap-4">
        <IndicatorCard
          label="Total de leads"
          icon={<Users className="w-[18px] h-[18px] text-[var(--muted)]" aria-hidden="true" />}
          value={formatNumber(stats.totalLeads)}
          supportText={`${stats.inProgressLeads} em andamento · ${stats.closedLeads} encerrados`}
        />
        <IndicatorCard
          label="Fechados como Ganho"
          icon={<Trophy className="w-[18px] h-[18px] text-[var(--green)]" aria-hidden="true" />}
          value={formatNumber(stats.wonLeads)}
          supportText={`${stats.wonLeads} ganhos entre ${stats.closedLeads} encerrados`}
        />
        <IndicatorCard
          label="Taxa de conversão geral"
          icon={<TrendingUp className="w-[18px] h-[18px] text-[var(--orange)]" aria-hidden="true" />}
          value={formatPercent(stats.overallConversion)}
          supportText={`${stats.wonLeads} ganhos ÷ ${stats.totalLeads} leads`}
          valueColor="orange"
        />
        <IndicatorCard
          label="Conversão sobre encerrados"
          icon={<Target className="w-[18px] h-[18px] text-[var(--muted)]" aria-hidden="true" />}
          value={formatPercent(stats.closedConversion)}
          supportText={`${stats.wonLeads} ganhos ÷ (${stats.wonLeads} ganhos + ${stats.lostLeads} perdidos)`}
        />
      </div>

      {/* Linha com 2 cards */}
      <div className="flex gap-6 items-start">
        {/* Card esquerdo: Leads por etapa */}
        <StageChart
          title="Leads por etapa"
          subtitle={`Distribuição de ${formatNumber(stats.totalLeads)} leads`}
          stages={stats.stagesDistribution}
          maxCount={Math.max(...stats.stagesDistribution.map(s => s.count), 1)}
        />

        {/* Card direito: Negócios encerrados */}
        <ClosedDealCard
          title="Negócios encerrados"
          subtitle={`${stats.closedLeads} oportunidades concluídas`}
          wonCount={stats.wonLeads}
          lostCount={stats.lostLeads}
          totalCount={stats.closedLeads}
          readingTitle="Do contato ao resultado"
          readingText="A conversão geral considera todos os leads. A conversão sobre encerrados considera apenas negócios ganhos e perdidos."
        />
      </div>
    </div>
  );
};

export default DashboardPage;

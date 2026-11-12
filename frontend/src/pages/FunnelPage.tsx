import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import type { LeadStage } from '../../../backend/src/models/lead';
import { ApiError, request, sessionKey } from '../api';
import { LeadStageSelect } from '../components/LeadStageSelect';
import { stageLabels, stages, updateLeadStage, type LeadRecord, type StageSelection } from '../leads';
import {
  Plus,
  Search,
  Filter,
  Building2,
  User,
  Calendar,
  LayoutDashboard,
  Kanban,
  LogOut,
} from 'lucide-react';

const columnColors = {
  prospeccao: 'border-blue-500',
  primeiro_contato: 'border-yellow-500',
  reuniao_agendada: 'border-orange-500',
  proposta_enviada: 'border-purple-500',
  fechado: 'border-emerald-500',
} satisfies Record<LeadStage, string>;

const contactDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

export const FunnelPage: React.FC = () => {
  const navigate = useNavigate();
  const token = sessionStorage.getItem(sessionKey);
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<LeadRecord[] | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    request<LeadRecord[]>('/leads', { signal: controller.signal }, token)
      .then((items) => {
        if (controller.signal.aborted) return;
        if (items.some((lead) => !Object.hasOwn(stageLabels, lead.status))) {
          setError('A API retornou etapas incompatíveis com o funil.');
          return;
        }
        setLeads(items);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          sessionStorage.removeItem(sessionKey);
          navigate('/login', { replace: true });
          return;
        }
        setError(
          error instanceof ApiError
            ? error.message
            : 'Não foi possível carregar os leads.',
        );
      });
    return () => controller.abort();
  }, [navigate, token]);

  async function moveLead(lead: LeadRecord, selection: StageSelection) {
    if (!token || pending) return;
    setPending(true);
    setError('');
    try {
      const updated = await updateLeadStage(lead.id, selection, token);
      setLeads(
        (current) =>
          current?.map((item) => (item.id === updated.id ? updated : item)) ??
          null,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        sessionStorage.removeItem(sessionKey);
        navigate('/login', { replace: true });
        return;
      }
      setError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível mover o lead.',
      );
    } finally {
      setPending(false);
    }
  }

  if (!token) return <Navigate to="/login" replace />;

  const search = searchTerm.trim().toLowerCase();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="h-16 bg-black border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-8">
          {/* Logo IncludeLeads */}
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate('/funil')}
          >
            <div className="text-orange-500">
              <svg
                className="w-8 h-8"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10.15 23.5V28.5H15.15V23.5H10.15Z"
                  fill="currentColor"
                />
                <path
                  d="M20 10.15L15.15 15.15V28.5H24.85V15.15L20 10.15ZM21.5 25.15H18.5V22.15H21.5V25.15ZM21.5 19.15H18.5V16.15H21.5V19.15Z"
                  fill="currentColor"
                />
                <path d="M28.5 23.5H23.5V28.5H28.5V23.5Z" fill="currentColor" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Include<span className="text-orange-500">Leads</span>
            </span>
          </div>

          {/* Navegação Principal */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => navigate('/funil')}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-2"
            >
              <Kanban className="w-4 h-4" />
              Funil de Vendas
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
          </nav>
        </div>

        {/* Ações Direitas / Perfil */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/novo-lead')}
            className="bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-medium text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-orange-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lead</span>
          </button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <button
            onClick={() => {
              sessionStorage.removeItem(sessionKey);
              navigate('/login', { replace: true });
            }}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Sub-header de Filtros e Busca */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Funil de Vendas
            <span className="text-xs bg-slate-800 text-slate-400 font-normal px-2.5 py-0.5 rounded-full border border-slate-700">
              Pipeline Principal
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerencie o progresso das negociações em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar lead ou segmento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <button className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-medium text-slate-300 flex items-center gap-2 transition-colors">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filtros
          </button>
        </div>
      </div>

      <main className="flex-1 p-6 overflow-x-auto">
        {error && (
          <p role="alert" className="mb-4 text-sm text-rose-300">
            {error}
          </p>
        )}
        {leads === null && !error && (
          <p role="status" className="text-sm text-slate-400">
            Carregando leads…
          </p>
        )}
        {leads !== null && (
          <div className="flex gap-5 min-w-[1200px] h-full items-start">
            {stages.map((stage) => {
              const filteredLeads = leads.filter(
                (lead) =>
                  lead.status === stage &&
                  (!search ||
                    lead.name?.toLowerCase().includes(search) ||
                    lead.segmento?.toLowerCase().includes(search)),
              );

              return (
                <section
                  key={stage}
                  aria-label={stageLabels[stage]}
                  className="w-72 bg-slate-900/50 border border-slate-800/80 rounded-xl flex flex-col max-h-[calc(100vh-14rem)]"
                >
                  <header
                    className={`p-4 border-t-2 ${columnColors[stage]} border-b border-slate-800/80 flex items-center justify-between bg-slate-900/80 rounded-t-xl`}
                  >
                    <h2 className="font-semibold text-sm text-slate-200">
                      {stageLabels[stage]}
                    </h2>
                    <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700">
                      {filteredLeads.length}
                    </span>
                  </header>

                  <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                    {filteredLeads.map((lead) => (
                      <article
                        key={lead.id}
                        className="relative bg-slate-900 border border-slate-800 hover:border-orange-500/50 p-4 rounded-xl"
                      >
                        {(lead.outcome || lead.origem) && (
                          <span className="text-xs font-medium text-orange-400/90 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                            {lead.outcome ?? lead.origem}
                          </span>
                        )}
                        <h3 className="mt-2 font-bold text-sm text-slate-100">
                          <Link
                            to={`/lead/${lead.id}`}
                            className="after:absolute after:inset-0 after:rounded-xl hover:text-orange-300 focus-visible:text-orange-300"
                          >
                            {lead.name ?? `Lead ${lead.id}`}
                          </Link>
                        </h3>
                        {lead.segmento && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>{lead.segmento}</span>
                          </div>
                        )}
                        <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                          {(lead.email || lead.phone) && (
                            <div className="flex items-center gap-1 min-w-0">
                              <User className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                {lead.email ?? lead.phone}
                              </span>
                            </div>
                          )}
                          {lead.lastContact && (
                            <div className="flex items-center gap-1 ml-2">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {contactDate.format(new Date(lead.lastContact))}
                              </span>
                            </div>
                          )}
                        </div>
                        <LeadStageSelect
                          lead={lead}
                          label={`Etapa de ${lead.name ?? `lead ${lead.id}`}`}
                          disabled={pending}
                          onChange={(selection) => void moveLead(lead, selection)}
                          className="relative z-10 mt-3 w-full"
                        />
                      </article>
                    ))}
                    {filteredLeads.length === 0 && (
                      <div className="text-center py-8 text-xs text-slate-500 border-2 border-dashed border-slate-800/60 rounded-xl">
                        Nenhum lead nesta etapa
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

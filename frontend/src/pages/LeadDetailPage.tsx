import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarCheck,
  Info,
  LogOut,
  Mail,
  MessageSquare,
  Phone,
} from 'lucide-react';
import {
  interactionTypes,
  type Interaction,
  type InteractionType,
} from '../../../backend/src/models/interaction';
import { ApiError, request, sessionKey } from '../api';
import { LeadStageSelect } from '../components/LeadStageSelect';
import {
  stageLabels,
  stages,
  updateLeadStage,
  type LeadRecord,
  type StageSelection,
} from '../leads';

type InteractionRecord = Omit<Interaction, 'interactionDate' | 'createdAt'> & {
  interactionDate: string;
  createdAt: string;
};

const interactionKinds = {
  ligacao: { label: 'Ligação', icon: Phone },
  email: { label: 'E-mail', icon: Mail },
  reuniao: { label: 'Reunião', icon: CalendarCheck },
  mensagem: { label: 'Mensagem', icon: MessageSquare },
  outro: { label: 'Outro', icon: Info },
} satisfies Record<InteractionType, { label: string; icon: typeof Info }>;

const localTimeZone = 'America/Sao_Paulo';
const calendarDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: localTimeZone,
  dateStyle: 'short',
});
const displayDate = new Intl.DateTimeFormat('pt-BR', {
  timeZone: localTimeZone,
  dateStyle: 'short',
});
const displayDateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: localTimeZone,
  dateStyle: 'short',
  timeStyle: 'short',
});
const cardClass =
  'min-w-0 rounded-xl border border-slate-800 bg-slate-900/60 p-5';
const fieldClass =
  'mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = sessionStorage.getItem(sessionKey);

  if (!token) return <Navigate to="/login" replace />;
  if (!id) return <Navigate to="/funil" replace />;

  return <LeadDetails key={id} id={id} token={token} />;
}

function LeadDetails({ id, token }: { id: string; token: string }) {
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadRecord | null>(null);
  const [interactions, setInteractions] = useState<InteractionRecord[] | null>(
    null,
  );
  const [leadError, setLeadError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [stageError, setStageError] = useState('');
  const [interactionError, setInteractionError] = useState('');
  const [moving, setMoving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const leadPath = `/leads/${encodeURIComponent(id)}`;
  const interactionsPath = `${leadPath}/interactions`;

  const signOut = useCallback(() => {
    if (sessionStorage.getItem(sessionKey) !== token) return;
    sessionStorage.removeItem(sessionKey);
    navigate('/login', { replace: true });
  }, [navigate, token]);

  const reportError = useCallback(
    (error: unknown, fallback: string, setError: (message: string) => void) => {
      if (error instanceof ApiError && error.status === 401) {
        signOut();
        return;
      }
      setError(error instanceof ApiError ? error.message : fallback);
    },
    [signOut],
  );

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };

    request<LeadRecord>(leadPath, options, token)
      .then(setLead)
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          reportError(error, 'Não foi possível carregar o lead.', setLeadError);
      });
    request<InteractionRecord[]>(interactionsPath, options, token)
      .then(setInteractions)
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          reportError(
            error,
            'Não foi possível carregar o histórico.',
            setHistoryError,
          );
      });

    return () => controller.abort();
  }, [leadPath, interactionsPath, reportError, token]);

  async function moveLead(selection: StageSelection) {
    if (!lead || moving) return;
    setMoving(true);
    setStageError('');

    try {
      const { status, outcome, stageChangedAt } = await updateLeadStage(
        lead.id,
        selection,
        token,
      );
      setLead(
        (current) => current && { ...current, status, outcome, stageChangedAt },
      );
    } catch (error) {
      reportError(error, 'Não foi possível mover o lead.', setStageError);
    } finally {
      setMoving(false);
    }
  }

  async function registerInteraction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !interactions) return;

    const form = event.currentTarget;
    const values = new FormData(form);
    const type = values.get('type');
    const date = String(values.get('date') ?? '');
    const annotation = String(values.get('annotation') ?? '').trim();
    if (!annotation) {
      setInteractionError('Informe uma anotação.');
      return;
    }

    setSubmitting(true);
    setInteractionError('');
    try {
      const saved = await request<InteractionRecord>(
        interactionsPath,
        {
          method: 'POST',
          body: JSON.stringify({
            type,
            interactionDate: `${date}T00:00:00`,
            annotation,
          }),
        },
        token,
      );
      const savedTime = Date.parse(saved.interactionDate);
      setInteractions((current) =>
        [...(current ?? []), saved].sort(
          (left, right) =>
            Date.parse(right.interactionDate) -
              Date.parse(left.interactionDate) || right.id - left.id,
        ),
      );
      setLead((current) => {
        if (
          !current ||
          (current.lastContact && Date.parse(current.lastContact) >= savedTime)
        )
          return current;
        return { ...current, lastContact: saved.interactionDate };
      });
      form.reset();
    } catch (error) {
      reportError(
        error,
        'Não foi possível registrar a interação.',
        setInteractionError,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const companyName = lead?.name ?? lead?.nome ?? `Lead ${id}`;
  const currentStageIndex = lead ? stages.indexOf(lead.status) : -1;
  const today = calendarDate.format(new Date());

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-black">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/funil"
            className="text-xl font-bold tracking-tight text-white"
          >
            Include<span className="text-orange-500">Leads</span>
          </Link>
          <button
            type="button"
            aria-label="Sair"
            onClick={signOut}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-rose-400"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <Link
          to="/funil"
          className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-orange-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar ao funil
        </Link>
        {leadError && (
          <p role="alert" className="text-sm text-rose-300">
            {leadError}
          </p>
        )}
        {!lead && !leadError && (
          <p role="status" className="text-sm text-slate-400">
            Carregando lead…
          </p>
        )}
        {lead && (
          <>
            <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {companyName}
            </h1>

            <section className={cardClass} aria-labelledby="lead-stage-heading">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  id="lead-stage-heading"
                  className="font-semibold text-white"
                >
                  Etapa no funil
                </h2>
                <LeadStageSelect
                  lead={lead}
                  label="Mover lead para outra etapa"
                  disabled={moving}
                  onChange={(selection) => void moveLead(selection)}
                />
              </div>
              <ol
                aria-label="Etapas do funil"
                className="mt-4 flex flex-wrap gap-2"
              >
                {stages.map((stage, index) => {
                  const active = stage === lead.status;
                  const label =
                    active && lead.outcome
                      ? lead.outcome === 'GANHO'
                        ? 'Ganho'
                        : 'Perdido'
                      : stageLabels[stage];
                  return (
                    <li
                      key={stage}
                      aria-current={active ? 'step' : undefined}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                        active
                          ? 'border-orange-500/50 bg-orange-500/10 text-orange-300'
                          : index < currentStageIndex
                            ? 'border-slate-700 bg-slate-800 text-slate-200'
                            : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      {label}
                    </li>
                  );
                })}
              </ol>
              {stageError && (
                <p role="alert" className="mt-3 text-sm text-rose-300">
                  {stageError}
                </p>
              )}
            </section>

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.75fr)]">
              <div className="space-y-5">
                <section
                  className={cardClass}
                  aria-labelledby="lead-data-heading"
                >
                  <h2
                    id="lead-data-heading"
                    className="mb-4 font-semibold text-white"
                  >
                    Dados do lead
                  </h2>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 break-words text-sm [&>dt]:text-slate-400">
                    <dt>Segmento</dt>
                    <dd>{lead.segmento ?? '—'}</dd>
                    <dt>Origem</dt>
                    <dd>{lead.origem ?? '—'}</dd>
                    <dt>Responsável</dt>
                    <dd>{lead.responsavel ?? '—'}</dd>
                    <dt>Último contato</dt>
                    <dd>
                      {lead.lastContact
                        ? displayDate.format(new Date(lead.lastContact))
                        : '—'}
                    </dd>
                  </dl>
                </section>

                <section
                  className={cardClass}
                  aria-labelledby="lead-contact-heading"
                >
                  <h2
                    id="lead-contact-heading"
                    className="mb-4 font-semibold text-white"
                  >
                    Contato
                  </h2>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 break-words text-sm [&>dt]:text-slate-400">
                    <dt>Nome</dt>
                    <dd>{lead.contactName ?? '—'}</dd>
                    <dt>E-mail</dt>
                    <dd>{lead.email ?? '—'}</dd>
                    <dt>Telefone</dt>
                    <dd>{lead.phone ?? lead.telefone ?? '—'}</dd>
                  </dl>
                </section>
              </div>

              <div className="min-w-0 space-y-5">
                <section
                  className={cardClass}
                  aria-labelledby="lead-history-heading"
                >
                  <h2
                    id="lead-history-heading"
                    className="mb-4 font-semibold text-white"
                  >
                    Histórico de interações
                  </h2>
                  {historyError && (
                    <p role="alert" className="text-sm text-rose-300">
                      {historyError}
                    </p>
                  )}
                  {!interactions && !historyError && (
                    <p role="status" className="text-sm text-slate-400">
                      Carregando histórico…
                    </p>
                  )}
                  {interactions?.length === 0 && (
                    <p className="text-sm text-slate-400">
                      Nenhuma interação registrada.
                    </p>
                  )}
                  {interactions && interactions.length > 0 && (
                    <ol className="divide-y divide-slate-800">
                      {interactions.map((interaction) => {
                        const kind = interaction.type
                          ? interactionKinds[interaction.type]
                          : null;
                        const Icon = kind?.icon ?? Info;
                        return (
                          <li
                            key={interaction.id}
                            className="flex gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-300">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                <h3 className="text-sm font-medium">
                                  {kind?.label ?? 'Interação'}
                                </h3>
                                <time
                                  dateTime={interaction.interactionDate}
                                  className="text-xs text-slate-400"
                                >
                                  {displayDateTime.format(
                                    new Date(interaction.interactionDate),
                                  )}
                                </time>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-300">
                                {interaction.annotation}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>

                {interactions && (
                  <section
                    className={cardClass}
                    aria-labelledby="new-interaction-heading"
                  >
                    <h2
                      id="new-interaction-heading"
                      className="mb-4 font-semibold text-white"
                    >
                      Nova interação
                    </h2>
                    <form onSubmit={registerInteraction}>
                      <fieldset
                        disabled={submitting}
                        className="space-y-4 disabled:opacity-70"
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="text-sm text-slate-300">
                            Tipo
                            <select
                              name="type"
                              className={fieldClass}
                              defaultValue=""
                              required
                            >
                              <option value="" disabled>
                                Selecione o tipo
                              </option>
                              {interactionTypes.map((type) => (
                                <option key={type} value={type}>
                                  {interactionKinds[type].label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm text-slate-300">
                            Data
                            <input
                              type="date"
                              name="date"
                              defaultValue={today}
                              max={today}
                              required
                              className={`${fieldClass} [color-scheme:dark]`}
                            />
                          </label>
                        </div>
                        <label className="block text-sm text-slate-300">
                          Anotação
                          <textarea
                            name="annotation"
                            rows={4}
                            required
                            className={fieldClass}
                          />
                        </label>
                        {interactionError && (
                          <p role="alert" className="text-sm text-rose-300">
                            {interactionError}
                          </p>
                        )}
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                          >
                            {submitting
                              ? 'Registrando…'
                              : 'Registrar interação'}
                          </button>
                        </div>
                      </fieldset>
                    </form>
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

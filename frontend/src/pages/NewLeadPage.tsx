import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { CancelButton, SaveButton } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AlertBox } from '../components/ui/Chip';
import { Input, Select } from '../components/forms/FormField';
import type { User } from '../../../backend/src/models/user';
import { ApiError, request, sessionKey } from '../api';

const SEGMENT_OPTIONS = [
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'energia', label: 'Energia' },
  { value: 'saude', label: 'Saúde' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'varejo', label: 'Varejo' },
  { value: 'educacao', label: 'Educação' },
  { value: 'industria', label: 'Indústria' },
  { value: 'outro', label: 'Outro' },
];

const ORIGIN_OPTIONS = [
  { value: 'indicacao', label: 'Indicação' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'evento', label: 'Evento' },
  { value: 'redes_sociais', label: 'Redes Sociais' },
  { value: 'outro', label: 'Outro' },
];

type Responsible = Pick<User, 'id' | 'name'>;

export const NewLeadPage: React.FC = () => {
  const navigate = useNavigate();
  const token = sessionStorage.getItem(sessionKey);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    segmento: '',
    origem: '',
    responsibleUserId: '',
    contactName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [responsibles, setResponsibles] = useState<Responsible[] | null>(null);
  const [responsiblesError, setResponsiblesError] = useState('');

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    request<{ user: Pick<User, 'id' | 'name' | 'role'> }>('/auth/me', options, token)
      .then(({ user }) => user.role === 'COMERCIAL'
        ? [user]
        : request<Responsible[]>('/users/commercial', options, token))
      .then((users) => {
        if (controller.signal.aborted) return;
        setResponsibles(users);
        if (users.length === 1) {
          setFormData((current) => ({ ...current, responsibleUserId: String(users[0].id) }));
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          sessionStorage.removeItem(sessionKey);
          navigate('/login', { replace: true });
          return;
        }
        setResponsiblesError(error instanceof ApiError ? error.message : 'Não foi possível carregar os responsáveis.');
      });
    return () => controller.abort();
  }, [navigate, token]);

  const handleBack = () => {
    navigate('/funil');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da empresa é obrigatório';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Informe um e-mail válido';
    }

    if (!formData.email && !formData.phone) {
      newErrors.contact = 'Informe pelo menos um e-mail ou telefone';
    }

    if (!formData.responsibleUserId) {
      newErrors.responsibleUserId = 'Selecione um responsável';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || submitting || !responsibles?.length || !validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      await request('/leads', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          contactName: formData.contactName.trim() || undefined,
          responsibleUserId: Number(formData.responsibleUserId),
        }),
      }, token);
      navigate('/funil');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        sessionStorage.removeItem(sessionKey);
        navigate('/login', { replace: true });
        return;
      }
      const errorMessage = error instanceof ApiError ? error.message : 'Não foi possível criar o lead.';

      // Tratar erros específicos da API
      if (errorMessage.includes('e-mail já está cadastrado')) {
        setErrors({ email: 'Este e-mail já está cadastrado em outro lead' });
      } else if (errorMessage.includes('responsável')) {
        setErrors({ responsibleUserId: 'Informe um responsável válido' });
      } else if (errorMessage.includes('pelo menos um e-mail ou telefone')) {
        setErrors({ contact: 'Informe pelo menos um e-mail ou telefone' });
      } else if (errorMessage.includes('e-mail válido')) {
        setErrors({ email: 'Informe um e-mail válido' });
      } else if (errorMessage.includes('nome do lead é obrigatório')) {
        setErrors({ name: 'Nome da empresa é obrigatório' });
      } else {
        setErrors({ form: errorMessage });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if ((field === 'email' || field === 'phone') && errors.contact) {
      setErrors(prev => ({ ...prev, contact: '' }));
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Novo lead"
        subtitle="Um novo contato, uma nova oportunidade. Comece pelas informações essenciais."
        showBackButton
        backAction={handleBack}
      />

      {/* Card do formulário - largura fixa 792px */}
      <Card padding="form" style={{ width: '792px', maxWidth: '100%' }}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Cabeçalho do formulário */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="card-title">Informações do lead</h2>
            <span className="required-note">* Campos obrigatórios</span>
          </div>

          {/* Erros gerais */}
          {(errors.contact || errors.form) && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>{errors.contact || errors.form}</span>
            </div>
          )}

          {/* Dados da empresa */}
          <div className="flex flex-col gap-5">
            <Input
              label="Nome da empresa *"
              placeholder="Ex.: Aurora Tech"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={errors.name}
              required
              autoFocus
            />

            <div className="flex gap-5">
              <Select
                label="Segmento"
                placeholder="Selecione o segmento"
                options={SEGMENT_OPTIONS}
                value={formData.segmento}
                onChange={(e) => handleChange('segmento', e.target.value)}
                style={{ flex: 1 }}
              />
              <Select
                label="Origem (opcional)"
                placeholder="Como o lead chegou?"
                options={ORIGIN_OPTIONS}
                value={formData.origem}
                onChange={(e) => handleChange('origem', e.target.value)}
                style={{ flex: 1 }}
              />
            </div>

            <Select
              label="Responsável *"
              placeholder="Selecione um responsável"
              options={(responsibles ?? []).map(({ id, name }) => ({ value: String(id), label: name }))}
              value={formData.responsibleUserId}
              onChange={(e) => handleChange('responsibleUserId', e.target.value)}
              disabled={!responsibles?.length || submitting}
              error={errors.responsibleUserId || responsiblesError || (responsibles?.length === 0 ? 'Nenhum usuário do Comercial cadastrado.' : undefined)}
              required
            />
          </div>

          {/* Contato principal */}
          <div className="border-t border-[var(--border)] pt-6 flex flex-col gap-5">
            <h3 className="form-section-title">Contato principal</h3>

            <Input
              label="Nome do contato"
              placeholder="Nome e sobrenome"
              value={formData.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
            />

            <div className="flex gap-5">
              <Input
                label="E-mail"
                placeholder="contato@empresa.com.br"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={errors.email}
                type="email"
              />
              <Input
                label="Telefone"
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                type="tel"
              />
            </div>
          </div>

          {/* Caixa de aviso */}
          <AlertBox icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          }>
            O lead novo entra automaticamente na etapa Prospecção.
          </AlertBox>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <CancelButton type="button" onClick={handleBack} disabled={submitting}>
              Cancelar
            </CancelButton>
            <SaveButton type="submit" disabled={submitting || !responsibles?.length}>
              {submitting ? 'Salvando...' : 'Salvar lead'}
            </SaveButton>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default NewLeadPage;

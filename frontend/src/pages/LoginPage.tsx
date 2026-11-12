import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, request, sessionKey } from '../api';
import { 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  History, 
  Mail, 
  Lock 
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError('');
    try {
      const { token } = await request<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      sessionStorage.setItem(sessionKey, token);
      navigate('/funil');
    } catch (error) {
      setError(error instanceof ApiError ? error.message : 'Não foi possível conectar à API.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 font-sans bg-white text-slate-900">
      {/* Painel Esquerdo - Institucional (Fundo Preto) */}
      <div className="lg:col-span-5 bg-black text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        
        <div className="relative z-10">
          {/* Logo IncludeLeads */}
          <div className="flex items-center gap-3 mb-16">
            {/* Ícone Laranja (Símbolo da Include) */}
            <div className="text-orange-600">
              <svg 
                className="w-10 h-10" 
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
                <path 
                  d="M28.5 23.5H23.5V28.5H28.5V23.5Z" 
                  fill="currentColor"
                />
              </svg>
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight block text-white">
                Include<span className="text-orange-600">Leads</span>
              </span>
              <span className="text-[11px] tracking-widest text-slate-400 font-medium uppercase block">
                SEU PRÓXIMO NEGÓCIO
              </span>
            </div>
          </div>

          {/* Destaque com Traço Laranja */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-0.5 bg-orange-600 rounded-full"></div>
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
              RELACIONAMENTOS QUE CRESCEM
            </span>
          </div>

          {/* Título Principal */}
          <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight text-white mb-5">
            Boas conexões.<br />
            Grandes negócios.
          </h1>
          
          {/* Subtítulo */}
          <p className="text-slate-300 text-base mb-10 max-w-md leading-relaxed">
            Seu próximo cliente começa com uma conversa. Organize seus leads e transforme cada contato em uma nova oportunidade.
          </p>

          {/* Lista de Features */}
          <div className="space-y-6 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-slate-900 text-orange-500">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Clareza em cada etapa</h2>
                <p className="text-sm text-slate-400">Todo o seu funil em um só lugar.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-slate-900 text-orange-500">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Relacionamentos em dia</h2>
                <p className="text-sm text-slate-400">O histórico certo para a próxima conversa.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Painel */}
        <div className="relative z-10 pt-12 flex items-center gap-2 text-sm text-slate-400">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span>Seus dados seguros. Seus negócios no controle.</span>
        </div>
      </div>

      {/* Painel Direito - Formulário (Fundo Branco com Destaques Laranja) */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Bom ter você de volta.
            </h2>
            <p className="text-base text-slate-600 mt-2.5">
              Entre na sua conta e dê o próximo passo nos seus negócios.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo E-mail */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-800 uppercase tracking-wide">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com.br"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-600/10 focus:border-orange-600 transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-800 uppercase tracking-wide">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-600/10 focus:border-orange-600 transition-all"
                />
              </div>
            </div>

            <div className="text-right">
              <a href="#forgot" className="text-sm font-medium text-slate-700 hover:text-orange-600 hover:underline">
                Esqueceu sua senha?
              </a>
            </div>

            {/* Botão Entrar (Laranja) */}
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-semibold py-3.5 px-6 rounded-xl text-base transition-all shadow-md shadow-orange-600/10 flex items-center justify-center gap-2 group"
            >
              <span>{pending ? 'Entrando…' : 'Entrar'}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Rodapé do Form */}
          <div className="pt-8 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              Ainda não tem acesso?{' '}
              <a href="#contact" className="font-semibold text-orange-600 hover:text-orange-700 hover:underline">
                Fale com sua equipe
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

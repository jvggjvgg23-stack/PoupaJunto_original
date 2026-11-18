import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, KeyRound, Lock, Mail, Moon, ShieldAlert, Sun, X } from 'lucide-react';
import { api, setStoredToken } from '../services/api';
import { getKnownLocalGoogleProfiles } from '../services/googleAuth';
import { normalizeGmailInput } from '../shared/gmailParser';
import type { Profile, ThemePreference } from '../shared/types';
import { GoogleSignInButton } from './GoogleSignInButton';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthViewProps {
  theme: ThemePreference;
  onToggleTheme: () => void;
  onAuthenticated: (user: Profile, options?: { openEmails?: boolean }) => void;
}

type AuthMode = 'login' | 'register' | 'recover';

export const AuthView: React.FC<AuthViewProps> = ({ theme, onToggleTheme, onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [institution, setInstitution] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Recuperação de senha local
  const [recoverySentEmail, setRecoverySentEmail] = useState<string | null>(null);
  const [generatedLocalKey, setGeneratedLocalKey] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pendingSendConfirmation, setPendingSendConfirmation] = useState<string | null>(null);

  // Modal local de conta Google (sem API Key ou OAuth externo)
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('jvggjvgg23@gmail.com');
  const [googleName, setGoogleName] = useState('');

  const knownGoogleProfiles = getKnownLocalGoogleProfiles();

  const prepareRecoverySend = () => {
    setError(null);
    setNotice(null);
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setError('Informe um e-mail cadastrado válido para gerar a chave de recuperação.');
      return;
    }
    setPendingSendConfirmation(targetEmail);
  };

  const confirmRecoverySend = async () => {
    if (!pendingSendConfirmation) return;
    const targetEmail = pendingSendConfirmation;
    setPendingSendConfirmation(null);
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await api.auth.recover(targetEmail);
      setRecoverySentEmail(res.sentTo);
      setGeneratedLocalKey(res.recoveryKey);
      setEmail(res.sentTo);
      setNotice(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar a chave de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'recover' && !recoverySentEmail) {
      prepareRecoverySend();
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.auth.login({ email, password });
        setStoredToken(res.token);
        onAuthenticated(res.user);
      } else if (mode === 'register') {
        const res = await api.auth.register({
          email,
          password,
          display_name: displayName,
          full_name: displayName,
          institution,
        });
        setStoredToken(res.token);
        onAuthenticated(res.user);
      } else if (recoverySentEmail) {
        const res = await api.auth.resetPassword({
          email: recoverySentEmail,
          recoveryKey,
          newPassword,
        });
        setStoredToken(res.token);
        onAuthenticated(res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir a operação.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.login({ email: demoEmail, password: demoPass });
      setStoredToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao acessar conta de demonstração.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalGoogleSubmit = async (
    selectedEmail: string,
    selectedName?: string,
    openEmails = false
  ) => {
    setError(null);
    setNotice(null);
    const normalized = normalizeGmailInput(selectedEmail);
    if (!normalized || !normalized.includes('@') || !normalized.includes('.')) {
      setError('Digite um e-mail válido (ex.: seunome@gmail.com).');
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.loginWithGoogle({
        email: normalized,
        name: selectedName,
      });
      setStoredToken(res.token);
      setShowGoogleModal(false);
      onAuthenticated(res.user, { openEmails });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar com esta conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] transition-colors dark:bg-[#0B1120] dark:text-[#F1F5F9]">
      {/* Selo Permanente de Transparência */}
      <div className="border-b border-slate-200 bg-white px-4 py-2 text-center text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-[#1E293B] dark:text-slate-300">
        Ambiente de Simulação Educativa — Sem Movimentação de Dinheiro Real · Tech Minds · SENAI Jaú-SP · INTEGRA SENAI 2026
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-36px)] max-w-6xl grid-cols-1 items-stretch gap-8 px-4 py-6 lg:grid-cols-12 lg:py-10">
        {/* Coluna Editorial / Visual */}
        <div className="flex flex-col justify-between gap-6 lg:col-span-6 lg:py-4">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/icon.svg"
                  alt="Ícone PoupaJ"
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-xl object-cover shadow-xs"
                />
                <span className="font-display text-xl font-extrabold tracking-tight text-[#15370D] dark:text-[#76C457]">
                  PoupaJunto
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PWAInstallButton compact />
                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#1E293B] dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">
                Educação Financeira Coletiva · Jovens 16 a 24 anos
              </p>
              <h1
                className="font-display text-3xl font-bold leading-tight tracking-tight text-[#0F172A] sm:text-4xl dark:text-white"
                style={{ textWrap: 'balance' }}
              >
                Organize metas em grupo com pactos transparentes antes de lidar com compromissos reais.
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                Simule formaturas, viagens técnicas e projetos de turma em rodadas guiadas. Teste cenários de atraso,
                calcule reservas coletivas e pratique cidadania financeira sem usar dinheiro real.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#1E293B]">
            <img
              src="/src/assets/images/poupajunto_hero_green_1794936351697.jpg"
              alt="Estudantes planejando metas financeiras coletivas em sala de aula"
              referrerPolicy="no-referrer"
              className="aspect-video w-full object-cover"
            />
            <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-4 sm:grid-cols-3 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold text-[#15370D] dark:text-[#76C457]">Pactos Visíveis</p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Regras de atraso e saída combinadas antes do Ciclo 1.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">Simulador &ldquo;E Se?&rdquo;</p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Teste o impacto de imprevistos e reservas no prazo final.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">Salvamento Local</p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Funciona offline e salva seus dados automaticamente sem API keys.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Formulário de Acesso */}
        <div className="flex flex-col justify-center lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-[#1E293B]"
          >
            {/* Segmented Mode Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setNotice(null);
                }}
                className={`min-h-[44px] flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-white text-[#15370D] shadow-sm dark:bg-[#1E293B] dark:text-[#76C457]'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setNotice(null);
                }}
                className={`min-h-[44px] flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition whitespace-nowrap ${
                  mode === 'register'
                    ? 'bg-white text-[#15370D] shadow-sm dark:bg-[#1E293B] dark:text-[#76C457]'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Criar Conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('recover');
                  setError(null);
                  setNotice(null);
                }}
                className={`min-h-[44px] flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition whitespace-nowrap ${
                  mode === 'recover'
                    ? 'bg-white text-[#15370D] shadow-sm dark:bg-[#1E293B] dark:text-[#76C457]'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Recuperar Senha
              </button>
            </div>

            <div className="mt-6">
              <h2 className="font-display text-xl font-bold text-[#0F172A] dark:text-white">
                {mode === 'login' && 'Acesse sua conta educativa'}
                {mode === 'register' && 'Cadastro de Estudante (LGPD)'}
                {mode === 'recover' && 'Recuperação de acesso local'}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {mode === 'register'
                  ? 'Cadastro direto sem API key ou verificação externa e sem CPF ou dados bancários.'
                  : mode === 'recover'
                    ? 'Gere uma chave de recuperação de 8 caracteres entregue na Caixa de Entrada local do aplicativo.'
                    : 'Entre direto com e-mail e senha (sem verificação do Google) ou pelos perfis abaixo.'}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="mt-4 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{notice}</span>
                </div>
                {generatedLocalKey && mode === 'recover' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-300/70 bg-white/80 px-3 py-2 dark:border-emerald-800 dark:bg-slate-900/70">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Modo Local (sem servidor Gmail externo) · Chave:{' '}
                      </span>
                      <strong className="font-mono text-sm tracking-wider text-[#15370D] dark:text-[#76C457]">
                        {generatedLocalKey}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecoveryKey(generatedLocalKey)}
                      className="rounded-lg bg-[#2A7C13] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#15370D] dark:bg-[#76C457] dark:text-[#15370D]"
                    >
                      Preencher chave
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label
                      htmlFor="auth-display-name"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Nome de exibição
                    </label>
                    <input
                      id="auth-display-name"
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ex.: Mariana Oliveira"
                      className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-[#2A7C13] focus:ring-2 focus:ring-[#2A7C13]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-institution"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Turma ou instituição (opcional)
                    </label>
                    <input
                      id="auth-institution"
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="Ex.: SENAI Jaú-SP · 3º DS"
                      className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-[#2A7C13] focus:ring-2 focus:ring-[#2A7C13]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                    />
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  {mode === 'recover' ? 'E-mail cadastrado' : 'E-mail'}
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="auth-email"
                    type="email"
                    required
                    readOnly={mode === 'recover' && Boolean(recoverySentEmail)}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={mode === 'recover' ? 'ana.clara@aluno.senai.br' : 'seu.nome@gmail.com'}
                    className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-28 text-sm text-slate-900 outline-none focus:border-[#2A7C13] focus:ring-2 focus:ring-[#2A7C13]/20 read-only:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:read-only:bg-slate-800 dark:focus:border-[#76C457]"
                  />
                  {!(mode === 'recover' && Boolean(recoverySentEmail)) && !email.includes('@') && (
                    <button
                      type="button"
                      onClick={() =>
                        setEmail((v) =>
                          v.trim() ? `${v.trim().replace(/@.*/, '')}@gmail.com` : 'usuario@gmail.com'
                        )
                      }
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg bg-[#2A7C13]/12 px-2.5 py-1 text-[11px] font-bold text-[#15370D] hover:bg-[#2A7C13]/20 dark:bg-[#76C457]/20 dark:text-[#76C457]"
                    >
                      + @gmail.com
                    </button>
                  )}
                </div>
              </div>

              {mode === 'recover' && recoverySentEmail && (
                <>
                  <div>
                    <label
                      htmlFor="recovery-key"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Chave de recuperação (8 caracteres)
                    </label>
                    <div className="relative mt-1.5">
                      <KeyRound
                        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        id="recovery-key"
                        type="text"
                        required
                        minLength={6}
                        maxLength={12}
                        value={recoveryKey}
                        onChange={(e) => setRecoveryKey(e.target.value.toUpperCase())}
                        placeholder="Ex.: PJ7K9M2X"
                        className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pr-3.5 pl-10 font-mono text-sm tracking-wider uppercase text-slate-900 outline-none focus:border-[#2A7C13] focus:ring-2 focus:ring-[#2A7C13]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="new-password"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Nova senha
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-[#2A7C13] focus:ring-2 focus:ring-[#2A7C13]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                    />
                  </div>
                </>
              )}

              {mode !== 'recover' && (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Senha
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('recover');
                          setError(null);
                          setNotice(null);
                        }}
                        className="text-xs font-semibold text-[#2A7C13] hover:underline dark:text-[#76C457]"
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-[#2A7C13] focus:ring-2 focus:ring-[#2A7C13]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#2A7C13] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#15370D] disabled:opacity-60 dark:bg-[#76C457] dark:text-[#15370D] dark:hover:bg-[#76C457]/90"
              >
                <span>
                  {loading
                    ? 'Processando...'
                    : mode === 'login'
                      ? 'Entrar no PoupaJunto'
                      : mode === 'register'
                        ? 'Criar Conta de Estudante'
                        : recoverySentEmail
                          ? 'Validar chave e redefinir senha'
                          : 'Gerar chave de recuperação'}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              {mode === 'recover' && recoverySentEmail && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => prepareRecoverySend()}
                    className="font-semibold text-[#2A7C13] hover:underline dark:text-[#76C457]"
                  >
                    Gerar nova chave
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setRecoverySentEmail(null);
                      setGeneratedLocalKey(null);
                      setRecoveryKey('');
                      setNewPassword('');
                      setNotice(null);
                      setError(null);
                    }}
                    className="font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Trocar e-mail
                  </button>
                </div>
              )}
            </form>

            {mode !== 'recover' && (
              <div className="mt-4 space-y-3">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <span className="relative bg-white px-3 text-[11px] font-medium text-slate-500 dark:bg-[#1E293B] dark:text-slate-400">
                    ou entre com conta Google local
                  </span>
                </div>
                <GoogleSignInButton
                  onClick={() => {
                    setError(null);
                    setShowGoogleModal(true);
                  }}
                  disabled={loading}
                  label="Entrar com o Google"
                />
              </div>
            )}

            {/* Acesso Rápido por Perfil para Demonstração */}
            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Acesso rápido por perfil (INTEGRA SENAI 2026)</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('ana.clara@aluno.senai.br', 'Aluno@2026')}
                  aria-label="Entrar como Estudante"
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-[#2A7C13] hover:bg-[#2A7C13]/10 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-[#76C457]"
                >
                  Estudante
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('prof.marcos@senai.br', 'Senai@2026')}
                  aria-label="Entrar como Educador"
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-[#15370D] hover:bg-[#15370D]/10 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-[#76C457]"
                >
                  Educador
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('superadmin@poupajunto.senai.br', 'TechMinds@2026')}
                  aria-label="Entrar como Superadmin"
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-[#2A7C13] hover:bg-[#76C457]/20 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-[#76C457]"
                >
                  Superadmin
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modal explícito de confirmação antes de gerar chave de recuperação */}
      {pendingSendConfirmation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-recovery-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#1E293B]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2A7C13]/12 text-[#15370D] dark:bg-[#76C457]/15 dark:text-[#76C457]">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3
              id="confirm-recovery-title"
              className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              Confirmar geração da chave de recuperação
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Deseja gerar uma chave temporária de recuperação (válida por 15 minutos) para{' '}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {pendingSendConfirmation}
              </strong>{' '}
              e entregá-la na Caixa de Entrada local do PoupaJunto?
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingSendConfirmation(null)}
                className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmRecoverySend()}
                className="min-h-[44px] rounded-xl bg-[#2A7C13] px-4 py-2 text-xs font-semibold text-white hover:bg-[#15370D] dark:bg-[#76C457] dark:text-[#15370D]"
              >
                Gerar chave agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal local para entrar com conta Google sem API KEY ou verificação externa */}
      {showGoogleModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-local-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#1E293B]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">
                  Acesso Google Local · Sem API Key
                </p>
                <h3
                  id="google-local-title"
                  className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white"
                >
                  Escolha ou informe sua conta
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                aria-label="Fechar janela de acesso Google local"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Funciona 100% offline no armazenamento local, sem pedir senha do Google, sem API keys e sem tela de verificação externa.
            </p>

            <div className="mt-4 space-y-2">
              {knownGoogleProfiles.map((prof) => (
                <button
                  key={prof.email}
                  type="button"
                  disabled={loading}
                  onClick={() => void handleLocalGoogleSubmit(prof.email, prof.name)}
                  className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-left transition hover:border-[#2A7C13] hover:bg-[#2A7C13]/10 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#76C457]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {prof.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {prof.email}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#2A7C13] dark:text-[#76C457]" />
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleLocalGoogleSubmit(googleEmail, googleName, false);
              }}
              className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800"
            >
              <div>
                <label
                  htmlFor="local-google-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Ou digite qualquer e-mail (@gmail.com ou outro)
                </label>
                <div className="relative mt-1">
                  <input
                    id="local-google-email"
                    type="text"
                    required
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="seu.nome@gmail.com"
                    className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pr-28 text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  {!googleEmail.includes('@') && (
                    <button
                      type="button"
                      onClick={() =>
                        setGoogleEmail((v) =>
                          v.trim() ? `${v.trim().replace(/@.*/, '')}@gmail.com` : 'usuario@gmail.com'
                        )
                      }
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg bg-[#2A7C13]/15 px-2 py-0.5 text-[11px] font-bold text-[#15370D] dark:bg-[#76C457]/20 dark:text-[#76C457]"
                    >
                      + @gmail.com
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label
                  htmlFor="local-google-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Nome de exibição (opcional)
                </label>
                <input
                  id="local-google-name"
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="Ex.: João Vitor"
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="min-h-[44px] flex-1 rounded-xl bg-[#2A7C13] px-4 py-2 text-xs font-semibold text-white hover:bg-[#15370D] disabled:opacity-60 dark:bg-[#76C457] dark:text-[#15370D]"
                >
                  {loading ? 'Entrando...' : 'Entrar com este e-mail'}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleLocalGoogleSubmit(googleEmail, googleName, true)}
                  className="min-h-[44px] rounded-xl border border-[#2A7C13]/40 bg-[#2A7C13]/10 px-3.5 py-2 text-xs font-semibold text-[#15370D] hover:bg-[#2A7C13]/20 disabled:opacity-60 dark:border-[#76C457]/40 dark:bg-[#76C457]/15 dark:text-[#76C457]"
                >
                  Ver E-mails
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

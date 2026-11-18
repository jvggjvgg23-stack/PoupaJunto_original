import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Forward,
  Inbox,
  LogOut,
  Mail,
  MailOpen,
  PenSquare,
  Plus,
  RefreshCw,
  Reply,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  getAccessToken,
  getCurrentGoogleUser,
  googleLogout,
  googleSignIn,
  listSavedGmailAccounts,
  type LocalGoogleUser,
} from '../services/googleAuth';
import {
  deleteGmailMessageForever,
  getGmailMessageDetail,
  GmailUnauthorizedError,
  listGmailMessages,
  restoreGmailMessage,
  sendGmailMessage,
  toggleGmailStar,
  toggleGmailUnread,
  trashGmailMessage,
  type MailFolder,
} from '../services/gmail';
import { normalizeGmailInput, type ParsedGmailMessage } from '../shared/gmailParser';
import { GoogleSignInButton } from './GoogleSignInButton';

interface EmailsViewProps {
  onEmailsUpdated?: () => void;
}

const FOLDER_TABS: Array<{ id: MailFolder; label: string }> = [
  { id: 'inbox', label: 'Caixa de Entrada' },
  { id: 'starred', label: 'Com Estrela' },
  { id: 'sent', label: 'Enviados' },
  { id: 'all', label: 'Todos' },
  { id: 'trash', label: 'Lixeira' },
];

export const EmailsView: React.FC<EmailsViewProps> = ({ onEmailsUpdated }) => {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<LocalGoogleUser | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<
    Array<{ email: string; name: string; unreadCount: number }>
  >([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [customEmailInput, setCustomEmailInput] = useState('');
  const [showAddAccountBar, setShowAddAccountBar] = useState(false);

  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [messages, setMessages] = useState<ParsedGmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ParsedGmailMessage | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Modal Escrever E-mail
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);

  const refreshSavedAccounts = useCallback(() => {
    setSavedAccounts(listSavedGmailAccounts());
    onEmailsUpdated?.();
  }, [onEmailsUpdated]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      setSavedAccounts(listSavedGmailAccounts());
      const existingToken = await getAccessToken();
      if (!mounted) return;
      if (existingToken) {
        setToken(existingToken);
        setGoogleUser(getCurrentGoogleUser());
        setNeedsAuth(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const loadMessages = useCallback(
    async (accessToken: string, query: string, activeFolder: MailFolder) => {
      setLoadingList(true);
      setError(null);
      try {
        const items = await listGmailMessages({
          accessToken,
          query,
          folder: activeFolder,
          maxResults: 50,
        });
        setMessages(items);
        if (items.length > 0) {
          setSelectedMessage((prev) =>
            prev ? items.find((m) => m.id === prev.id) ?? null : null
          );
        } else {
          setSelectedMessage(null);
        }
        refreshSavedAccounts();
      } catch (err) {
        if (err instanceof GmailUnauthorizedError) {
          setToken(null);
          setNeedsAuth(true);
          setMessages([]);
          setSelectedMessage(null);
        }
        setError(err instanceof Error ? err.message : 'Não foi possível carregar os e-mails.');
      } finally {
        setLoadingList(false);
      }
    },
    [refreshSavedAccounts]
  );

  useEffect(() => {
    if (token && !needsAuth) {
      void loadMessages(token, activeQuery, folder);
    }
  }, [token, needsAuth, activeQuery, folder, loadMessages]);

  const handleConnectAccount = async (email?: string, name?: string) => {
    setIsLoggingIn(true);
    setError(null);
    setNotice(null);
    try {
      const result = await googleSignIn({ email, name });
      setGoogleUser(result.user);
      setToken(result.accessToken);
      setNeedsAuth(false);
      setShowAddAccountBar(false);
      setCustomEmailInput('');
      setSelectedMessage(null);
      setFolder('inbox');
      refreshSavedAccounts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao conectar sua caixa de e-mails.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSubmitCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeGmailInput(customEmailInput);
    if (!normalized) {
      setError('Digite um endereço de e-mail ou nome de usuário @gmail.com.');
      return;
    }
    void handleConnectAccount(normalized);
  };

  const handleSelectMessage = async (msg: ParsedGmailMessage) => {
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setSelectedMessage(msg);
    setLoadingDetail(true);
    setError(null);
    try {
      const full = await getGmailMessageDetail({ accessToken: token, messageId: msg.id });
      setSelectedMessage(full);
      setMessages((prev) => prev.map((item) => (item.id === full.id ? full : item)));
      refreshSavedAccounts();
    } catch (err) {
      if (err instanceof GmailUnauthorizedError) {
        setToken(null);
        setNeedsAuth(true);
        setSelectedMessage(null);
      }
      setError(err instanceof Error ? err.message : 'Erro ao abrir conteúdo do e-mail.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggleStar = async (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    try {
      const updated = await toggleGmailStar(msgId);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      if (selectedMessage?.id === updated.id) {
        setSelectedMessage(updated);
      }
      if (folder === 'starred' && !updated.starred && token) {
        void loadMessages(token, activeQuery, folder);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao favoritar mensagem.');
    }
  };

  const handleToggleUnread = async (msgId: string) => {
    try {
      const updated = await toggleGmailUnread(msgId);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      if (selectedMessage?.id === updated.id) {
        setSelectedMessage(updated);
      }
      refreshSavedAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar status de leitura.');
    }
  };

  const handleMoveToTrash = async (msgId: string) => {
    try {
      await trashGmailMessage(msgId);
      setSelectedMessage(null);
      setNotice('Mensagem movida para a Lixeira.');
      if (token) {
        await loadMessages(token, activeQuery, folder);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir mensagem.');
    }
  };

  const handleRestoreFromTrash = async (msgId: string) => {
    try {
      await restoreGmailMessage(msgId);
      setSelectedMessage(null);
      setNotice('Mensagem restaurada para sua caixa original.');
      if (token) {
        await loadMessages(token, activeQuery, folder);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao restaurar mensagem.');
    }
  };

  const handleDeleteForever = async (msgId: string) => {
    try {
      await deleteGmailMessageForever(msgId);
      setSelectedMessage(null);
      setNotice('Mensagem removida permanentemente.');
      if (token) {
        await loadMessages(token, activeQuery, folder);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover mensagem.');
    }
  };

  const openCompose = (prefill?: { to?: string; subject?: string; body?: string }) => {
    setComposeTo(prefill?.to ?? '');
    setComposeSubject(prefill?.subject ?? '');
    setComposeBody(prefill?.body ?? '');
    setError(null);
    setComposeOpen(true);
  };

  const handleReply = (msg: ParsedGmailMessage) => {
    openCompose({
      to: msg.fromEmail || msg.fromName,
      subject: msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
      body: `\n\n--- Mensagem original de ${msg.fromName} ---\n${msg.bodyText || msg.snippet}`,
    });
  };

  const handleForward = (msg: ParsedGmailMessage) => {
    openCompose({
      to: '',
      subject: msg.subject.startsWith('Fwd:') ? msg.subject : `Fwd: ${msg.subject}`,
      body: `\n\n--- Mensagem encaminhada de ${msg.fromName} <${msg.fromEmail}> ---\n${msg.bodyText || msg.snippet}`,
    });
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSending(true);
    setError(null);
    try {
      const sent = await sendGmailMessage({
        accessToken: token,
        to: composeTo,
        subject: composeSubject,
        bodyText: composeBody,
      });
      setComposeOpen(false);
      setNotice(`E-mail enviado para ${sent.toEmail || composeTo}.`);
      refreshSavedAccounts();
      await loadMessages(token, activeQuery, folder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o e-mail.');
    } finally {
      setSending(false);
    }
  };

  const handleDisconnect = async () => {
    await googleLogout();
    setToken(null);
    setGoogleUser(null);
    setMessages([]);
    setSelectedMessage(null);
    setSearchInput('');
    setActiveQuery('');
    setError(null);
    setNotice(null);
    setNeedsAuth(true);
    refreshSavedAccounts();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchInput.trim());
  };

  if (needsAuth || !token) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">
            Caixa de Mensagens Gmail · Acesso Direto sem API Key
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Meus E-mails (Gmail)
          </h1>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-[#1E293B]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2A7C13]/12 text-[#15370D] dark:bg-[#76C457]/15 dark:text-[#76C457]">
            <Mail className="h-6 w-6" aria-hidden="true" />
          </div>

          <h2 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">
            Escolha sua conta @gmail.com ou informe qualquer e-mail
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Clique em uma conta abaixo para ver seus e-mails na hora, ou digite qualquer endereço
            Gmail/e-mail como em um aplicativo normal.
          </p>

          <div className="mt-5 space-y-2">
            {savedAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={isLoggingIn}
                onClick={() => void handleConnectAccount(acc.email, acc.name)}
                className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left transition hover:border-[#2A7C13] hover:bg-[#2A7C13]/10 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#76C457]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {acc.email}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {acc.name}
                    {acc.unreadCount > 0 ? ` · ${acc.unreadCount} não lida(s)` : ' · Ver mensagens'}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#2A7C13] dark:text-[#76C457]" />
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSubmitCustomAccount}
            className="mt-5 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800"
          >
            <label
              htmlFor="connect-any-gmail"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Ou digite qualquer e-mail (@gmail.com ou outro)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <input
                  id="connect-any-gmail"
                  type="text"
                  value={customEmailInput}
                  onChange={(e) => setCustomEmailInput(e.target.value)}
                  placeholder="ex.: seunome@gmail.com"
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-28 text-sm text-slate-900 outline-none focus:border-[#2A7C13] focus:ring-2 focus:ring-[#2A7C13]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                />
                {!customEmailInput.includes('@') && (
                  <button
                    type="button"
                    onClick={() =>
                      setCustomEmailInput((v) =>
                        v.trim() ? `${v.trim().replace(/@.*/, '')}@gmail.com` : 'usuario@gmail.com'
                      )
                    }
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg bg-[#2A7C13]/12 px-2.5 py-1 text-[11px] font-bold text-[#15370D] hover:bg-[#2A7C13]/20 dark:bg-[#76C457]/20 dark:text-[#76C457]"
                  >
                    + @gmail.com
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#2A7C13] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#15370D] whitespace-nowrap shrink-0 disabled:opacity-60 dark:bg-[#76C457] dark:text-[#15370D]"
              >
                <span>Abrir E-mails</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>

          <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
            <GoogleSignInButton
              onClick={() =>
                void handleConnectAccount(
                  customEmailInput.trim() || savedAccounts[0]?.email || 'jvggjvgg23@gmail.com'
                )
              }
              disabled={isLoggingIn}
              label={isLoggingIn ? 'Conectando...' : 'Entrar com o Google'}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho e Ações Principais */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">
            Gmail Local Conectado · {googleUser?.email} · Salvamento Automático
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Caixa de Entrada
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openCompose()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2A7C13] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#15370D] whitespace-nowrap shrink-0 dark:bg-[#76C457] dark:text-[#15370D]"
          >
            <PenSquare className="h-4 w-4" aria-hidden="true" />
            <span>Escrever</span>
          </button>
          <button
            type="button"
            onClick={() => void loadMessages(token, activeQuery, folder)}
            disabled={loadingList}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 whitespace-nowrap shrink-0 disabled:opacity-60 dark:border-slate-700 dark:bg-[#1E293B] dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Atualizar</span>
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 whitespace-nowrap shrink-0 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Trocar / Sair</span>
          </button>
        </div>
      </div>

      {/* Barra de Alternância Rápida de Contas @gmail.com */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-[#1E293B]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Contas Gmail:
            </span>
            {savedAccounts.map((acc) => {
              const isCurrent = googleUser?.email.toLowerCase() === acc.email.toLowerCase();
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => void handleConnectAccount(acc.email, acc.name)}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition ${
                    isCurrent
                      ? 'border-[#2A7C13] bg-[#2A7C13]/12 text-[#15370D] dark:border-[#76C457] dark:bg-[#76C457]/15 dark:text-[#76C457]'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#2A7C13]/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{acc.email}</span>
                  {acc.unreadCount > 0 && (
                    <span className="rounded-md bg-[#2A7C13] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white dark:bg-[#76C457] dark:text-[#15370D]">
                      {acc.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowAddAccountBar((v) => !v)}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-dashed border-[#2A7C13]/50 px-3 py-1 text-xs font-semibold text-[#2A7C13] transition hover:bg-[#2A7C13]/10 dark:border-[#76C457]/50 dark:text-[#76C457]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Usar qualquer @gmail.com</span>
          </button>
        </div>

        {showAddAccountBar && (
          <form
            onSubmit={handleSubmitCustomAccount}
            className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row dark:border-slate-800"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={customEmailInput}
                onChange={(e) => setCustomEmailInput(e.target.value)}
                aria-label="Digite qualquer e-mail para abrir a caixa"
                placeholder="Digite qualquer e-mail (ex.: joao.silva@gmail.com)"
                className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-28 text-xs text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              {!customEmailInput.includes('@') && (
                <button
                  type="button"
                  onClick={() =>
                    setCustomEmailInput((v) =>
                      v.trim() ? `${v.trim().replace(/@.*/, '')}@gmail.com` : 'usuario@gmail.com'
                    )
                  }
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg bg-[#2A7C13]/15 px-2 py-0.5 text-[11px] font-bold text-[#15370D] dark:bg-[#76C457]/20 dark:text-[#76C457]"
                >
                  + @gmail.com
                </button>
              )}
            </div>
            <button
              type="submit"
              className="min-h-[40px] rounded-xl bg-[#2A7C13] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#15370D] dark:bg-[#76C457] dark:text-[#15370D]"
            >
              Abrir Caixa
            </button>
          </form>
        )}
      </div>

      {/* Pastas e Busca */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          {FOLDER_TABS.map((tab) => {
            const active = folder === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFolder(tab.id);
                  setSelectedMessage(null);
                }}
                className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                  active
                    ? 'bg-white text-[#15370D] shadow-xs dark:bg-[#1E293B] dark:text-[#76C457]'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2 lg:max-w-md">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Buscar e-mails"
              placeholder="Buscar assunto, remetente ou texto..."
              className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-white pr-4 pl-10 text-xs text-slate-900 outline-none focus:border-[#2A7C13] focus:ring-2 focus:ring-[#2A7C13]/20 dark:border-slate-700 dark:bg-[#1E293B] dark:text-white dark:focus:border-[#76C457]"
            />
          </div>
          <button
            type="submit"
            disabled={loadingList}
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-[#2A7C13] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#15370D] whitespace-nowrap shrink-0 disabled:opacity-60 dark:bg-[#76C457] dark:text-[#15370D]"
          >
            Buscar
          </button>
          {activeQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setActiveQuery('');
              }}
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-[#1E293B] dark:text-slate-200"
            >
              Limpar
            </button>
          )}
        </form>
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Fechar aviso"
            className="text-emerald-700 hover:opacity-75 dark:text-emerald-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Lista de E-mails */}
        <div
          className={`rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#1E293B] lg:col-span-5 ${
            selectedMessage ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {activeQuery
                ? `Resultados para "${activeQuery}"`
                : FOLDER_TABS.find((t) => t.id === folder)?.label}
            </span>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {messages.length}
            </span>
          </div>

          {loadingList ? (
            <div className="space-y-3 p-4">
              <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : messages.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Inbox className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                Nenhum e-mail aqui
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {activeQuery
                  ? 'Tente outro termo de busca.'
                  : 'Clique em "Escrever" para enviar uma nova mensagem para qualquer e-mail.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {messages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const displayParty =
                  folder === 'sent' && msg.toEmail ? `Para: ${msg.toEmail}` : msg.fromName;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 px-3 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                      isSelected ? 'bg-[#2A7C13]/10 dark:bg-[#76C457]/12' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => void handleToggleStar(e, msg.id)}
                      aria-label={msg.starred ? 'Remover estrela' : 'Marcar com estrela'}
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          msg.starred ? 'fill-amber-400 text-amber-400' : ''
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleSelectMessage(msg)}
                      className="flex min-w-0 flex-1 flex-col gap-1 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          {msg.unread && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-[#2A7C13] dark:bg-[#76C457]"
                              title="Não lido"
                            />
                          )}
                          <span
                            className={`truncate text-xs ${
                              msg.unread
                                ? 'font-bold text-slate-900 dark:text-white'
                                : 'font-semibold text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {displayParty}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {msg.dateFormatted}
                        </span>
                      </div>
                      <p
                        className={`truncate text-sm ${
                          msg.unread
                            ? 'font-bold text-slate-900 dark:text-white'
                            : 'font-medium text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {msg.subject}
                      </p>
                      <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                        {msg.snippet}
                      </p>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leitor do E-mail Selecionado */}
        <div
          className={`rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-[#1E293B] lg:col-span-7 ${
            selectedMessage ? 'block' : 'hidden lg:block'
          }`}
        >
          {selectedMessage ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMessage(null)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-[#2A7C13] hover:underline lg:hidden dark:text-[#76C457]"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Voltar para a lista</span>
                </button>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleReply(selectedMessage)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#2A7C13] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#15370D] dark:bg-[#76C457] dark:text-[#15370D]"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    <span>Responder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleForward(selectedMessage)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Forward className="h-3.5 w-3.5" />
                    <span>Encaminhar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleUnread(selectedMessage.id)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <MailOpen className="h-3.5 w-3.5" />
                    <span>{selectedMessage.unread ? 'Marcar lida' : 'Marcar não lida'}</span>
                  </button>
                  {folder === 'trash' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleRestoreFromTrash(selectedMessage.id)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Restaurar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteForever(selectedMessage.id)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Excluir de vez</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleMoveToTrash(selectedMessage.id)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <h2 className="font-display text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                  {selectedMessage.subject}
                </h2>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="space-y-0.5">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedMessage.fromName}
                      </span>
                      {selectedMessage.fromEmail && (
                        <span className="ml-1.5 text-slate-500 dark:text-slate-400">
                          &lt;{selectedMessage.fromEmail}&gt;
                        </span>
                      )}
                    </div>
                    {selectedMessage.toEmail && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Para: <span className="font-medium">{selectedMessage.toEmail}</span>
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    {selectedMessage.dateFormatted}
                  </span>
                </div>
              </div>

              {loadingDetail ? (
                <div className="space-y-2.5 py-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              ) : (
                <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {selectedMessage.bodyText ||
                    selectedMessage.snippet ||
                    'Mensagem sem conteúdo de texto.'}
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <Mail className="h-10 w-10 text-slate-300 dark:text-slate-600" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Selecione um e-mail para ler
              </p>
              <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                Clique em qualquer mensagem da lista ou use o botão Escrever para enviar um e-mail
                para qualquer endereço.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Escrever E-mail */}
      {composeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="compose-email-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#1E293B]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <p className="text-[11px] font-semibold text-[#2A7C13] dark:text-[#76C457]">
                  De: {googleUser?.email}
                </p>
                <h2
                  id="compose-email-title"
                  className="font-display text-lg font-bold text-slate-900 dark:text-white"
                >
                  Escrever E-mail
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                aria-label="Fechar compositor"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="mt-4 space-y-3.5">
              <div>
                <label
                  htmlFor="compose-to"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Para (qualquer e-mail)
                </label>
                <div className="relative mt-1">
                  <input
                    id="compose-to"
                    type="text"
                    required
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="ex.: destinatario@gmail.com"
                    className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pr-28 text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  {!composeTo.includes('@') && (
                    <button
                      type="button"
                      onClick={() =>
                        setComposeTo((v) =>
                          v.trim() ? `${v.trim().replace(/@.*/, '')}@gmail.com` : 'contato@gmail.com'
                        )
                      }
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg bg-[#2A7C13]/15 px-2 py-0.5 text-[11px] font-bold text-[#15370D] dark:bg-[#76C457]/20 dark:text-[#76C457]"
                    >
                      + @gmail.com
                    </button>
                  )}
                </div>
                {savedAccounts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {savedAccounts.slice(0, 4).map((acc) => (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => setComposeTo(acc.email)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-[#2A7C13] hover:text-[#15370D] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        {acc.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="compose-subject"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Assunto
                </label>
                <input
                  id="compose-subject"
                  type="text"
                  required
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Assunto do e-mail"
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="compose-body"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Mensagem
                </label>
                <textarea
                  id="compose-body"
                  rows={5}
                  required
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Escreva sua mensagem..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#2A7C13] px-5 py-2 text-xs font-semibold text-white hover:bg-[#15370D] disabled:opacity-60 dark:bg-[#76C457] dark:text-[#15370D]"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>{sending ? 'Enviando...' : 'Enviar E-mail'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

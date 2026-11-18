import React, { useState } from 'react';
import {
  BookOpen,
  FileCheck2,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ShieldCheck,
  Sliders,
  Sun,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import type { Profile, ThemePreference } from '../shared/types';
import { Avatar } from './Avatar';
import { PWAInstallButton } from './PWAInstallButton';

export type NavTabId =
  | 'dashboard'
  | 'groups'
  | 'pacts'
  | 'what-if'
  | 'education'
  | 'workshop'
  | 'emails'
  | 'profile'
  | 'admin';

interface NavigationShellProps {
  user: Profile;
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  onOpenNewGroup: () => void;
  theme: ThemePreference;
  onToggleTheme: () => void;
  onLogout: () => void;
  pendingPactsCount: number;
  unreadEmailsCount?: number;
  connectedEmail?: string;
  children: React.ReactNode;
}

interface NavItem {
  id: NavTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  adminOnly?: boolean;
}

export const NavigationShell: React.FC<NavigationShellProps> = ({
  user,
  activeTab,
  onSelectTab,
  onOpenNewGroup,
  theme,
  onToggleTheme,
  onLogout,
  pendingPactsCount,
  unreadEmailsCount = 0,
  connectedEmail,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const sidebarItems: NavItem[] = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'groups', label: 'Meus Grupos', icon: Users },
    { id: 'pacts', label: 'Pactos de Regras', icon: FileCheck2, badge: pendingPactsCount },
    { id: 'what-if', label: 'Simulador "E Se?"', icon: Sliders },
    { id: 'education', label: 'Trilhas e Pílulas', icon: BookOpen },
    { id: 'workshop', label: 'Modo Oficina (PIN)', icon: GraduationCap },
    { id: 'emails', label: 'E-mails (Gmail)', icon: Mail, badge: unreadEmailsCount },
    { id: 'profile', label: 'Meu Perfil', icon: UserCircle },
    { id: 'admin', label: 'Painel Superadmin', icon: ShieldCheck, adminOnly: true },
  ];

  const activeEmailLabel = connectedEmail || user.email;

  const visibleSidebarItems = sidebarItems.filter(
    (item) => !item.adminOnly || user.role === 'superadmin'
  );

  const roleLabel =
    user.role === 'superadmin' ? 'Superadmin' : user.role === 'educador' ? 'Educador' : 'Estudante';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] transition-colors dark:bg-[#0B1120] dark:text-[#F1F5F9]">
      {/* Desktop / Tablet Sidebar (>= 768px) */}
      <aside
        aria-label="Menu principal lateral"
        className={`no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-white transition-all duration-200 md:flex dark:border-slate-800 dark:bg-[#1E293B] ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 overflow-hidden text-left"
          >
            <img
              src="/icon.svg"
              alt="PoupaJ"
              referrerPolicy="no-referrer"
              className="h-9 w-9 shrink-0 rounded-lg object-cover shadow-xs"
            />
            {!sidebarCollapsed && (
              <span className="font-display text-lg font-extrabold tracking-tight text-[#15370D] whitespace-nowrap dark:text-[#76C457]">
                PoupaJunto
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <div className="px-3 pt-4">
          <button
            type="button"
            onClick={onOpenNewGroup}
            className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#15370D] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#2A7C13] whitespace-nowrap dark:bg-[#76C457] dark:text-[#15370D] dark:hover:bg-[#76C457]/90 ${
              sidebarCollapsed ? 'px-0' : ''
            }`}
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!sidebarCollapsed && <span>Novo Grupo Coletivo</span>}
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {visibleSidebarItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[44px] w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition whitespace-nowrap ${
                  active
                    ? 'bg-[#2A7C13]/12 text-[#15370D] dark:bg-[#76C457]/15 dark:text-[#76C457]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3 overflow-hidden">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </span>
                {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="font-mono text-[11px] font-bold text-[#2A7C13] dark:text-[#76C457]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800">
          {!sidebarCollapsed && (
            <div className="flex justify-center">
              <PWAInstallButton />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-900/60">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
              <button
                type="button"
                onClick={() => onSelectTab('profile')}
                aria-label="Abrir Meu Perfil"
                className="shrink-0"
              >
                <Avatar src={user.avatar_url} name={user.display_name} size="sm" />
              </button>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelectTab('profile')}
                    className="block w-full truncate text-left text-xs font-semibold text-slate-900 hover:underline dark:text-slate-100"
                  >
                    {user.display_name}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('emails')}
                    title="Abrir meus e-mails"
                    className="block w-full truncate text-left text-[11px] font-medium text-[#2A7C13] hover:underline dark:text-[#76C457]"
                  >
                    {activeEmailLabel}
                  </button>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="Sair da conta"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Compact Top Header (< 768px, height 52px) */}
      <header className="no-print sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-[#1E293B]/90">
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <img
            src="/icon.svg"
            alt="PoupaJ"
            referrerPolicy="no-referrer"
            className="h-7 w-7 rounded-lg object-cover"
          />
          <span className="font-display text-base font-extrabold tracking-tight text-[#15370D] dark:text-[#76C457]">
            PoupaJunto
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Abrir menu completo"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer for secondary routes */}
      {mobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navegação completa"
          className="no-print fixed inset-0 z-50 flex md:hidden"
        >
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-white p-4 shadow-2xl dark:bg-[#1E293B]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Avatar src={user.avatar_url} name={user.display_name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.display_name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('emails');
                      setMobileDrawerOpen(false);
                    }}
                    className="block max-w-full truncate text-left text-xs font-semibold text-[#2A7C13] hover:underline dark:text-[#76C457]"
                  >
                    {activeEmailLabel}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Fechar menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="mt-4 flex-1 space-y-1">
              {visibleSidebarItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold ${
                      active
                        ? 'bg-[#2A7C13]/12 text-[#15370D] dark:bg-[#76C457]/15 dark:text-[#76C457]'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="font-mono text-xs font-bold text-[#2A7C13] dark:text-[#76C457]">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800">
              <PWAInstallButton />
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onLogout();
                }}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Sair da Conta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main
        className={`min-h-screen pb-24 md:pb-10 md:transition-[padding] md:duration-200 ${
          sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        {/* Selo Permanente de Transparência em todas as telas principais */}
        <div className="no-print border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-[#1E293B]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Ambiente de Simulação Educativa — Sem Movimentação de Dinheiro Real
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onSelectTab('emails')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A7C13]/30 bg-[#2A7C13]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#15370D] transition hover:bg-[#2A7C13]/20 dark:border-[#76C457]/30 dark:bg-[#76C457]/15 dark:text-[#76C457]"
              >
                <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="max-w-[180px] truncate">{activeEmailLabel}</span>
                {unreadEmailsCount > 0 && (
                  <span className="font-mono font-bold">({unreadEmailsCount})</span>
                )}
              </button>
              <span className="hidden text-slate-500 lg:inline dark:text-slate-400">
                Tech Minds · SENAI Jaú-SP · INTEGRA SENAI 2026
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (< 768px, height 64px) */}
      <nav
        aria-label="Navegação inferior"
        className="no-print fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 items-center border-t border-slate-200 bg-white/90 px-1 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-[#1E293B]/90"
      >
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          aria-label="Início"
          className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
            activeTab === 'dashboard'
              ? 'text-[#2A7C13] dark:text-[#76C457]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Home className="h-5 w-5" aria-hidden="true" />
          <span>Início</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('what-if')}
          aria-label="Simular cenários"
          className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
            activeTab === 'what-if' || activeTab === 'groups'
              ? 'text-[#2A7C13] dark:text-[#76C457]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Sliders className="h-5 w-5" aria-hidden="true" />
          <span>Simular</span>
        </button>

        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onOpenNewGroup}
            aria-label="Novo Grupo"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2A7C13] text-white shadow-md transition hover:bg-[#15370D] active:scale-95 dark:bg-[#76C457] dark:text-[#15370D]"
          >
            <Plus className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onSelectTab('education')}
          aria-label="Aprender pílulas educativas"
          className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
            activeTab === 'education'
              ? 'text-[#2A7C13] dark:text-[#76C457]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BookOpen className="h-5 w-5" aria-hidden="true" />
          <span>Aprender</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          aria-label="Meu Perfil"
          className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
            activeTab === 'profile'
              ? 'text-[#2A7C13] dark:text-[#76C457]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <UserCircle className="h-5 w-5" aria-hidden="true" />
          <span>Perfil</span>
        </button>
      </nav>
    </div>
  );
};

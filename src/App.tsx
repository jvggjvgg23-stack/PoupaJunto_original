import React, { useCallback, useEffect, useState } from 'react';
import { api, getStoredToken, setStoredToken, type EnrichedGroup } from './services/api';
import { localDb } from './services/localDb';
import type { EducationalPill, Profile, ThemePreference } from './shared/types';
import { AuthView } from './components/AuthView';
import { DashboardView } from './components/DashboardView';
import { EducationView } from './components/EducationView';
import { EmailsView } from './components/EmailsView';
import { GroupSimulatorView } from './components/GroupSimulatorView';
import { GroupWizardModal } from './components/GroupWizardModal';
import { NavigationShell, type NavTabId } from './components/NavigationShell';
import { OfflineIndicator } from './components/PWAInstallButton';
import { ProfileView } from './components/ProfileView';
import { SuperadminView } from './components/SuperadminView';
import { WhatIfSimulatorView } from './components/WhatIfSimulatorView';
import { WorkshopPinView } from './components/WorkshopPinView';

const THEME_STORAGE_KEY = 'poupajunto_theme';

function applyHtmlTheme(theme: ThemePreference) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignorar falha de localStorage
  }
}

export default function App() {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  const savedUi = localDb.getUiState<{ activeTab: NavTabId; selectedGroupId: string | null }>({
    activeTab: 'dashboard',
    selectedGroupId: null,
  });

  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<EnrichedGroup[]>([]);
  const [pills, setPills] = useState<EducationalPill[]>([]);
  const [activeTab, setActiveTabState] = useState<NavTabId>(savedUi.activeTab);
  const [selectedGroupId, setSelectedGroupIdState] = useState<string | null>(savedUi.selectedGroupId);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [unreadEmailsCount, setUnreadEmailsCount] = useState(0);
  const [connectedEmail, setConnectedEmail] = useState<string | undefined>(undefined);

  const syncMailboxMeta = useCallback(() => {
    setUnreadEmailsCount(localDb.getInboxUnreadCount());
    setConnectedEmail(localDb.getMailboxConnection()?.email);
  }, []);

  const setActiveTab = useCallback((tab: NavTabId) => {
    setActiveTabState(tab);
    localDb.setUiState({ activeTab: tab });
  }, []);

  const setSelectedGroupId = useCallback((id: string | null) => {
    setSelectedGroupIdState(id);
    localDb.setUiState({ selectedGroupId: id });
  }, []);

  useEffect(() => {
    applyHtmlTheme(theme);
  }, [theme]);

  const loadWorkspaceData = useCallback(async () => {
    const [groupsRes, pillsRes] = await Promise.all([api.groups.list(), api.pills.list()]);
    setGroups(groupsRes.groups);
    setPills(pillsRes.pills);
    setSelectedGroupIdState((curr) => {
      const nextId =
        curr && groupsRes.groups.some((g) => g.id === curr)
          ? curr
          : groupsRes.groups[0]?.id ?? null;
      localDb.setUiState({ selectedGroupId: nextId });
      return nextId;
    });
    syncMailboxMeta();
  }, [syncMailboxMeta]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const token = getStoredToken();
      if (token) {
        try {
          const me = await api.auth.me();
          if (!cancelled) {
            setUser(me.user);
            setTheme(me.user.theme_preference || 'light');
            if (savedUi.activeTab === 'admin' && me.user.role !== 'superadmin') {
              setActiveTab('dashboard');
            }
            await loadWorkspaceData();
          }
        } catch {
          setStoredToken(null);
        }
      } else if (new URLSearchParams(window.location.search).get('autostart') === '1') {
        try {
          const res = await api.auth.login({
            email: 'ana.clara@aluno.senai.br',
            password: 'Aluno@2026',
          });
          setStoredToken(res.token);
          if (!cancelled) {
            setUser(res.user);
            setTheme(res.user.theme_preference || 'light');
            await loadWorkspaceData();
          }
        } catch {
          // fallback para tela de login
        }
      }
      if (!cancelled) setBooting(false);
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadWorkspaceData, savedUi.activeTab, setActiveTab]);

  const handleAuthenticated = async (
    authenticatedUser: Profile,
    options?: { openEmails?: boolean }
  ) => {
    setUser(authenticatedUser);
    setTheme(authenticatedUser.theme_preference || 'light');
    setActiveTab(options?.openEmails ? 'emails' : 'dashboard');
    await loadWorkspaceData();
  };

  const handleToggleTheme = async () => {
    const next: ThemePreference = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (user) {
      try {
        const res = await api.profile.update({ theme_preference: next });
        setUser(res.profile);
      } catch {
        // Mantém tema localmente
      }
    }
  };

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    setGroups([]);
    setActiveTab('dashboard');
  };

  const handleGroupUpdated = (updated: EnrichedGroup) => {
    setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  };

  const handleGroupCreated = (created: EnrichedGroup) => {
    setGroups((prev) => [created, ...prev]);
    setSelectedGroupId(created.id);
    setActiveTab('groups');
    syncMailboxMeta();
  };

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6 dark:bg-[#0B1120]">
        <div className="w-full max-w-md space-y-4">
          <div className="h-12 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthView
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onAuthenticated={handleAuthenticated}
        />
        <OfflineIndicator />
      </>
    );
  }

  const pendingPactsCount = groups.filter((g) => g.status === 'pact_pending').length;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? groups[0] ?? null;

  return (
    <>
      <NavigationShell
        user={user}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewGroup={() => setWizardOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onLogout={handleLogout}
        pendingPactsCount={pendingPactsCount}
        unreadEmailsCount={unreadEmailsCount}
        connectedEmail={connectedEmail}
      >
        {activeTab === 'dashboard' && (
          <DashboardView
            user={user}
            groups={groups}
            pills={pills}
            onSelectGroup={(id) => {
              setSelectedGroupId(id);
              setActiveTab('groups');
            }}
            onNavigate={setActiveTab}
            onOpenNewGroup={() => setWizardOpen(true)}
          />
        )}

        {(activeTab === 'groups' || activeTab === 'pacts') && (
          <GroupSimulatorView
            user={user}
            groups={groups}
            selectedGroupId={selectedGroupId}
            pills={pills}
            onSelectGroup={setSelectedGroupId}
            onGroupUpdated={handleGroupUpdated}
            onOpenWhatIf={(grp) => {
              setSelectedGroupId(grp.id);
              setActiveTab('what-if');
            }}
            onOpenNewGroup={() => setWizardOpen(true)}
          />
        )}

        {activeTab === 'what-if' && <WhatIfSimulatorView initialGroup={selectedGroup} />}

        {activeTab === 'education' && <EducationView user={user} groups={groups} pills={pills} />}

        {activeTab === 'workshop' && (
          <WorkshopPinView
            user={user}
            onSelectGroup={async (groupId) => {
              await loadWorkspaceData();
              setSelectedGroupId(groupId);
              setActiveTab('groups');
            }}
          />
        )}

        {activeTab === 'emails' && <EmailsView onEmailsUpdated={syncMailboxMeta} />}

        {activeTab === 'profile' && (
          <ProfileView
            user={user}
            groups={groups}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onProfileUpdated={setUser}
            onOpenAdmin={user.role === 'superadmin' ? () => setActiveTab('admin') : undefined}
          />
        )}

        {activeTab === 'admin' && user.role === 'superadmin' && (
          <SuperadminView
            onPillsChanged={async () => {
              const res = await api.pills.list();
              setPills(res.pills);
            }}
            onGroupsChanged={loadWorkspaceData}
          />
        )}
      </NavigationShell>

      <GroupWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={handleGroupCreated}
      />

      <OfflineIndicator />
    </>
  );
}

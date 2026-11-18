import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, RotateCcw, ShieldCheck, Trash2, Users } from 'lucide-react';
import { api, type AdminOverviewResponse } from '../services/api';
import type { UserRole } from '../shared/types';
import { Avatar } from './Avatar';

interface SuperadminViewProps {
  onPillsChanged: () => void;
  onGroupsChanged: () => void;
}

export const SuperadminView: React.FC<SuperadminViewProps> = ({
  onPillsChanged,
  onGroupsChanged,
}) => {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<'users' | 'groups' | 'pills'>('users');

  // Nova Pílula Educativa
  const [pillTitle, setPillTitle] = useState('');
  const [pillCategory, setPillCategory] = useState('Cidadania Financeira');
  const [pillOds, setPillOds] = useState('ODS 4 · Educação de Qualidade');
  const [pillCycle, setPillCycle] = useState('1');
  const [pillContent, setPillContent] = useState('');

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.overview();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar governança.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      await api.admin.updateUser(userId, { role });
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar perfil.');
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await api.admin.updateUser(userId, { active: !currentActive });
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar status da conta.');
    }
  };

  const handleModerateGroup = async (groupId: string, action: 'delete' | 'reset_pact') => {
    try {
      await api.admin.moderateGroup(groupId, action);
      await loadOverview();
      onGroupsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao moderar grupo.');
    }
  };

  const handleCreatePill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.createPill({
        title: pillTitle,
        category: pillCategory,
        ods_tag: pillOds,
        cycle_trigger: Number(pillCycle),
        content: pillContent,
      });
      setPillTitle('');
      setPillContent('');
      await loadOverview();
      onPillsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pílula educativa.');
    }
  };

  const handleTogglePill = async (id: string, active: boolean) => {
    try {
      await api.admin.updatePill(id, { active: !active });
      await loadOverview();
      onPillsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar pílula.');
    }
  };

  const handleDeletePill = async (id: string) => {
    try {
      await api.admin.deletePill(id);
      await loadOverview();
      onPillsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover pílula.');
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Governança e Auditoria · Acesso Exclusivo Superadmin</span>
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
            Painel Superadmin
          </h1>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Métricas Globais Agregadas */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B]">
              <p className="text-xs text-slate-500 dark:text-slate-400">Grupos Simulados</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {data.metrics.totalGroups}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {data.metrics.completedGroups} concluído(s)
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B]">
              <p className="text-xs text-slate-500 dark:text-slate-400">Conclusão Média dos Ciclos</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#2A7C13] dark:text-[#76C457]">
                {data.metrics.avgCompletionRate}%
              </p>
              <p className="mt-1 text-xs text-slate-500">Média global das equipes</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B]">
              <p className="text-xs text-slate-500 dark:text-slate-400">Contas Ativas</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#15370D] dark:text-[#76C457]">
                {data.metrics.activeUsers}/{data.metrics.totalUsers}
              </p>
              <p className="mt-1 text-xs text-slate-500">Estudantes, educadores e admin</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B]">
              <p className="text-xs text-slate-500 dark:text-slate-400">Pílulas Ativas</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#2A7C13] dark:text-[#76C457]">
                {data.metrics.activePills}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {data.metrics.totalWorkshops} oficina(s) PIN
              </p>
            </div>
          </div>

          {/* Engajamento por Turma / Instituição */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1E293B]">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Engajamento por Turma / Instituição
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {data.institutionEngagement.map((inst) => (
                <div
                  key={inst.institution}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                    {inst.institution}
                  </p>
                  <p className="mt-1 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {inst.users} usuário(s) · {inst.groups} grupo(s)
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs de Governança */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 w-fit dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setSection('users')}
              className={`min-h-[40px] rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                section === 'users'
                  ? 'bg-white text-[#15370D] shadow-sm dark:bg-[#1E293B] dark:text-[#76C457]'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Usuários e Perfis ({data.users.length})
            </button>
            <button
              type="button"
              onClick={() => setSection('groups')}
              className={`min-h-[40px] rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                section === 'groups'
                  ? 'bg-white text-[#15370D] shadow-sm dark:bg-[#1E293B] dark:text-[#76C457]'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Moderação de Grupos ({data.groups.length})
            </button>
            <button
              type="button"
              onClick={() => setSection('pills')}
              className={`min-h-[40px] rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                section === 'pills'
                  ? 'bg-white text-[#15370D] shadow-sm dark:bg-[#1E293B] dark:text-[#76C457]'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Pílulas Educativas ({data.pills.length})
            </button>
          </div>

          {/* Seção: Gestão de Usuários */}
          {section === 'users' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1E293B]">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.users.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={u.avatar_url} name={u.display_name} size="md" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {u.display_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {u.email} · {u.institution || 'Sem instituição'} ·{' '}
                          {u.active ? 'Ativa' : 'Desativada'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor={`role-${u.id}`} className="sr-only">
                        Perfil de {u.display_name}
                      </label>
                      <select
                        id={`role-${u.id}`}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="estudante">Estudante</option>
                        <option value="educador">Educador</option>
                        <option value="superadmin">Superadmin</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(u.id, u.active)}
                        className={`min-h-[40px] rounded-xl border px-3 text-xs font-semibold ${
                          u.active
                            ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                        }`}
                      >
                        {u.active ? 'Desativar' : 'Reativar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seção: Moderação de Grupos */}
          {section === 'groups' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1E293B]">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.groups.map((g) => (
                  <div
                    key={g.id}
                    className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {g.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {g.category} · {g.members.length} membro(s) · Ciclo {g.current_cycle}/
                        {g.total_cycles} · Status: {g.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleModerateGroup(g.id, 'reset_pact')}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reiniciar Pacto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModerateGroup(g.id, 'delete')}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seção: Gestão de Pílulas Educativas */}
          {section === 'pills' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <form
                onSubmit={handleCreatePill}
                className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-[#1E293B]"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#2A7C13] dark:text-[#76C457]" />
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    Nova Pílula Educativa
                  </h3>
                </div>
                <div>
                  <label htmlFor="pill-title" className="block text-xs font-semibold">
                    Título
                  </label>
                  <input
                    id="pill-title"
                    type="text"
                    required
                    value={pillTitle}
                    onChange={(e) => setPillTitle(e.target.value)}
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="pill-cat" className="block text-xs font-semibold">
                      Categoria
                    </label>
                    <input
                      id="pill-cat"
                      type="text"
                      required
                      value={pillCategory}
                      onChange={(e) => setPillCategory(e.target.value)}
                      className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="pill-cyc" className="block text-xs font-semibold">
                      Ciclo Gatilho
                    </label>
                    <input
                      id="pill-cyc"
                      type="number"
                      min={1}
                      max={24}
                      value={pillCycle}
                      onChange={(e) => setPillCycle(e.target.value)}
                      className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="pill-ods" className="block text-xs font-semibold">
                    Alinhamento ODS
                  </label>
                  <input
                    id="pill-ods"
                    type="text"
                    value={pillOds}
                    onChange={(e) => setPillOds(e.target.value)}
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="pill-content" className="block text-xs font-semibold">
                    Conteúdo Educativo
                  </label>
                  <textarea
                    id="pill-content"
                    rows={3}
                    required
                    value={pillContent}
                    onChange={(e) => setPillContent(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#2A7C13] px-4 py-2 text-xs font-semibold text-white hover:bg-[#15370D] dark:bg-[#76C457] dark:text-[#15370D]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar Pílula</span>
                </button>
              </form>

              <div className="space-y-3 lg:col-span-7">
                {data.pills.map((pill) => (
                  <div
                    key={pill.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-slate-500">
                          {pill.category} · Ciclo {pill.cycle_trigger} ·{' '}
                          {pill.active ? 'Ativa' : 'Oculta'}
                        </p>
                        <h4 className="mt-1 font-display text-sm font-bold text-slate-900 dark:text-white">
                          {pill.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePill(pill.id, pill.active)}
                          className="min-h-[36px] rounded-lg border border-slate-200 px-2.5 text-xs font-semibold dark:border-slate-700"
                        >
                          {pill.active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePill(pill.id)}
                          aria-label={`Excluir pílula ${pill.title}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 dark:border-red-900"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{pill.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

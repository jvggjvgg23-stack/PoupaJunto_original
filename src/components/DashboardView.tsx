import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Plus, Sliders, Users } from 'lucide-react';
import type { EnrichedGroup } from '../services/api';
import type { EducationalPill, Profile } from '../shared/types';
import type { NavTabId } from './NavigationShell';

interface DashboardViewProps {
  user: Profile;
  groups: EnrichedGroup[];
  pills: EducationalPill[];
  onSelectGroup: (groupId: string) => void;
  onNavigate: (tab: NavTabId) => void;
  onOpenNewGroup: () => void;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  groups,
  pills,
  onSelectGroup,
  onNavigate,
  onOpenNewGroup,
}) => {
  const featuredGroup =
    groups.find((g) => g.status === 'active') ??
    groups.find((g) => g.status === 'pact_pending') ??
    groups[0];

  const completedCount = groups.filter((g) => g.status === 'completed').length;
  const pendingPactCount = groups.filter((g) => g.status === 'pact_pending').length;
  const avgCollaboration =
    groups.length === 0
      ? 0
      : Math.round(groups.reduce((s, g) => s + g.collaboration.score, 0) / groups.length);

  const contextualPill =
    pills.find((p) => p.cycle_trigger === (featuredGroup?.current_cycle || 1)) ?? pills[0];

  return (
    <div className="space-y-8">
      {/* Cabeçalho Editorial */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Painel Geral · {user.institution || 'Ambiente Educativo PoupaJunto'}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Olá, {user.nickname || user.display_name.split(' ')[0]}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('what-if')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-[#1E293B] dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Sliders className="h-4 w-4" aria-hidden="true" />
            <span>Simulador &ldquo;E Se?&rdquo;</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewGroup}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2A7C13] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#15370D] whitespace-nowrap shrink-0 dark:bg-[#76C457] dark:text-[#15370D] dark:hover:bg-[#76C457]/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Nova Meta Coletiva</span>
          </button>
        </div>
      </div>

      {/* KPI Strip (4 colunas desktop, 2 colunas mobile, tabular-nums) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Grupos Simulados</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {groups.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {completedCount} concluído(s)
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pactos Pendentes</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#15370D] dark:text-[#76C457]">
            {pendingPactCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Aguardando aceite formal
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Índice de Colaboração</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#2A7C13] dark:text-[#76C457]">
            {avgCollaboration}/100
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Clareza nos combinados (não é crédito)
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Modo Oficina</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#15370D] dark:text-[#76C457]">
            PIN
          </p>
          <button
            type="button"
            onClick={() => onNavigate('workshop')}
            className="mt-1 text-xs font-semibold text-[#2A7C13] hover:underline dark:text-[#76C457]"
          >
            Entrar com código de sala
          </button>
        </div>
      </div>

      {/* Destaque Principal + Pílula Contextual */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Termômetro do Grupo em Destaque */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7 dark:border-slate-800 dark:bg-[#1E293B]">
          {featuredGroup ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {featuredGroup.category} · Ciclo {featuredGroup.current_cycle} de{' '}
                    {featuredGroup.total_cycles} ({featuredGroup.cycle_frequency})
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                    {featuredGroup.name}
                  </h2>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                    featuredGroup.status === 'completed'
                      ? 'text-[#2A7C13] dark:text-[#76C457]'
                      : featuredGroup.status === 'active'
                        ? 'text-[#15370D] dark:text-[#76C457]'
                        : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {featuredGroup.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>
                    {featuredGroup.status === 'completed'
                      ? 'Meta Simulada Concluída'
                      : featuredGroup.status === 'active'
                        ? 'Simulação em Andamento'
                        : 'Aguardando Aceite do Pacto'}
                  </span>
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {featuredGroup.goal_description}
              </p>

              {/* Termômetro Animado */}
              <div className="mt-6">
                <div className="flex items-baseline justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">
                    Progresso Fictício Acumulado
                  </span>
                  <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatBRL(featuredGroup.thermometer.accumulatedSimulated)} /{' '}
                    {formatBRL(featuredGroup.target_amount)} ({featuredGroup.thermometer.progressPercent}%)
                  </span>
                </div>
                <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${featuredGroup.thermometer.progressPercent}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-[#15370D] via-[#2A7C13] to-[#76C457]"
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Fundo Reserva Coletivo ({featuredGroup.rules.reserve_percentage}%):{' '}
                    <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {formatBRL(featuredGroup.thermometer.reserveAccumulated)}
                    </strong>
                  </span>
                  <span>
                    {featuredGroup.members.length} integrantes ·{' '}
                    {formatBRL(featuredGroup.thermometer.perMemberPerCycle)}/ciclo por membro
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Colaboração do grupo: <strong className="font-mono">{featuredGroup.collaboration.score}/100</strong> ({featuredGroup.collaboration.label})
                </span>
                <button
                  type="button"
                  onClick={() => onSelectGroup(featuredGroup.id)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2A7C13] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#15370D] whitespace-nowrap dark:bg-[#76C457] dark:text-[#15370D] dark:hover:bg-[#76C457]/90"
                >
                  <span>
                    {featuredGroup.status === 'pact_pending' ? 'Revisar Pacto e Iniciar' : 'Abrir Simulador'}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <Users className="mx-auto h-10 w-10 text-slate-400" />
              <h2 className="mt-3 font-display text-lg font-bold text-slate-900 dark:text-white">
                Nenhum grupo simulado ainda
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Crie sua primeira meta coletiva e defina o pacto de regras da turma.
              </p>
              <button
                type="button"
                onClick={onOpenNewGroup}
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2A7C13] px-4 py-2 text-xs font-semibold text-white hover:bg-[#15370D] dark:bg-[#76C457] dark:text-[#15370D]"
              >
                <Plus className="h-4 w-4" />
                <span>Criar Primeiro Grupo</span>
              </button>
            </div>
          )}
        </div>

        {/* Pílula Educativa Contextual */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-5 dark:border-slate-800 dark:bg-[#1E293B]">
          {contextualPill ? (
            <>
              <div>
                <p className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">
                  Pílula Educativa · {contextualPill.category}
                </p>
                <h2 className="mt-2 font-display text-lg font-bold text-slate-900 dark:text-white">
                  {contextualPill.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {contextualPill.content}
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {contextualPill.ods_tag}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('education')}
                  className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-[#15370D] hover:underline whitespace-nowrap dark:text-[#76C457]"
                >
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  <span>Ver todas as trilhas</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Nenhuma pílula educativa disponível.</p>
          )}
        </div>
      </div>

      {/* Lista de Todos os Grupos */}
      <section aria-label="Seus grupos coletivos">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Metas Coletivas da Turma
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('groups')}
            className="text-xs font-semibold text-[#2A7C13] hover:underline dark:text-[#76C457]"
          >
            Gerenciar todos
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelectGroup(group.id)}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-[#2A7C13]/60 hover:shadow-sm dark:border-slate-800 dark:bg-[#1E293B] dark:hover:border-[#76C457]/60"
            >
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {group.category} · Ciclo {group.current_cycle}/{group.total_cycles} ·{' '}
                  <span className="font-mono tabular-nums">{formatBRL(group.target_amount)}</span>
                </p>
                <h3 className="mt-1.5 font-display text-base font-bold text-slate-900 group-hover:text-[#15370D] dark:text-white dark:group-hover:text-[#76C457]">
                  {group.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                  {group.goal_description}
                </p>
              </div>

              <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                  <div
                    style={{ width: `${group.thermometer.progressPercent}%` }}
                    className={`h-full rounded-full ${
                      group.status === 'completed'
                        ? 'bg-[#76C457]'
                        : group.status === 'pact_pending'
                          ? 'bg-[#15370D] dark:bg-[#76C457]/70'
                          : 'bg-[#2A7C13] dark:bg-[#76C457]'
                    }`}
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {group.status === 'completed'
                      ? 'Concluída'
                      : group.status === 'active'
                        ? 'Ativa'
                        : 'Pacto Pendente'}
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                    {group.thermometer.progressPercent}%
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

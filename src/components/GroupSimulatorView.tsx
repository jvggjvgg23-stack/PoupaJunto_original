import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Download,
  FileCheck2,
  Play,
  Printer,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { api, type EnrichedGroup } from '../services/api';
import type { CycleMemberStatus, EducationalPill, Profile } from '../shared/types';
import { Avatar } from './Avatar';
import { ConfettiBurst } from './ConfettiBurst';

interface GroupSimulatorViewProps {
  user: Profile;
  groups: EnrichedGroup[];
  selectedGroupId: string | null;
  pills: EducationalPill[];
  onSelectGroup: (id: string) => void;
  onGroupUpdated: (updated: EnrichedGroup) => void;
  onOpenWhatIf: (group: EnrichedGroup) => void;
  onOpenNewGroup: () => void;
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const GroupSimulatorView: React.FC<GroupSimulatorViewProps> = ({
  user,
  groups,
  selectedGroupId,
  pills,
  onSelectGroup,
  onGroupUpdated,
  onOpenWhatIf,
  onOpenNewGroup,
}) => {
  const activeGroup = groups.find((g) => g.id === selectedGroupId) ?? groups[0] ?? null;

  const [memberStatuses, setMemberStatuses] = useState<Record<string, CycleMemberStatus>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  useEffect(() => {
    if (!activeGroup) return;
    const defaults: Record<string, CycleMemberStatus> = {};
    for (const m of activeGroup.members) {
      defaults[m.user_id] = 'on_time';
    }
    setMemberStatuses(defaults);
    setError(null);
  }, [activeGroup?.id, activeGroup?.current_cycle]);

  if (!activeGroup) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#1E293B]">
        <Users className="mx-auto h-10 w-10 text-slate-400" />
        <h2 className="mt-3 font-display text-lg font-bold text-slate-900 dark:text-white">
          Nenhum grupo selecionado
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Crie uma meta coletiva em 3 passos para iniciar sua simulação.
        </p>
        <button
          type="button"
          onClick={onOpenNewGroup}
          className="mt-4 min-h-[44px] rounded-xl bg-[#2A7C13] px-5 py-2 text-xs font-semibold text-white hover:bg-[#15370D] dark:bg-[#76C457] dark:text-[#15370D]"
        >
          Criar Nova Meta
        </button>
      </div>
    );
  }

  const currentMember = activeGroup.members.find((m) => m.user_id === user.id);
  const userAccepted = Boolean(currentMember?.pact_accepted);
  const allAccepted = activeGroup.can_start;
  const contextualPill =
    pills.find((p) => p.cycle_trigger === Math.max(1, activeGroup.current_cycle)) ?? pills[0];

  const handleAcceptPact = async (acceptAllDemoPeers: boolean) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.groups.acceptPact(activeGroup.id, acceptAllDemoPeers);
      onGroupUpdated(res.group);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar aceite do pacto.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.groups.join(activeGroup.id);
      onGroupUpdated(res.group);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao ingressar no grupo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateCycle = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.groups.simulateCycle(activeGroup.id, memberStatuses);
      onGroupUpdated(res.group);
      if (res.group.status === 'completed') {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 2600);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao simular próximo ciclo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadLearningCard = () => {
    const content = [
      'CARTÃO DE PACTO E APRENDIZADO — POUPAJUNTO (INTEGRA SENAI 2026)',
      'Ambiente 100% Simulado e Educativo — Sem Movimentação de Dinheiro Real',
      '====================================================================',
      `Grupo: ${activeGroup.name}`,
      `Objetivo: ${activeGroup.goal_description}`,
      `Meta Fictícia: ${formatBRL(activeGroup.target_amount)} em ${activeGroup.total_cycles} ciclos (${activeGroup.cycle_frequency})`,
      `Progresso Final: ${activeGroup.thermometer.progressPercent}% (${formatBRL(activeGroup.thermometer.accumulatedSimulated)})`,
      `Fundo Reserva Coletivo: ${activeGroup.rules.reserve_percentage}% (Saldo simulado: ${formatBRL(activeGroup.thermometer.reserveAccumulated)})`,
      `Índice de Clareza e Colaboração: ${activeGroup.collaboration.score}/100 (${activeGroup.collaboration.label})`,
      '',
      'PACTO DE REGRAS COMBINADAS:',
      `- Atraso: ${activeGroup.rules.delay_policy}`,
      `- Saída/Desistência: ${activeGroup.rules.dropout_policy}`,
      `- Sobras/Ajustes: ${activeGroup.rules.surplus_policy}`,
      '',
      `Integrantes (${activeGroup.members.length}): ${activeGroup.members.map((m) => m.display_name).join(', ')}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cartao-pacto-${activeGroup.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <ConfettiBurst active={celebrate} />

      {/* Seletor de Grupo (tabs horizontais roláveis) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelectGroup(g.id)}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                g.id === activeGroup.id
                  ? 'bg-[#2A7C13] text-white dark:bg-[#76C457] dark:text-[#15370D]'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#1E293B] dark:text-slate-200'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onOpenWhatIf(activeGroup)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-[#1E293B] dark:text-slate-200"
        >
          <Sliders className="h-4 w-4" aria-hidden="true" />
          <span>Testar &ldquo;E Se?&rdquo;</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {/* Cabeçalho + Termômetro Coletivo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-8 dark:border-slate-800 dark:bg-[#1E293B]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeGroup.category} · Ciclo {activeGroup.current_cycle} de {activeGroup.total_cycles} ·{' '}
                Frequência {activeGroup.cycle_frequency}
                {activeGroup.room_pin ? ` · Oficina PIN ${activeGroup.room_pin}` : ''}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                {activeGroup.name}
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                {activeGroup.goal_description}
              </p>
            </div>

            {activeGroup.status === 'completed' && (
              <button
                type="button"
                onClick={() => setShowCardModal(true)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2A7C13] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#15370D] whitespace-nowrap shrink-0 dark:bg-[#76C457] dark:text-[#15370D]"
              >
                <Award className="h-4 w-4" aria-hidden="true" />
                <span>Cartão de Pacto e Aprendizado</span>
              </button>
            )}
          </div>

          {/* Termômetro Visual Animado */}
          <div className="mt-6 rounded-2xl bg-slate-50 p-5 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Termômetro Coletivo Simulado
              </span>
              <span className="font-mono text-lg font-bold tabular-nums text-[#15370D] dark:text-[#76C457]">
                {activeGroup.thermometer.progressPercent}%
              </span>
            </div>

            <div className="mt-3 h-5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${activeGroup.thermometer.progressPercent}%` }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-[#15370D] via-[#2A7C13] to-[#76C457]"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Acumulado Fictício</p>
                <p className="font-mono text-base font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatBRL(activeGroup.thermometer.accumulatedSimulated)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Meta Simulada</p>
                <p className="font-mono text-base font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatBRL(activeGroup.target_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Reserva Coletiva ({activeGroup.rules.reserve_percentage}%)
                </p>
                <p className="font-mono text-base font-bold tabular-nums text-[#2A7C13] dark:text-[#76C457]">
                  {formatBRL(activeGroup.thermometer.reserveAccumulated)}
                </p>
              </div>
            </div>
          </div>

          {/* Pacto de Regras Visíveis */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
                <FileCheck2 className="h-4 w-4 text-[#2A7C13] dark:text-[#76C457]" aria-hidden="true" />
                <span>Pacto de Regras Combinadas</span>
              </h2>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {activeGroup.members.filter((m) => m.pact_accepted).length}/{activeGroup.members.length} aceitaram
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
                <p className="text-xs font-semibold text-[#15370D] dark:text-[#76C457]">Se houver atraso</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {activeGroup.rules.delay_policy}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
                <p className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">Se alguém sair</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {activeGroup.rules.dropout_policy}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
                <p className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">Sobra ou ajuste</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {activeGroup.rules.surplus_policy}
                </p>
              </div>
            </div>

            {/* Ação de Aceite do Pacto antes do Ciclo 1 */}
            {!currentMember && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Você ainda não participa deste grupo simulado.
                </p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleJoinGroup}
                  className="min-h-[44px] rounded-xl bg-[#2A7C13] px-4 py-2 text-xs font-semibold text-white hover:bg-[#15370D] dark:bg-[#76C457] dark:text-[#15370D]"
                >
                  Participar do Grupo
                </button>
              </div>
            )}

            {currentMember && !allAccepted && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2A7C13]/40 bg-[#76C457]/10 p-4">
                <div>
                  <p className="text-xs font-bold text-[#15370D] dark:text-[#76C457]">
                    Aceite obrigatório antes de iniciar o Ciclo 1
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                    Todos os integrantes precisam confirmar que leram e concordam com as regras combinadas.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!userAccepted && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleAcceptPact(false)}
                      className="min-h-[44px] rounded-xl bg-[#2A7C13] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#15370D] whitespace-nowrap dark:bg-[#76C457] dark:text-[#15370D]"
                    >
                      Li e Concordo com o Pacto
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleAcceptPact(true)}
                    className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {userAccepted ? 'Confirmar aceite da turma' : 'Aceitar e liberar Ciclo 1'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Lateral: Índice de Colaboração + Pílula */}
        <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1E293B]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Índice de Clareza e Colaboração
              </h2>
              <ShieldCheck className="h-4 w-4 text-[#2A7C13] dark:text-[#76C457]" aria-hidden="true" />
            </div>
            <p className="mt-3 font-mono text-3xl font-extrabold tabular-nums text-[#15370D] dark:text-[#76C457]">
              {activeGroup.collaboration.score}
              <span className="text-sm font-normal text-slate-400">/100</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">
              {activeGroup.collaboration.label}
            </p>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Adesão ao Pacto</span>
                <span className="font-mono font-semibold tabular-nums">
                  {activeGroup.collaboration.pactAcceptanceRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pontualidade Simulada</span>
                <span className="font-mono font-semibold tabular-nums">
                  {activeGroup.collaboration.onTimeRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Saúde da Reserva</span>
                <span className="font-mono font-semibold tabular-nums">
                  {activeGroup.collaboration.reserveHealthRate}%
                </span>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Indicador estritamente pedagógico de cumprimento dos combinados. Não gera score de crédito.
            </p>
          </div>

          {contextualPill && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1E293B]">
              <p className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">
                Dica do Ciclo · {contextualPill.category}
              </p>
              <h3 className="mt-1 font-display text-sm font-bold text-slate-900 dark:text-white">
                {contextualPill.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {contextualPill.content}
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Lista Transparente dos Integrantes e Controle do Próximo Ciclo */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#1E293B]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {activeGroup.status === 'completed'
                ? 'Resumo dos Participantes (Meta Concluída)'
                : `Simulação do Ciclo ${activeGroup.current_cycle + 1} de ${activeGroup.total_cycles}`}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Valor fictício por integrante nesta rodada:{' '}
              <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {formatBRL(activeGroup.thermometer.perMemberPerCycle)}
              </strong>
            </p>
          </div>

          {activeGroup.status !== 'completed' && (
            <button
              type="button"
              disabled={!allAccepted || loading}
              onClick={handleSimulateCycle}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2A7C13] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#15370D] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap dark:bg-[#76C457] dark:text-[#15370D]"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>
                {loading
                  ? 'Registrando Ciclo...'
                  : `Avançar para Ciclo ${activeGroup.current_cycle + 1}`}
              </span>
            </button>
          )}
        </div>

        <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
          {activeGroup.members.map((member) => {
            const selectedStatus = memberStatuses[member.user_id] ?? 'on_time';
            return (
              <div
                key={member.id}
                className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={member.avatar_url} name={member.display_name} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {member.display_name}
                      {member.user_id === user.id ? ' (Você)' : ''}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {member.institution || 'Participante'} ·{' '}
                      {member.pact_accepted ? 'Pacto aceito' : 'Pacto pendente'}
                    </p>
                  </div>
                </div>

                {activeGroup.status !== 'completed' ? (
                  <div
                    role="group"
                    aria-label={`Status simulado de ${member.display_name}`}
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    <button
                      type="button"
                      disabled={!allAccepted}
                      onClick={() =>
                        setMemberStatuses((prev) => ({ ...prev, [member.user_id]: 'on_time' }))
                      }
                      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        selectedStatus === 'on_time'
                          ? 'border-[#2A7C13] bg-[#2A7C13]/10 text-[#15370D] dark:border-[#76C457] dark:bg-[#76C457]/15 dark:text-[#76C457]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Em dia</span>
                    </button>

                    <button
                      type="button"
                      disabled={!allAccepted}
                      onClick={() =>
                        setMemberStatuses((prev) => ({ ...prev, [member.user_id]: 'reserve_used' }))
                      }
                      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        selectedStatus === 'reserve_used'
                          ? 'border-[#15370D] bg-[#76C457]/25 text-[#15370D] dark:border-[#76C457] dark:bg-[#2A7C13]/30 dark:text-[#76C457]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Reserva acionada</span>
                    </button>

                    <button
                      type="button"
                      disabled={!allAccepted}
                      onClick={() =>
                        setMemberStatuses((prev) => ({ ...prev, [member.user_id]: 'delayed' }))
                      }
                      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        selectedStatus === 'delayed'
                          ? 'border-amber-600 bg-amber-500/10 text-amber-800 dark:border-amber-500 dark:text-amber-300'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Atraso simulado</span>
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>Ciclos finalizados</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal: Cartão de Pacto e Aprendizado (Exportável / Imprimível) */}
      {showCardModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cartão de Pacto e Aprendizado"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#1E293B]">
            <div className="no-print flex items-center justify-between">
              <span className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">
                Meta Simulada Concluída · INTEGRA SENAI 2026
              </span>
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                aria-label="Fechar cartão"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-semibold text-[#15370D] dark:text-[#76C457]">
                PoupaJunto · Cartão de Pacto e Aprendizado
              </p>
              <h3 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                {activeGroup.name}
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {activeGroup.goal_description}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-200 py-3 text-xs dark:border-slate-700">
                <div>
                  <span className="text-slate-500">Progresso Final</span>
                  <p className="font-mono text-base font-bold text-[#2A7C13] dark:text-[#76C457]">
                    {activeGroup.thermometer.progressPercent}% ({formatBRL(activeGroup.thermometer.accumulatedSimulated)})
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Colaboração</span>
                  <p className="font-mono text-base font-bold text-[#15370D] dark:text-[#76C457]">
                    {activeGroup.collaboration.score}/100
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  <strong>Regra de atraso:</strong> {activeGroup.rules.delay_policy}
                </p>
                <p>
                  <strong>Regra de saída:</strong> {activeGroup.rules.dropout_policy}
                </p>
                <p>
                  <strong>Sobras:</strong> {activeGroup.rules.surplus_policy}
                </p>
              </div>
              <p className="mt-4 text-[11px] text-slate-500">
                Ambiente de Simulação Educativa — Sem Movimentação de Dinheiro Real · Tech Minds SENAI Jaú-SP
              </p>
            </div>

            <div className="no-print mt-5 flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                <span>Imprimir / PDF</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadLearningCard}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2A7C13] px-4 py-2 text-xs font-semibold text-white hover:bg-[#15370D] dark:bg-[#76C457] dark:text-[#15370D]"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Baixar Resumo (.txt)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import type {
  BehavioralBadge,
  CollectiveGroup,
  CycleMemberStatus,
  GroupMember,
  SimulationCycleRecord,
  WhatIfCyclePoint,
  WhatIfInput,
  WhatIfResult,
} from './types';

export interface ThermometerMetrics {
  accumulatedSimulated: number;
  reserveAccumulated: number;
  targetAmount: number;
  progressPercent: number;
  cyclesCompleted: number;
  totalCycles: number;
  perMemberPerCycle: number;
}

export interface CollaborationIndexResult {
  score: number; // 0 to 100 — Ético: clareza e cumprimento de combinados, nunca score de crédito
  label: 'Excelente Alinhamento' | 'Colaboração Consistente' | 'Atenção aos Combinados' | 'Pacto em Formação';
  onTimeRate: number;
  pactAcceptanceRate: number;
  reserveHealthRate: number;
}

/**
 * Calcula o progresso do Termômetro Coletivo de forma determinística.
 */
export function calculateThermometerProgress(group: CollectiveGroup): ThermometerMetrics {
  const memberCount = Math.max(1, group.members.length);
  const perMemberPerCycle = Number(
    (group.target_amount / Math.max(1, group.total_cycles) / memberCount).toFixed(2)
  );

  const accumulatedSimulated = Number(
    group.cycles
      .reduce((sum, entry) => sum + (Number.isFinite(entry.simulated_value) ? entry.simulated_value : 0), 0)
      .toFixed(2)
  );

  const reserveAccumulated = Number(
    group.cycles
      .reduce((sum, entry) => sum + (Number.isFinite(entry.reserve_delta) ? entry.reserve_delta : 0), 0)
      .toFixed(2)
  );

  const rawPercent = group.target_amount > 0 ? (accumulatedSimulated / group.target_amount) * 100 : 0;
  const progressPercent = Math.min(100, Math.max(0, Math.round(rawPercent * 10) / 10));

  return {
    accumulatedSimulated,
    reserveAccumulated: Math.max(0, reserveAccumulated),
    targetAmount: group.target_amount,
    progressPercent,
    cyclesCompleted: group.current_cycle,
    totalCycles: group.total_cycles,
    perMemberPerCycle,
  };
}

/**
 * Verifica se todos os integrantes formalizaram o aceite do Pacto de Regras.
 */
export function canStartSimulation(members: GroupMember[]): boolean {
  if (members.length === 0) return false;
  return members.every((member) => member.pact_accepted === true);
}

/**
 * Calcula o Índice Ético de Clareza e Colaboração do Grupo (nunca score de crédito).
 */
export function calculateCollaborationIndex(group: CollectiveGroup): CollaborationIndexResult {
  const memberCount = Math.max(1, group.members.length);
  const acceptedCount = group.members.filter((m) => m.pact_accepted).length;
  const pactAcceptanceRate = Math.round((acceptedCount / memberCount) * 100);

  if (group.cycles.length === 0) {
    return {
      score: Math.round(pactAcceptanceRate * 0.6 + (group.rules.reserve_percentage > 0 ? 40 : 20) * (pactAcceptanceRate / 100)),
      label: pactAcceptanceRate === 100 ? 'Colaboração Consistente' : 'Pacto em Formação',
      onTimeRate: 100,
      pactAcceptanceRate,
      reserveHealthRate: group.rules.reserve_percentage >= 10 ? 100 : 70,
    };
  }

  const onTimeCount = group.cycles.filter((c) => c.simulated_status === 'on_time').length;
  const reserveUsedCount = group.cycles.filter((c) => c.simulated_status === 'reserve_used').length;
  const onTimeRate = Math.round(((onTimeCount + reserveUsedCount * 0.65) / group.cycles.length) * 100);

  const reserveHealthRate =
    group.rules.reserve_percentage >= 10
      ? Math.max(50, 100 - reserveUsedCount * 10)
      : Math.max(30, 70 - reserveUsedCount * 15);

  const score = Math.min(
    100,
    Math.max(0, Math.round(pactAcceptanceRate * 0.35 + onTimeRate * 0.45 + reserveHealthRate * 0.2))
  );

  let label: CollaborationIndexResult['label'] = 'Atenção aos Combinados';
  if (score >= 88) label = 'Excelente Alinhamento';
  else if (score >= 70) label = 'Colaboração Consistente';

  return {
    score,
    label,
    onTimeRate,
    pactAcceptanceRate,
    reserveHealthRate,
  };
}

/**
 * Concede selos comportamentais educativos com base na participação do usuário.
 */
export function computeEducationalBadges(
  groups: CollectiveGroup[],
  userId: string
): BehavioralBadge[] {
  const userGroups = groups.filter((g) =>
    g.members.some((m) => m.user_id === userId)
  );
  const acceptedPacts = userGroups.filter((g) =>
    g.members.some((m) => m.user_id === userId && m.pact_accepted)
  ).length;

  const completedGroups = userGroups.filter((g) => g.status === 'completed').length;
  const hasReserveStrategy = userGroups.some((g) => g.rules.reserve_percentage >= 10);
  const userOnTimeCycles = userGroups.reduce(
    (sum, g) =>
      sum + g.cycles.filter((c) => c.member_id === userId && c.simulated_status === 'on_time').length,
    0
  );

  return [
    {
      id: 'pactuador_transparente',
      name: 'Pactuador Transparente',
      description: 'Formalizou o aceite explícito de regras combinadas antes do Ciclo 1.',
      unlocked: acceptedPacts >= 1,
      criterion: `${acceptedPacts}/1 pacto aceito`,
    },
    {
      id: 'estrategista_reserva',
      name: 'Estrategista de Reserva',
      description: 'Estruturou grupo com fundo reserva coletivo igual ou superior a 10%.',
      unlocked: hasReserveStrategy,
      criterion: hasReserveStrategy ? 'Reserva >= 10% ativa' : 'Configure >= 10% de reserva',
    },
    {
      id: 'constancia_ciclos',
      name: 'Constância nos Ciclos',
      description: 'Registrou ao menos 3 ciclos simulados em dia sem impactar a turma.',
      unlocked: userOnTimeCycles >= 3,
      criterion: `${Math.min(3, userOnTimeCycles)}/3 ciclos em dia`,
    },
    {
      id: 'guardiao_meta',
      name: 'Guardião da Meta',
      description: 'Concluiu 100% dos ciclos de uma meta coletiva simulada com a equipe.',
      unlocked: completedGroups >= 1,
      criterion: `${completedGroups}/1 meta concluída`,
    },
  ];
}

/**
 * Motor de Simulação "E Se?" (Teste de Estresse de Cenários).
 * Calcula impacto de atrasos, desistências e colchão do fundo reserva coletivo.
 */
export function runWhatIfSimulation(input: WhatIfInput): WhatIfResult {
  const target = Math.max(100, input.target_amount);
  const totalCycles = Math.max(2, Math.min(24, Math.round(input.total_cycles)));
  const memberCount = Math.max(2, Math.round(input.member_count));
  const reservePct = Math.max(0, Math.min(30, input.reserve_percentage));
  const delayedMembers = Math.max(0, Math.min(memberCount, Math.round(input.delayed_members)));
  const delayedAtCycle = Math.max(1, Math.min(totalCycles, Math.round(input.delayed_at_cycle)));
  const dropoutCount = Math.max(0, Math.min(memberCount - 1, Math.round(input.dropout_count)));

  const baseCycleTarget = target / totalCycles;
  const perMemberCycle = baseCycleTarget / memberCount;
  const reservePerCycle = baseCycleTarget * (reservePct / 100);
  const reserveTargetAmount = Number((target * (reservePct / 100)).toFixed(2));

  const timeline: WhatIfCyclePoint[] = [];
  let plannedCum = 0;
  let stressedCum = 0;
  let reserveBal = 0;
  let peakShortfall = 0;

  for (let cycle = 1; cycle <= totalCycles; cycle++) {
    plannedCum = Math.min(target, plannedCum + baseCycleTarget);

    const activeMembers = cycle >= delayedAtCycle ? Math.max(1, memberCount - dropoutCount) : memberCount;
    const delayedInThisCycle = cycle === delayedAtCycle ? Math.min(delayedMembers, activeMembers) : 0;
    const onTimeMembers = Math.max(0, activeMembers - delayedInThisCycle);

    const cycleReserveDeposit = onTimeMembers * (reservePerCycle / memberCount);
    reserveBal += cycleReserveDeposit;

    let cycleCollected = onTimeMembers * perMemberCycle;
    const expectedThisCycle = baseCycleTarget;
    const shortfall = Math.max(0, expectedThisCycle - cycleCollected);

    let deficitCoveredByReserve = false;
    if (shortfall > 0 && reserveBal > 0) {
      const usedFromReserve = Math.min(shortfall, reserveBal);
      reserveBal -= usedFromReserve;
      cycleCollected += usedFromReserve;
      deficitCoveredByReserve = usedFromReserve >= shortfall * 0.75;
    }

    stressedCum += cycleCollected;
    const currentGap = Math.max(0, plannedCum - stressedCum);
    if (currentGap > peakShortfall) peakShortfall = currentGap;

    timeline.push({
      cycle,
      plannedCumulative: Number(plannedCum.toFixed(2)),
      stressedCumulative: Number(Math.min(target, stressedCum).toFixed(2)),
      reserveBalance: Number(reserveBal.toFixed(2)),
      deficitCoveredByReserve,
    });
  }

  const remainingGap = Math.max(0, target - stressedCum);
  const activePerCycleAfter = Math.max(1, memberCount - dropoutCount) * perMemberCycle;
  const estimatedDelayCycles =
    remainingGap <= 1 ? 0 : Math.ceil(remainingGap / Math.max(1, activePerCycleAfter));
  const projectedTotalCycles = totalCycles + estimatedDelayCycles;

  let resilienceRating: WhatIfResult['resilienceRating'] = 'alta';
  if (estimatedDelayCycles >= 2 || remainingGap > target * 0.2) {
    resilienceRating = 'critica';
  } else if (estimatedDelayCycles === 1 || peakShortfall > baseCycleTarget * 0.4) {
    resilienceRating = 'moderada';
  }

  let summaryRecommendation =
    'A estrutura do pacto absorve os imprevistos simulados mantendo o prazo combinado.';
  if (resilienceRating === 'critica') {
    summaryRecommendation = `O grupo acumularia déficit de R$ ${remainingGap.toFixed(0)} e precisaria de +${estimatedDelayCycles} ciclo(s) extras. Recomenda-se fundo reserva >= 15% e regra explícita de redistribuição.`;
  } else if (resilienceRating === 'moderada') {
    summaryRecommendation = `Há impacto moderado no Ciclo ${delayedAtCycle}, exigindo ajuste de +${Math.max(1, estimatedDelayCycles)} ciclo(s) ou reserva coletiva de ${Math.min(20, reservePct + 5)}%.`;
  }

  return {
    plannedPerMemberCycle: Number(perMemberCycle.toFixed(2)),
    estimatedDelayCycles,
    projectedTotalCycles,
    reserveTargetAmount,
    peakShortfall: Number(peakShortfall.toFixed(2)),
    resilienceRating,
    summaryRecommendation,
    timeline,
  };
}

/**
 * Gera os registros do próximo ciclo simulado para o grupo.
 */
export function computeNextCycleState(
  group: CollectiveGroup,
  memberStatuses: Record<string, CycleMemberStatus>
): {
  nextCycleNumber: number;
  newStatus: CollectiveGroup['status'];
  newRecords: SimulationCycleRecord[];
} {
  if (!canStartSimulation(group.members)) {
    throw new Error('Todos os integrantes devem aceitar o Pacto de Regras antes de iniciar.');
  }
  if (group.current_cycle >= group.total_cycles || group.status === 'completed') {
    throw new Error('Esta meta coletiva simulada já concluiu todos os ciclos.');
  }

  const nextCycleNumber = group.current_cycle + 1;
  const memberCount = Math.max(1, group.members.length);
  const perMemberValue = Number((group.target_amount / group.total_cycles / memberCount).toFixed(2));
  const reserveFactor = group.rules.reserve_percentage / 100;
  const now = new Date().toISOString();

  const newRecords: SimulationCycleRecord[] = group.members.map((member, index) => {
    const status: CycleMemberStatus = memberStatuses[member.user_id] ?? 'on_time';
    let simulated_value = perMemberValue;
    let reserve_delta = Number((perMemberValue * reserveFactor).toFixed(2));

    if (status === 'delayed') {
      simulated_value = 0;
      reserve_delta = 0;
    } else if (status === 'reserve_used') {
      simulated_value = perMemberValue;
      reserve_delta = Number((-perMemberValue * 0.5).toFixed(2));
    }

    return {
      id: `cyc_${group.id}_${nextCycleNumber}_${index}_${Date.now()}`,
      group_id: group.id,
      member_id: member.user_id,
      cycle_number: nextCycleNumber,
      simulated_status: status,
      simulated_value,
      reserve_delta,
      recorded_at: now,
    };
  });

  const newStatus: CollectiveGroup['status'] =
    nextCycleNumber >= group.total_cycles ? 'completed' : 'active';

  return {
    nextCycleNumber,
    newStatus,
    newRecords,
  };
}

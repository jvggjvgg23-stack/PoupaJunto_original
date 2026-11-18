import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCollaborationIndex,
  calculateThermometerProgress,
  canStartSimulation,
  computeEducationalBadges,
  computeNextCycleState,
  runWhatIfSimulation,
} from './simulation';
import type { CollectiveGroup } from './types';

function makeGroupFixture(overrides?: Partial<CollectiveGroup>): CollectiveGroup {
  return {
    id: 'grp_test_1',
    name: 'Formatura 3º DS SENAI',
    goal_description: 'Meta educativa simulada para eventos de formatura',
    category: 'Formatura',
    target_amount: 1200,
    total_cycles: 4,
    cycle_frequency: 'mensal',
    current_cycle: 0,
    status: 'pact_pending',
    room_pin: null,
    created_by: 'u_1',
    created_at: '2026-11-01T10:00:00Z',
    rules: {
      id: 'rule_1',
      group_id: 'grp_test_1',
      delay_policy: 'Usar fundo reserva por 1 ciclo',
      dropout_policy: 'Redistribuir cota entre membros ativos',
      surplus_policy: 'Dividir proporcionalmente ao final',
      reserve_percentage: 10,
      created_at: '2026-11-01T10:00:00Z',
    },
    members: [
      {
        id: 'gm_1',
        group_id: 'grp_test_1',
        user_id: 'u_1',
        display_name: 'Ana Silva',
        nickname: 'Ana',
        avatar_url: '',
        institution: 'SENAI Jaú',
        pact_accepted: true,
        pact_accepted_at: '2026-11-01T10:05:00Z',
        joined_at: '2026-11-01T10:00:00Z',
      },
      {
        id: 'gm_2',
        group_id: 'grp_test_1',
        user_id: 'u_2',
        display_name: 'Lucas Souza',
        nickname: 'Lucão',
        avatar_url: '',
        institution: 'SENAI Jaú',
        pact_accepted: true,
        pact_accepted_at: '2026-11-01T10:06:00Z',
        joined_at: '2026-11-01T10:00:00Z',
      },
    ],
    cycles: [],
    ...overrides,
  };
}

test('canStartSimulation exige aceite de todos os membros do pacto', () => {
  const group = makeGroupFixture();
  assert.equal(canStartSimulation(group.members), true);

  const pendingGroup = makeGroupFixture({
    members: [
      ...group.members.slice(0, 1),
      { ...group.members[1], pact_accepted: false, pact_accepted_at: null },
    ],
  });
  assert.equal(canStartSimulation(pendingGroup.members), false);
});

test('computeNextCycleState avanca ciclos e marca concluido ao atingir total_cycles', () => {
  let group = makeGroupFixture();
  const c1 = computeNextCycleState(group, { u_1: 'on_time', u_2: 'on_time' });
  assert.equal(c1.nextCycleNumber, 1);
  assert.equal(c1.newStatus, 'active');
  assert.equal(c1.newRecords.length, 2);
  assert.equal(c1.newRecords[0].simulated_value, 150);

  group = {
    ...group,
    current_cycle: 3,
    status: 'active',
    cycles: c1.newRecords,
  };
  const c4 = computeNextCycleState(group, { u_1: 'on_time', u_2: 'reserve_used' });
  assert.equal(c4.nextCycleNumber, 4);
  assert.equal(c4.newStatus, 'completed');
});

test('calculateThermometerProgress soma valores simulados e calcula percentual corretamente', () => {
  const group = makeGroupFixture({
    current_cycle: 2,
    status: 'active',
    cycles: [
      {
        id: 'c1',
        group_id: 'grp_test_1',
        member_id: 'u_1',
        cycle_number: 1,
        simulated_status: 'on_time',
        simulated_value: 300,
        reserve_delta: 30,
        recorded_at: '2026-11-02T10:00:00Z',
      },
      {
        id: 'c2',
        group_id: 'grp_test_1',
        member_id: 'u_2',
        cycle_number: 2,
        simulated_status: 'on_time',
        simulated_value: 300,
        reserve_delta: 30,
        recorded_at: '2026-11-03T10:00:00Z',
      },
    ],
  });

  const metrics = calculateThermometerProgress(group);
  assert.equal(metrics.accumulatedSimulated, 600);
  assert.equal(metrics.reserveAccumulated, 60);
  assert.equal(metrics.progressPercent, 50);
  assert.equal(metrics.perMemberPerCycle, 150);
});

test('runWhatIfSimulation detecta atraso quando ha desistencias sem reserva suficiente', () => {
  const resilient = runWhatIfSimulation({
    target_amount: 2000,
    total_cycles: 4,
    member_count: 5,
    reserve_percentage: 20,
    delayed_members: 1,
    delayed_at_cycle: 3,
    dropout_count: 0,
  });
  assert.equal(resilient.timeline.length, 4);
  assert.ok(resilient.resilienceRating === 'alta' || resilient.resilienceRating === 'moderada');

  const stressed = runWhatIfSimulation({
    target_amount: 2000,
    total_cycles: 4,
    member_count: 4,
    reserve_percentage: 0,
    delayed_members: 2,
    delayed_at_cycle: 2,
    dropout_count: 2,
  });
  assert.equal(stressed.resilienceRating, 'critica');
  assert.ok(stressed.estimatedDelayCycles >= 2);
});

test('calculateCollaborationIndex e computeEducationalBadges operam de forma etica e deterministica', () => {
  const group = makeGroupFixture({
    current_cycle: 4,
    status: 'completed',
    cycles: [
      {
        id: '1',
        group_id: 'grp_test_1',
        member_id: 'u_1',
        cycle_number: 1,
        simulated_status: 'on_time',
        simulated_value: 150,
        reserve_delta: 15,
        recorded_at: '2026-11-01T10:00:00Z',
      },
      {
        id: '2',
        group_id: 'grp_test_1',
        member_id: 'u_1',
        cycle_number: 2,
        simulated_status: 'on_time',
        simulated_value: 150,
        reserve_delta: 15,
        recorded_at: '2026-11-02T10:00:00Z',
      },
      {
        id: '3',
        group_id: 'grp_test_1',
        member_id: 'u_1',
        cycle_number: 3,
        simulated_status: 'on_time',
        simulated_value: 150,
        reserve_delta: 15,
        recorded_at: '2026-11-03T10:00:00Z',
      },
    ],
  });

  const index = calculateCollaborationIndex(group);
  assert.equal(index.score, 100);
  assert.equal(index.label, 'Excelente Alinhamento');

  const badges = computeEducationalBadges([group], 'u_1');
  assert.equal(badges.every((b) => b.unlocked), true);
});

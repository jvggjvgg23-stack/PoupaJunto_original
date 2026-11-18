import type { Response } from 'express';
import {
  calculateCollaborationIndex,
  calculateThermometerProgress,
  canStartSimulation,
  computeNextCycleState,
  runWhatIfSimulation,
} from '../../src/shared/simulation';
import type {
  CollectiveGroup,
  CycleMemberStatus,
  GroupMember,
  WhatIfInput,
} from '../../src/shared/types';
import type { AuthenticatedRequest } from '../middlewares/auth';
import { store } from '../services/store';

function enrichGroup(group: CollectiveGroup) {
  return {
    ...group,
    thermometer: calculateThermometerProgress(group),
    collaboration: calculateCollaborationIndex(group),
    can_start: canStartSimulation(group.members),
  };
}

export function listGroups(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  const state = store.getState();
  const visibleGroups =
    req.user.role === 'superadmin' || req.user.role === 'educador'
      ? state.groups
      : state.groups.filter(
          (g) =>
            g.created_by === req.user!.id ||
            g.members.some((m) => m.user_id === req.user!.id) ||
            Boolean(g.room_pin)
        );

  res.json({
    groups: visibleGroups.map(enrichGroup),
  });
}

export function createGroup(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  const {
    name,
    goal_description,
    category,
    target_amount,
    total_cycles,
    cycle_frequency,
    delay_policy,
    dropout_policy,
    surplus_policy,
    reserve_percentage,
    room_pin,
    include_demo_peers,
  } = req.body ?? {};

  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    res.status(400).json({ error: 'Informe um nome descritivo para o grupo (mín. 3 caracteres).' });
    return;
  }
  const parsedAmount = Number(target_amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({ error: 'Informe um valor fictício de meta maior que zero.' });
    return;
  }
  const parsedCycles = Math.round(Number(total_cycles));
  if (!Number.isFinite(parsedCycles) || parsedCycles < 2 || parsedCycles > 24) {
    res.status(400).json({ error: 'A quantidade de ciclos deve estar entre 2 e 24 rodadas.' });
    return;
  }
  if (!delay_policy || !dropout_policy) {
    res.status(400).json({ error: 'Defina as regras de atraso e saída no Pacto antes de criar o grupo.' });
    return;
  }

  const state = store.getState();
  const groupId = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const members: GroupMember[] = [
    {
      id: `gm_${Date.now()}_0`,
      group_id: groupId,
      user_id: req.user.id,
      display_name: req.user.display_name,
      nickname: req.user.nickname || req.user.display_name.split(' ')[0],
      avatar_url: req.user.avatar_url,
      institution: req.user.institution,
      pact_accepted: false,
      pact_accepted_at: null,
      joined_at: now,
    },
  ];

  // Opcionalmente adiciona colegas da turma para dinâmica educativa imediata
  if (include_demo_peers !== false) {
    const peers = state.users
      .filter((u) => u.id !== req.user!.id && u.role === 'estudante' && u.active)
      .slice(0, 2);

    peers.forEach((peer, idx) => {
      members.push({
        id: `gm_${Date.now()}_${idx + 1}`,
        group_id: groupId,
        user_id: peer.id,
        display_name: peer.display_name,
        nickname: peer.nickname || peer.display_name.split(' ')[0],
        avatar_url: peer.avatar_url,
        institution: peer.institution,
        pact_accepted: true,
        pact_accepted_at: now,
        joined_at: now,
      });
    });
  }

  const newGroup: CollectiveGroup = {
    id: groupId,
    name: name.trim(),
    goal_description:
      typeof goal_description === 'string' && goal_description.trim()
        ? goal_description.trim()
        : 'Meta coletiva educativa simulada.',
    category: typeof category === 'string' && category.trim() ? category.trim() : 'Projeto Escolar',
    target_amount: parsedAmount,
    total_cycles: parsedCycles,
    cycle_frequency:
      cycle_frequency === 'semanal' || cycle_frequency === 'quinzenal' ? cycle_frequency : 'mensal',
    current_cycle: 0,
    status: 'pact_pending',
    room_pin: typeof room_pin === 'string' && room_pin.trim() ? room_pin.trim() : null,
    created_by: req.user.id,
    created_at: now,
    rules: {
      id: `rule_${Date.now()}`,
      group_id: groupId,
      delay_policy: String(delay_policy).trim(),
      dropout_policy: String(dropout_policy).trim(),
      surplus_policy:
        typeof surplus_policy === 'string' && surplus_policy.trim()
          ? surplus_policy.trim()
          : 'Dividir sobras proporcionalmente ao fim da simulação.',
      reserve_percentage: Math.max(0, Math.min(30, Math.round(Number(reserve_percentage ?? 10)))),
      created_at: now,
    },
    members,
    cycles: [],
  };

  state.groups.unshift(newGroup);
  store.commit();

  res.status(201).json({ group: enrichGroup(newGroup) });
}

export function joinGroup(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  const { id } = req.params;
  const state = store.getState();
  const group = state.groups.find((g) => g.id === id);

  if (!group) {
    res.status(404).json({ error: 'Grupo simulado não encontrado.' });
    return;
  }

  if (!group.members.some((m) => m.user_id === req.user!.id)) {
    group.members.push({
      id: `gm_${Date.now()}`,
      group_id: group.id,
      user_id: req.user.id,
      display_name: req.user.display_name,
      nickname: req.user.nickname || req.user.display_name.split(' ')[0],
      avatar_url: req.user.avatar_url,
      institution: req.user.institution,
      pact_accepted: false,
      pact_accepted_at: null,
      joined_at: new Date().toISOString(),
    });
    if (group.status === 'active') {
      group.status = 'pact_pending';
    }
    store.commit();
  }

  res.json({ group: enrichGroup(group) });
}

export function acceptPact(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  const { id } = req.params;
  const { acceptAllDemoPeers } = req.body ?? {};
  const state = store.getState();
  const group = state.groups.find((g) => g.id === id);

  if (!group) {
    res.status(404).json({ error: 'Grupo simulado não encontrado.' });
    return;
  }

  let member = group.members.find((m) => m.user_id === req.user!.id);
  const now = new Date().toISOString();

  if (!member) {
    member = {
      id: `gm_${Date.now()}`,
      group_id: group.id,
      user_id: req.user.id,
      display_name: req.user.display_name,
      nickname: req.user.nickname || req.user.display_name.split(' ')[0],
      avatar_url: req.user.avatar_url,
      institution: req.user.institution,
      pact_accepted: true,
      pact_accepted_at: now,
      joined_at: now,
    };
    group.members.push(member);
  } else {
    member.pact_accepted = true;
    member.pact_accepted_at = now;
  }

  if (acceptAllDemoPeers) {
    for (const m of group.members) {
      if (!m.pact_accepted) {
        m.pact_accepted = true;
        m.pact_accepted_at = now;
      }
    }
  }

  if (canStartSimulation(group.members) && group.status === 'pact_pending') {
    group.status = 'active';
  }

  store.commit();
  res.json({ group: enrichGroup(group) });
}

export function simulateCycle(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  const { id } = req.params;
  const { memberStatuses } = (req.body ?? {}) as {
    memberStatuses?: Record<string, CycleMemberStatus>;
  };

  const state = store.getState();
  const group = state.groups.find((g) => g.id === id);

  if (!group) {
    res.status(404).json({ error: 'Grupo simulado não encontrado.' });
    return;
  }

  try {
    const result = computeNextCycleState(group, memberStatuses ?? {});
    group.current_cycle = result.nextCycleNumber;
    group.status = result.newStatus;
    group.cycles.push(...result.newRecords);
    store.commit();

    res.json({ group: enrichGroup(group) });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Não foi possível avançar o ciclo.',
    });
  }
}

export function previewWhatIf(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  const { id } = req.params;
  const state = store.getState();
  const group = state.groups.find((g) => g.id === id);

  const body = (req.body ?? {}) as Partial<WhatIfInput>;
  const input: WhatIfInput = {
    target_amount: Number(body.target_amount ?? group?.target_amount ?? 2000),
    total_cycles: Number(body.total_cycles ?? group?.total_cycles ?? 4),
    member_count: Number(body.member_count ?? group?.members.length ?? 4),
    reserve_percentage: Number(body.reserve_percentage ?? group?.rules.reserve_percentage ?? 10),
    delayed_members: Number(body.delayed_members ?? 1),
    delayed_at_cycle: Number(body.delayed_at_cycle ?? 2),
    dropout_count: Number(body.dropout_count ?? 0),
  };

  const simulation = runWhatIfSimulation(input);
  res.json({ simulation, input });
}

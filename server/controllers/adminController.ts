import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth';
import { store } from '../services/store';
import type { UserRole } from '../../src/shared/types';

export function getAdminOverview(_req: AuthenticatedRequest, res: Response): void {
  const state = store.getState();
  const totalGroups = state.groups.length;
  const completedGroups = state.groups.filter((g) => g.status === 'completed').length;
  const activeGroups = state.groups.filter((g) => g.status === 'active').length;

  const avgCompletionRate =
    totalGroups === 0
      ? 0
      : Math.round(
          state.groups.reduce(
            (sum, g) => sum + (g.current_cycle / Math.max(1, g.total_cycles)) * 100,
            0
          ) / totalGroups
        );

  // Engajamento por turma / instituição
  const byInstitutionMap = new Map<string, { institution: string; users: number; groups: number }>();
  for (const user of state.users) {
    const key = user.institution?.trim() || 'Sem instituição informada';
    const curr = byInstitutionMap.get(key) ?? { institution: key, users: 0, groups: 0 };
    curr.users += 1;
    byInstitutionMap.set(key, curr);
  }
  for (const group of state.groups) {
    const creator = state.users.find((u) => u.id === group.created_by);
    const key = creator?.institution?.trim() || 'Sem instituição informada';
    const curr = byInstitutionMap.get(key) ?? { institution: key, users: 0, groups: 0 };
    curr.groups += 1;
    byInstitutionMap.set(key, curr);
  }

  res.json({
    metrics: {
      totalUsers: state.users.length,
      activeUsers: state.users.filter((u) => u.active).length,
      totalGroups,
      activeGroups,
      completedGroups,
      avgCompletionRate,
      totalWorkshops: state.workshops.length,
      activePills: state.pills.filter((p) => p.active).length,
    },
    institutionEngagement: Array.from(byInstitutionMap.values()),
    users: state.users.map((u) => store.sanitizeProfile(u)),
    groups: state.groups,
    pills: state.pills,
  });
}

export function updateUserRole(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;
  const { role, active } = req.body ?? {};
  const state = store.getState();
  const user = state.users.find((u) => u.id === id);

  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  const validRoles: UserRole[] = ['superadmin', 'educador', 'estudante'];
  if (role && validRoles.includes(role)) {
    if (user.id === req.user?.id && role !== 'superadmin') {
      res.status(400).json({ error: 'Não é permitido remover seu próprio acesso de Superadmin.' });
      return;
    }
    user.role = role;
  }

  if (typeof active === 'boolean') {
    if (user.id === req.user?.id && !active) {
      res.status(400).json({ error: 'Não é permitido desativar a própria conta Superadmin.' });
      return;
    }
    user.active = active;
  }

  store.commit();
  res.json({ user: store.sanitizeProfile(user) });
}

export function moderateGroup(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;
  const { action } = req.body ?? {};
  const state = store.getState();
  const idx = state.groups.findIndex((g) => g.id === id);

  if (idx === -1) {
    res.status(404).json({ error: 'Grupo não encontrado.' });
    return;
  }

  if (action === 'delete') {
    state.groups.splice(idx, 1);
    store.commit();
    res.json({ deleted: true, id });
    return;
  }

  if (action === 'reset_pact') {
    state.groups[idx].status = 'pact_pending';
    state.groups[idx].current_cycle = 0;
    state.groups[idx].cycles = [];
    for (const m of state.groups[idx].members) {
      m.pact_accepted = false;
      m.pact_accepted_at = null;
    }
    store.commit();
    res.json({ group: state.groups[idx] });
    return;
  }

  res.status(400).json({ error: 'Ação de moderação inválida.' });
}

export function createPill(req: AuthenticatedRequest, res: Response): void {
  const { title, content, category, ods_tag, cycle_trigger } = req.body ?? {};
  if (!title || !content || !category) {
    res.status(400).json({ error: 'Preencha título, conteúdo e categoria da pílula educativa.' });
    return;
  }

  const state = store.getState();
  const pill = {
    id: `pill_${Date.now()}`,
    title: String(title).trim(),
    content: String(content).trim(),
    category: String(category).trim(),
    ods_tag: String(ods_tag || 'ODS 4 · Educação de Qualidade').trim(),
    cycle_trigger: Math.max(1, Math.min(24, Math.round(Number(cycle_trigger ?? 1)))),
    active: true,
  };

  state.pills.unshift(pill);
  store.commit();
  res.status(201).json({ pill });
}

export function updatePill(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;
  const { title, content, category, ods_tag, cycle_trigger, active } = req.body ?? {};
  const state = store.getState();
  const pill = state.pills.find((p) => p.id === id);

  if (!pill) {
    res.status(404).json({ error: 'Pílula educativa não encontrada.' });
    return;
  }

  if (typeof title === 'string' && title.trim()) pill.title = title.trim();
  if (typeof content === 'string' && content.trim()) pill.content = content.trim();
  if (typeof category === 'string' && category.trim()) pill.category = category.trim();
  if (typeof ods_tag === 'string' && ods_tag.trim()) pill.ods_tag = ods_tag.trim();
  if (Number.isFinite(Number(cycle_trigger))) {
    pill.cycle_trigger = Math.max(1, Math.min(24, Math.round(Number(cycle_trigger))));
  }
  if (typeof active === 'boolean') pill.active = active;

  store.commit();
  res.json({ pill });
}

export function deletePill(req: AuthenticatedRequest, res: Response): void {
  const { id } = req.params;
  const state = store.getState();
  const idx = state.pills.findIndex((p) => p.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Pílula educativa não encontrada.' });
    return;
  }
  state.pills.splice(idx, 1);
  store.commit();
  res.json({ deleted: true, id });
}

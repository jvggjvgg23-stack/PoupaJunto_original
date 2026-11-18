import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth';
import { store } from '../services/store';

export function listWorkshops(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  const state = store.getState();
  const workshops = state.workshops.map((w) => ({
    ...w,
    groups: state.groups.filter((g) => g.room_pin === w.pin),
  }));

  res.json({ workshops });
}

export function createWorkshop(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  const { title, duration_minutes } = req.body ?? {};
  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    res.status(400).json({ error: 'Informe um título para a sala de oficina.' });
    return;
  }

  const state = store.getState();
  let pin = '';
  for (let i = 0; i < 10; i++) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000));
    if (!state.workshops.some((w) => w.pin === candidate)) {
      pin = candidate;
      break;
    }
  }

  const newWorkshop = {
    id: `wsp_${Date.now()}`,
    pin,
    title: title.trim(),
    educator_id: req.user.id,
    educator_name: req.user.display_name,
    institution: req.user.institution || 'SENAI Jaú-SP',
    duration_minutes: Math.max(10, Math.min(90, Math.round(Number(duration_minutes ?? 15)))),
    active: true,
    created_at: new Date().toISOString(),
  };

  state.workshops.unshift(newWorkshop);
  store.commit();

  res.status(201).json({ workshop: { ...newWorkshop, groups: [] } });
}

export function joinWorkshopByPin(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  const { pin } = req.body ?? {};
  const cleanPin = String(pin ?? '').trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    res.status(400).json({ error: 'Digite um código PIN válido de 6 dígitos.' });
    return;
  }

  const state = store.getState();
  const workshop = state.workshops.find((w) => w.pin === cleanPin && w.active);
  if (!workshop) {
    res.status(404).json({ error: 'Oficina não encontrada ou encerrada para este PIN.' });
    return;
  }

  const roomGroups = state.groups.filter((g) => g.room_pin === cleanPin);
  res.json({
    workshop: {
      ...workshop,
      groups: roomGroups,
    },
  });
}

export function listPills(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  const state = store.getState();
  const pills =
    req.user.role === 'superadmin'
      ? state.pills
      : state.pills.filter((p) => p.active);

  res.json({ pills });
}

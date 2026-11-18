import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { store } from '../services/store';
import { signAppToken, type AuthenticatedRequest } from '../middlewares/auth';
import { generateRecoveryKey } from '../../src/shared/recovery';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, full_name, display_name, institution } = req.body ?? {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'Informe um e-mail válido para cadastro.' });
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'A senha deve possuir no mínimo 6 caracteres.' });
    return;
  }
  if (!display_name || typeof display_name !== 'string' || display_name.trim().length < 2) {
    res.status(400).json({
      error: 'Informe um nome de exibição válido (LGPD: sem CPF ou dados bancários).',
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const state = store.getState();

  if (state.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    res.status(409).json({ error: 'Já existe uma conta cadastrada com este e-mail.' });
    return;
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const passwordHash = bcrypt.hashSync(password, 10);
  const newUser = {
    id: userId,
    email: normalizedEmail,
    password_hash: passwordHash,
    full_name: (full_name || display_name).trim(),
    display_name: display_name.trim(),
    nickname: display_name.trim().split(' ')[0],
    avatar_url: '',
    role: 'estudante' as const,
    institution: typeof institution === 'string' ? institution.trim() : '',
    bio: '',
    theme_preference: 'light' as const,
    active: true,
    created_at: new Date().toISOString(),
  };

  state.users.push(newUser);
  store.commit();

  const token = signAppToken(newUser.id);
  res.status(201).json({
    token,
    user: store.sanitizeProfile(newUser),
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: 'Preencha e-mail e senha para entrar.' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const state = store.getState();
  const user = state.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user || !user.password_hash || !bcrypt.compareSync(String(password), user.password_hash)) {
    res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    return;
  }

  if (!user.active) {
    res.status(403).json({ error: 'Esta conta foi desativada pela moderação.' });
    return;
  }

  const token = signAppToken(user.id);
  res.json({
    token,
    user: store.sanitizeProfile(user),
  });
}

export async function googleLogin(req: Request, res: Response): Promise<void> {
  const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

  if (!rawEmail || !rawEmail.includes('@')) {
    res.status(400).json({ error: 'Informe um e-mail Google válido para entrar localmente.' });
    return;
  }

  const state = store.getState();
  let user = state.users.find((u) => u.email.toLowerCase() === rawEmail);

  if (user) {
    if (!user.active) {
      res.status(403).json({ error: 'Esta conta foi desativada pela moderação.' });
      return;
    }
  } else {
    const displayName = rawName || rawEmail.split('@')[0];
    const nickname = displayName.split(' ')[0] || 'Estudante';
    user = {
      id: `usr_google_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: rawEmail,
      password_hash: '',
      full_name: displayName,
      display_name: displayName,
      nickname,
      avatar_url: '',
      role: 'estudante',
      institution: '',
      bio: '',
      theme_preference: 'light',
      active: true,
      created_at: new Date().toISOString(),
    };
    state.users.push(user);
    store.commit();
  }

  const token = signAppToken(user.id);
  res.json({
    token,
    user: store.sanitizeProfile(user),
  });
}

export async function recoverPassword(req: Request, res: Response): Promise<void> {
  const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

  if (!rawEmail || !rawEmail.includes('@')) {
    res.status(400).json({ error: 'Informe um e-mail válido cadastrado para gerar a chave de recuperação.' });
    return;
  }

  const state = store.getState();
  const user = state.users.find((u) => u.email.toLowerCase() === rawEmail);

  if (!user) {
    res.status(404).json({ error: 'Nenhuma conta encontrada para este e-mail.' });
    return;
  }
  if (!user.active) {
    res.status(403).json({ error: 'Esta conta foi desativada pela moderação.' });
    return;
  }

  const recoveryKey = generateRecoveryKey(8);
  const expiresMinutes = 15;
  const now = Date.now();
  const expiresAt = new Date(now + expiresMinutes * 60 * 1000).toISOString();

  for (const prev of state.passwordResets) {
    if (prev.user_id === user.id && !prev.used_at) {
      prev.used_at = new Date(now).toISOString();
    }
  }

  state.passwordResets.push({
    id: `rst_${now}_${Math.random().toString(36).slice(2, 7)}`,
    user_id: user.id,
    email: rawEmail,
    code_hash: bcrypt.hashSync(recoveryKey, 10),
    expires_at: expiresAt,
    used_at: null,
    created_at: new Date(now).toISOString(),
  });
  store.commit();

  res.json({
    sentTo: rawEmail,
    expiresMinutes,
    recoveryKey,
    message: `Chave de recuperação gerada para ${rawEmail} e entregue na Caixa de Entrada local.`,
  });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { email, recoveryKey, newPassword } = req.body ?? {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'Informe um e-mail válido.' });
    return;
  }
  if (!recoveryKey || typeof recoveryKey !== 'string' || recoveryKey.trim().length < 6) {
    res.status(400).json({ error: 'Informe a chave de recuperação.' });
    return;
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    res.status(400).json({ error: 'A nova senha deve possuir no mínimo 6 caracteres.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedKey = recoveryKey.trim().toUpperCase();
  const state = store.getState();

  const user = state.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    res.status(404).json({ error: 'Conta não encontrada para este e-mail.' });
    return;
  }
  if (!user.active) {
    res.status(403).json({ error: 'Esta conta foi desativada pela moderação.' });
    return;
  }

  const nowMs = Date.now();
  const validRecord = [...state.passwordResets]
    .reverse()
    .find(
      (r) =>
        r.user_id === user.id &&
        !r.used_at &&
        Date.parse(r.expires_at) > nowMs &&
        bcrypt.compareSync(normalizedKey, r.code_hash)
    );

  if (!validRecord) {
    res.status(400).json({
      error: 'Chave de recuperação inválida ou expirada. Solicite uma nova chave.',
    });
    return;
  }

  validRecord.used_at = new Date(nowMs).toISOString();
  user.password_hash = bcrypt.hashSync(newPassword, 10);
  store.commit();

  const token = signAppToken(user.id);
  res.json({
    token,
    user: store.sanitizeProfile(user),
    message: 'Senha redefinida com sucesso!',
  });
}

export function getSessionMe(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }
  res.json({ user: req.user });
}

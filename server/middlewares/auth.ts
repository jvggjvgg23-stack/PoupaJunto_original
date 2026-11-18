import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { store } from '../services/store';
import type { Profile } from '../../src/shared/types';

export interface AuthenticatedRequest extends Request {
  user?: Profile;
}

export function signAppToken(userId: string): string {
  return jwt.sign({ sub: userId }, ENV.LOCAL_TOKEN_SIGNING_KEY, { expiresIn: '30d' });
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sessão não autenticada. Faça login para continuar.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  const state = store.getState();

  try {
    const decoded = jwt.verify(token, ENV.LOCAL_TOKEN_SIGNING_KEY) as { sub?: string };
    if (decoded?.sub) {
      const user = state.users.find((u) => u.id === decoded.sub);
      if (!user) {
        res.status(401).json({ error: 'Usuário não encontrado.' });
        return;
      }
      if (!user.active) {
        res.status(403).json({ error: 'Conta desativada pela administração.' });
        return;
      }
      req.user = store.sanitizeProfile(user);
      next();
      return;
    }
  } catch {
    // Token inválido
  }

  res.status(401).json({ error: 'Token de sessão inválido ou expirado.' });
}

export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }
  if (req.user.role !== 'superadmin') {
    res.status(403).json({ error: 'Acesso restrito ao perfil Superadmin.' });
    return;
  }
  next();
}

export function requireEducatorOrAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }
  if (req.user.role !== 'educador' && req.user.role !== 'superadmin') {
    res.status(403).json({ error: 'Acesso restrito a Educadores ou Superadmin.' });
    return;
  }
  next();
}

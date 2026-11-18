import fs from 'fs';
import path from 'path';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth';
import { AVATARS_DIR, store } from '../services/store';

export function getMyProfile(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }
  res.json({ profile: req.user });
}

export function updateMyProfile(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  const { display_name, full_name, nickname, institution, bio, theme_preference } = req.body ?? {};
  const state = store.getState();
  const user = state.users.find((u) => u.id === req.user!.id);

  if (!user) {
    res.status(404).json({ error: 'Perfil não encontrado.' });
    return;
  }

  if (typeof display_name === 'string' && display_name.trim().length >= 2) {
    user.display_name = display_name.trim();
  }
  if (typeof full_name === 'string' && full_name.trim().length >= 2) {
    user.full_name = full_name.trim();
  }
  if (typeof nickname === 'string') {
    user.nickname = nickname.trim().slice(0, 32);
  }
  if (typeof institution === 'string') {
    user.institution = institution.trim().slice(0, 80);
  }
  if (typeof bio === 'string') {
    user.bio = bio.trim().slice(0, 240);
  }
  if (theme_preference === 'light' || theme_preference === 'dark') {
    user.theme_preference = theme_preference;
  }

  for (const group of state.groups) {
    for (const member of group.members) {
      if (member.user_id === user.id) {
        member.display_name = user.display_name;
        member.nickname = user.nickname;
        member.institution = user.institution;
      }
    }
  }

  store.commit();
  res.json({ profile: store.sanitizeProfile(user) });
}

export async function uploadAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  const { imageDataUrl } = req.body ?? {};
  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    res.status(400).json({ error: 'Envie uma imagem válida para atualizar a foto de perfil.' });
    return;
  }

  const match = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(imageDataUrl);
  if (!match) {
    res.status(400).json({ error: 'Formato de imagem inválido. Utilize PNG, JPG ou WebP.' });
    return;
  }

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.byteLength > 2 * 1024 * 1024) {
    res.status(400).json({ error: 'A imagem deve ter no máximo 2 MB após redimensionamento.' });
    return;
  }

  const fileName = `${req.user.id}_${Date.now()}.${ext}`;
  const avatarUrl = `/api/avatars/${fileName}`;

  fs.mkdirSync(AVATARS_DIR, { recursive: true });
  fs.writeFileSync(path.join(AVATARS_DIR, fileName), buffer);

  const state = store.getState();
  const user = state.users.find((u) => u.id === req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'Perfil não encontrado.' });
    return;
  }

  user.avatar_url = avatarUrl;
  for (const group of state.groups) {
    for (const member of group.members) {
      if (member.user_id === user.id) {
        member.avatar_url = avatarUrl;
      }
    }
  }

  store.commit();
  res.json({ avatar_url: avatarUrl, profile: store.sanitizeProfile(user) });
}

import React, { useMemo, useRef, useState } from 'react';
import { Award, Camera, CheckCircle2, Moon, Save, ShieldCheck, Sun } from 'lucide-react';
import { api, type EnrichedGroup } from '../services/api';
import { computeEducationalBadges } from '../shared/simulation';
import type { Profile, ThemePreference } from '../shared/types';
import { Avatar } from './Avatar';

interface ProfileViewProps {
  user: Profile;
  groups: EnrichedGroup[];
  theme: ThemePreference;
  onToggleTheme: () => void;
  onProfileUpdated: (updated: Profile) => void;
  onOpenAdmin?: () => void;
}

async function resizeImageToSquareDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Contexto gráfico indisponível.'));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  groups,
  theme,
  onToggleTheme,
  onProfileUpdated,
  onOpenAdmin,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [displayName, setDisplayName] = useState(user.display_name);
  const [nickname, setNickname] = useState(user.nickname);
  const [institution, setInstitution] = useState(user.institution);
  const [bio, setBio] = useState(user.bio);
  const [avatarPreview, setAvatarPreview] = useState<string>(user.avatar_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const badges = useMemo(() => computeEducationalBadges(groups, user.id), [groups, user.id]);
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const userGroupsCount = groups.filter((g) =>
    g.members.some((m) => m.user_id === user.id)
  ).length;
  const totalCyclesParticipated = groups.reduce(
    (sum, g) => sum + g.cycles.filter((c) => c.member_id === user.id).length,
    0
  );

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setFeedback(null);
    setUploading(true);
    try {
      const dataUrl = await resizeImageToSquareDataUrl(file);
      setAvatarPreview(dataUrl);
      const res = await api.profile.uploadAvatar(dataUrl);
      onProfileUpdated(res.profile);
      setAvatarPreview(res.avatar_url);
      setFeedback('Foto de perfil atualizada e salva com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar foto de perfil.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    setSaving(true);
    try {
      const res = await api.profile.update({
        display_name: displayName,
        nickname,
        institution,
        bio,
        theme_preference: theme,
      });
      onProfileUpdated(res.profile);
      setFeedback('Dados do perfil salvos com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Conta Pessoal · Privacidade LGPD (sem CPF ou dados bancários)
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
            Meu Perfil
          </h1>
        </div>

        {user.role === 'superadmin' && onOpenAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2A7C13] px-4 py-2 text-xs font-semibold text-white hover:bg-[#15370D] dark:bg-[#76C457] dark:text-[#15370D]"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Abrir Painel Superadmin</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Coluna Esquerda: Foto, Tema e Estatísticas */}
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-[#1E293B]">
            <div className="relative mx-auto w-fit">
              <Avatar src={avatarPreview} name={displayName || user.display_name} size="xl" />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Alterar foto de perfil"
                className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#2A7C13] text-white shadow-md transition hover:bg-[#15370D] dark:border-[#1E293B] dark:bg-[#76C457] dark:text-[#15370D]"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
                className="sr-only"
              />
            </div>

            <h2 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-white">
              {user.display_name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user.email} · Perfil{' '}
              {user.role === 'superadmin'
                ? 'Superadmin'
                : user.role === 'educador'
                  ? 'Educador'
                  : 'Estudante'}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {uploading
                ? 'Redimensionando e enviando avatar...'
                : 'Clique na câmera para enviar uma foto (recorte quadrado 256×256 automático).'}
            </p>
          </div>

          {/* Preferência de Tema */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1E293B]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Aparência do Aplicativo
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Sincronizada com sua conta
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {theme === 'dark' ? (
                  <>
                    <Moon className="h-4 w-4 text-[#76C457]" />
                    <span>Dark Mode</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4 text-[#2A7C13]" />
                    <span>Light Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Estatísticas de Participação */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1E293B]">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Participação em Simulações
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <p className="font-mono text-lg font-bold tabular-nums text-[#15370D] dark:text-[#76C457]">
                  {userGroupsCount}
                </p>
                <p className="text-[11px] text-slate-500">Grupos</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <p className="font-mono text-lg font-bold tabular-nums text-[#2A7C13] dark:text-[#76C457]">
                  {totalCyclesParticipated}
                </p>
                <p className="text-[11px] text-slate-500">Ciclos</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <p className="font-mono text-lg font-bold tabular-nums text-[#2A7C13] dark:text-[#76C457]">
                  {unlockedCount}/{badges.length}
                </p>
                <p className="text-[11px] text-slate-500">Selos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Formulário de Dados + Conquistas */}
        <div className="space-y-6 lg:col-span-8">
          <form
            onSubmit={handleSaveProfile}
            className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#1E293B]"
          >
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Informações de Exibição
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="prof-display-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Nome de Exibição
                </label>
                <input
                  id="prof-display-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="prof-nickname"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Apelido no Grupo
                </label>
                <input
                  id="prof-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-4">
              <label
                htmlFor="prof-institution"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Turma / Instituição (opcional)
              </label>
              <input
                id="prof-institution"
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Ex.: SENAI Jaú-SP · 3º DS"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="prof-bio"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Biografia Curta
              </label>
              <textarea
                id="prof-bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Conte seus objetivos de aprendizado com metas coletivas..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2A7C13] px-5 py-2 text-xs font-semibold text-white hover:bg-[#15370D] disabled:opacity-60 dark:bg-[#76C457] dark:text-[#15370D]"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </form>

          {/* Conquistas Educativas */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#1E293B]">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-[#2A7C13] dark:text-[#76C457]" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Conquistas Educativas
              </h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className={`rounded-xl border p-3.5 ${
                    b.unlocked
                      ? 'border-[#2A7C13]/50 bg-[#76C457]/10 dark:border-[#76C457]/40'
                      : 'border-slate-200 opacity-70 dark:border-slate-800'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{b.name}</p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{b.description}</p>
                  <p className="mt-1 font-mono text-[11px] font-semibold text-[#15370D] dark:text-[#76C457]">
                    {b.criterion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

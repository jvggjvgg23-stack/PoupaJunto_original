import React, { useEffect, useState } from 'react';
import { GraduationCap, KeyRound, Plus, Users } from 'lucide-react';
import { api, type WorkshopWithGroups } from '../services/api';
import type { Profile } from '../shared/types';

interface WorkshopPinViewProps {
  user: Profile;
  onSelectGroup: (groupId: string) => void;
}

export const WorkshopPinView: React.FC<WorkshopPinViewProps> = ({ user, onSelectGroup }) => {
  const [workshops, setWorkshops] = useState<WorkshopWithGroups[]>([]);
  const [pinInput, setPinInput] = useState('482910');
  const [joinedRoom, setJoinedRoom] = useState<WorkshopWithGroups | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [duration, setDuration] = useState('15');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = user.role === 'educador' || user.role === 'superadmin';

  const loadWorkshops = async () => {
    try {
      const res = await api.workshops.list();
      setWorkshops(res.workshops);
    } catch {
      // Ignorar silenciosamente se ainda carregando
    }
  };

  useEffect(() => {
    loadWorkshops();
  }, []);

  const handleJoinByPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.workshops.joinByPin(pinInput);
      setJoinedRoom(res.workshop);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código PIN inválido.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.workshops.create({
        title: newTitle,
        duration_minutes: Number(duration),
      });
      setWorkshops((prev) => [res.workshop, ...prev]);
      setJoinedRoom(res.workshop);
      setNewTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar sala de oficina.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">
          Dinâmica Guiada em Sala de Aula
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
          Modo Oficina com Código PIN
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Participe de sessões rápidas de 15 minutos em turma e compare as estratégias de pacto e reserva entre equipes.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Entrar com PIN */}
        <form
          onSubmit={handleJoinByPin}
          className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-6 dark:border-slate-800 dark:bg-[#1E293B]"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#2A7C13] dark:text-[#76C457]" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Entrar em Oficina por PIN
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Digite o código de 6 dígitos fornecido pelo educador (ex.: 482910).
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="workshop-pin-input" className="sr-only">
              Código PIN da oficina
            </label>
            <input
              id="workshop-pin-input"
              type="text"
              maxLength={6}
              required
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="min-h-[46px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono text-lg font-bold tracking-widest text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
            />
            <button
              type="submit"
              disabled={loading}
              className="min-h-[46px] rounded-xl bg-[#2A7C13] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#15370D] whitespace-nowrap dark:bg-[#76C457] dark:text-[#15370D]"
            >
              {loading ? 'Buscando...' : 'Acessar Sala'}
            </button>
          </div>
        </form>

        {/* Educador / Superadmin: Abrir nova oficina */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-6 dark:border-slate-800 dark:bg-[#1E293B]">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[#15370D] dark:text-[#76C457]" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Criar Sala de Oficina (Educador)
            </h2>
          </div>

          {canCreate ? (
            <form onSubmit={handleCreateWorkshop} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="workshop-title"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Tema da Dinâmica
                </label>
                <input
                  id="workshop-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex.: Oficina Prática · Turma 2º Eletromecânica"
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-end gap-3">
                <div className="w-36">
                  <label
                    htmlFor="workshop-duration"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Duração (min)
                  </label>
                  <input
                    id="workshop-duration"
                    type="number"
                    min={10}
                    max={90}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#15370D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A7C13] dark:bg-[#76C457] dark:text-[#15370D]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Gerar PIN de 6 Dígitos</span>
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              A criação de salas com código PIN é exclusiva para contas com perfil Educador ou Superadmin.
              Utilize o campo ao lado para entrar em uma oficina existente usando o PIN da sua turma.
            </p>
          )}
        </div>
      </div>

      {/* Sala Selecionada / Comparação de Equipes */}
      {(joinedRoom || workshops[0]) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#1E293B]">
          {(() => {
            const room = joinedRoom ?? workshops[0];
            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Facilitador: {room.educator_name} · {room.institution} · {room.duration_minutes} min
                    </p>
                    <h2 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white">
                      {room.title}
                    </h2>
                  </div>
                  <div className="rounded-xl bg-[#2A7C13]/12 px-4 py-2 text-center dark:bg-[#76C457]/15">
                    <p className="text-[10px] font-semibold text-[#15370D] dark:text-[#76C457]">
                      PIN DA SALA
                    </p>
                    <p className="font-mono text-xl font-extrabold tracking-widest text-[#15370D] dark:text-white">
                      {room.pin}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {room.groups.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Nenhum grupo vinculado a este PIN ainda. Ao criar um novo grupo, informe o PIN {room.pin}.
                    </p>
                  ) : (
                    room.groups.map((grp) => (
                      <div
                        key={grp.id}
                        className="flex flex-col justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                      >
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {grp.category} · Reserva {grp.rules.reserve_percentage}% · Ciclo {grp.current_cycle}/
                            {grp.total_cycles}
                          </p>
                          <h3 className="mt-1 font-display text-sm font-bold text-slate-900 dark:text-white">
                            {grp.name}
                          </h3>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            Regra de atraso: {grp.rules.delay_policy}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between pt-2">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Users className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{grp.members.length} membros</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => onSelectGroup(grp.id)}
                            className="text-xs font-semibold text-[#2A7C13] hover:underline dark:text-[#76C457]"
                          >
                            Inspecionar simulação
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            );
          })()}
        </section>
      )}
    </div>
  );
};

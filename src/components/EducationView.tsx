import React, { useMemo, useState } from 'react';
import { Award, BookOpen, CheckCircle2, Lock } from 'lucide-react';
import type { EnrichedGroup } from '../services/api';
import { computeEducationalBadges } from '../shared/simulation';
import type { EducationalPill, Profile } from '../shared/types';

interface EducationViewProps {
  user: Profile;
  groups: EnrichedGroup[];
  pills: EducationalPill[];
}

export const EducationView: React.FC<EducationViewProps> = ({ user, groups, pills }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const categories = useMemo(
    () => ['Todas', ...Array.from(new Set(pills.map((p) => p.category)))],
    [pills]
  );

  const filteredPills = useMemo(
    () =>
      selectedCategory === 'Todas'
        ? pills
        : pills.filter((p) => p.category === selectedCategory),
    [pills, selectedCategory]
  );

  const badges = useMemo(() => computeEducationalBadges(groups, user.id), [groups, user.id]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">
          Cidadania Financeira (Banco Central) · ONU ODS 4 e ODS 8
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
          Trilhas, Pílulas Educativas e Conquistas
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Conteúdo objetivo para desenvolver organização coletiva, prevenção de conflitos e gestão de reservas.
        </p>
      </div>

      {/* Selos Comportamentais Éticos */}
      <section aria-label="Selos comportamentais educativos">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-[#2A7C13] dark:text-[#76C457]" aria-hidden="true" />
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Selos Comportamentais de Participação
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-2xl border p-4 transition ${
                badge.unlocked
                  ? 'border-[#2A7C13]/50 bg-white dark:border-[#76C457]/40 dark:bg-[#1E293B]'
                  : 'border-slate-200 bg-slate-50/70 opacity-80 dark:border-slate-800 dark:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                    badge.unlocked ? 'text-[#2A7C13] dark:text-[#76C457]' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {badge.unlocked ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>{badge.unlocked ? 'Conquistado' : 'Em progresso'}</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {badge.criterion}
                </span>
              </div>
              <h3 className="mt-2 font-display text-sm font-bold text-slate-900 dark:text-white">
                {badge.name}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {badge.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pílulas Educativas */}
      <section aria-label="Pílulas educativas">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#15370D] dark:text-[#76C457]" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Pílulas Educativas por Tema
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-white text-[#15370D] shadow-sm dark:bg-[#1E293B] dark:text-[#76C457]'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredPills.map((pill) => (
            <article
              key={pill.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1E293B]"
            >
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {pill.category} · Recomendado no Ciclo {pill.cycle_trigger}
                </p>
                <h3 className="mt-1.5 font-display text-base font-bold text-slate-900 dark:text-white">
                  {pill.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {pill.content}
                </p>
              </div>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-[#2A7C13] dark:border-slate-800 dark:text-[#76C457]">
                {pill.ods_tag}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

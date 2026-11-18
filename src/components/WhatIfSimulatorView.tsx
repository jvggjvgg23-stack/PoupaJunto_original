import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert, Sliders } from 'lucide-react';
import type { EnrichedGroup } from '../services/api';
import { runWhatIfSimulation } from '../shared/simulation';
import type { WhatIfInput } from '../shared/types';

interface WhatIfSimulatorViewProps {
  initialGroup: EnrichedGroup | null;
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const WhatIfSimulatorView: React.FC<WhatIfSimulatorViewProps> = ({ initialGroup }) => {
  const storageKey = `poupajunto_whatif_${initialGroup?.id ?? 'default'}`;

  const [input, setInput] = useState<WhatIfInput>(() => {
    const defaults: WhatIfInput = {
      target_amount: initialGroup?.target_amount ?? 2400,
      total_cycles: initialGroup?.total_cycles ?? 4,
      member_count: initialGroup?.members.length ?? 4,
      reserve_percentage: initialGroup?.rules.reserve_percentage ?? 10,
      delayed_members: Math.min(2, initialGroup?.members.length ?? 4),
      delayed_at_cycle: 2,
      dropout_count: 0,
    };
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return { ...defaults, ...(JSON.parse(saved) as Partial<WhatIfInput>) };
      }
    } catch {
      // ignore
    }
    return defaults;
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(input));
    } catch {
      // ignore
    }
  }, [storageKey, input]);

  const result = useMemo(() => runWhatIfSimulation(input), [input]);

  // Coordenadas do gráfico SVG responsivo
  const chartWidth = 640;
  const chartHeight = 250;
  const padX = 48;
  const padY = 26;
  const plotW = chartWidth - padX * 2;
  const plotH = chartHeight - padY * 2;
  const maxVal = Math.max(input.target_amount, 100);

  const plannedPath = result.timeline
    .map((pt, idx) => {
      const x =
        result.timeline.length === 1
          ? padX + plotW
          : padX + (idx / (result.timeline.length - 1)) * plotW;
      const y = padY + plotH - (pt.plannedCumulative / maxVal) * plotH;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const stressedPath = result.timeline
    .map((pt, idx) => {
      const x =
        result.timeline.length === 1
          ? padX + plotW
          : padX + (idx / (result.timeline.length - 1)) * plotW;
      const y = padY + plotH - (pt.stressedCumulative / maxVal) * plotH;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const resilienceConfig = {
    alta: {
      label: 'Resiliência Alta · Pacto Saudável',
      color: 'text-[#2A7C13] dark:text-[#76C457]',
      icon: CheckCircle2,
    },
    moderada: {
      label: 'Resiliência Moderada · Ajuste Recomendado',
      color: 'text-amber-700 dark:text-amber-400',
      icon: AlertCircle,
    },
    critica: {
      label: 'Resiliência Crítica · Risco de Atraso',
      color: 'text-red-600 dark:text-red-400',
      icon: ShieldAlert,
    },
  }[result.resilienceRating];

  const ResilienceIcon = resilienceConfig.icon;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">
          Laboratório de Cenários · Simulação Educacional
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
          Simulador &ldquo;E Se?&rdquo; — Teste de Estresse do Pacto
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Ajuste os controles abaixo para experimentar antes do Ciclo 1 o que acontece se integrantes atrasarem,
          saírem do grupo ou se a turma reforçar o Fundo Reserva Coletivo.
        </p>
      </div>

      {/* Layout de 2 zonas (Palco Gráfico + Deck de Parâmetros) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Esquerda: Palco Visual e Resultados */}
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7 dark:border-slate-800 dark:bg-[#1E293B]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-2 text-sm font-bold ${resilienceConfig.color}`}>
              <ResilienceIcon className="h-4 w-4" aria-hidden="true" />
              <span>{resilienceConfig.label}</span>
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              Cota/membro: {formatBRL(result.plannedPerMemberCycle)}/ciclo
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/70">
            <div className="mb-2 flex flex-wrap items-center gap-4 text-xs font-medium">
              <span className="inline-flex items-center gap-1.5 text-[#2A7C13] dark:text-[#76C457]">
                <span className="inline-block h-2.5 w-4 rounded-sm bg-[#2A7C13] dark:bg-[#76C457]" />
                Curva Planejada
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#15370D] dark:text-slate-200">
                <span className="inline-block h-2.5 w-4 rounded-sm bg-[#15370D] dark:bg-[#2A7C13]" />
                Cenário Estressado (&ldquo;E Se?&rdquo;)
              </span>
            </div>

            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full overflow-visible"
              role="img"
              aria-label="Gráfico comparativo entre meta planejada e cenário estressado"
            >
              {/* Linhas de grade */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padY + plotH - ratio * plotH;
                const val = Math.round(maxVal * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1={padX}
                      y1={y}
                      x2={chartWidth - padX}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padX - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 font-mono text-[10px]"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Linha Planejada */}
              <path
                d={plannedPath}
                fill="none"
                className="stroke-[#2A7C13] dark:stroke-[#76C457]"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Linha Estressada */}
              <path
                d={stressedPath}
                fill="none"
                className="stroke-[#15370D] dark:stroke-[#2A7C13]"
                strokeWidth="3"
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Pontos de ciclo no eixo X */}
              {result.timeline.map((pt, idx) => {
                const x =
                  result.timeline.length === 1
                    ? padX + plotW
                    : padX + (idx / (result.timeline.length - 1)) * plotW;
                const yStressed = padY + plotH - (pt.stressedCumulative / maxVal) * plotH;
                return (
                  <g key={pt.cycle}>
                    <circle
                      cx={x}
                      cy={yStressed}
                      r="4.5"
                      className="fill-[#15370D] stroke-white dark:fill-[#2A7C13] dark:stroke-slate-900"
                      strokeWidth="1.5"
                    />
                    <text
                      x={x}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      className="fill-slate-500 font-mono text-[10px]"
                    >
                      C{pt.cycle}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Prazo Projetado</p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                {result.projectedTotalCycles} ciclos
                {result.estimatedDelayCycles > 0 ? ` (+${result.estimatedDelayCycles})` : ''}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Reserva Alvo</p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#2A7C13] dark:text-[#76C457]">
                {formatBRL(result.reserveTargetAmount)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Maior Déficit</p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#15370D] dark:text-[#76C457]">
                {formatBRL(result.peakShortfall)}
              </p>
            </div>
          </div>

          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <strong>Diagnóstico Educativo:</strong> {result.summaryRecommendation}
          </p>
        </div>

        {/* Direita: Controles Interativos */}
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-5 dark:border-slate-800 dark:bg-[#1E293B]">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#2A7C13] dark:text-[#76C457]" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Parâmetros do Teste de Estresse
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold">
                <label htmlFor="wi-target">Meta Fictícia Total</label>
                <span className="font-mono tabular-nums">{formatBRL(input.target_amount)}</span>
              </div>
              <input
                id="wi-target"
                type="range"
                min={400}
                max={6000}
                step={200}
                value={input.target_amount}
                onChange={(e) => setInput((p) => ({ ...p, target_amount: Number(e.target.value) }))}
                className="mt-2 w-full accent-[#2A7C13] dark:accent-[#76C457]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold">
                <label htmlFor="wi-members">Integrantes no Grupo</label>
                <span className="font-mono tabular-nums">{input.member_count} membros</span>
              </div>
              <input
                id="wi-members"
                type="range"
                min={2}
                max={12}
                step={1}
                value={input.member_count}
                onChange={(e) =>
                  setInput((p) => ({
                    ...p,
                    member_count: Number(e.target.value),
                    delayed_members: Math.min(p.delayed_members, Number(e.target.value)),
                    dropout_count: Math.min(p.dropout_count, Number(e.target.value) - 1),
                  }))
                }
                className="mt-2 w-full accent-[#2A7C13] dark:accent-[#76C457]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold">
                <label htmlFor="wi-cycles">Duração Planejada</label>
                <span className="font-mono tabular-nums">{input.total_cycles} ciclos</span>
              </div>
              <input
                id="wi-cycles"
                type="range"
                min={2}
                max={12}
                step={1}
                value={input.total_cycles}
                onChange={(e) =>
                  setInput((p) => ({
                    ...p,
                    total_cycles: Number(e.target.value),
                    delayed_at_cycle: Math.min(p.delayed_at_cycle, Number(e.target.value)),
                  }))
                }
                className="mt-2 w-full accent-[#2A7C13] dark:accent-[#76C457]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold">
                <label htmlFor="wi-reserve">Fundo Reserva Coletivo</label>
                <span className="font-mono tabular-nums text-[#2A7C13] dark:text-[#76C457]">
                  {input.reserve_percentage}%
                </span>
              </div>
              <input
                id="wi-reserve"
                type="range"
                min={0}
                max={30}
                step={5}
                value={input.reserve_percentage}
                onChange={(e) =>
                  setInput((p) => ({ ...p, reserve_percentage: Number(e.target.value) }))
                }
                className="mt-2 w-full accent-[#2A7C13] dark:accent-[#76C457]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold">
                <label htmlFor="wi-delayed">Atrasos Simulados no Imprevisto</label>
                <span className="font-mono tabular-nums text-[#15370D] dark:text-[#76C457]">
                  {input.delayed_members} integrante(s)
                </span>
              </div>
              <input
                id="wi-delayed"
                type="range"
                min={0}
                max={input.member_count}
                step={1}
                value={input.delayed_members}
                onChange={(e) =>
                  setInput((p) => ({ ...p, delayed_members: Number(e.target.value) }))
                }
                className="mt-2 w-full accent-[#15370D] dark:accent-[#76C457]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold">
                <label htmlFor="wi-cycle-hit">Ciclo em que ocorre o atraso</label>
                <span className="font-mono tabular-nums">Ciclo {input.delayed_at_cycle}</span>
              </div>
              <input
                id="wi-cycle-hit"
                type="range"
                min={1}
                max={input.total_cycles}
                step={1}
                value={input.delayed_at_cycle}
                onChange={(e) =>
                  setInput((p) => ({ ...p, delayed_at_cycle: Number(e.target.value) }))
                }
                className="mt-2 w-full accent-[#15370D] dark:accent-[#76C457]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold">
                <label htmlFor="wi-dropout">Saídas / Desistências Simuladas</label>
                <span className="font-mono tabular-nums text-red-600 dark:text-red-400">
                  {input.dropout_count} membro(s)
                </span>
              </div>
              <input
                id="wi-dropout"
                type="range"
                min={0}
                max={Math.max(0, input.member_count - 1)}
                step={1}
                value={input.dropout_count}
                onChange={(e) =>
                  setInput((p) => ({ ...p, dropout_count: Number(e.target.value) }))
                }
                className="mt-2 w-full accent-red-600"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

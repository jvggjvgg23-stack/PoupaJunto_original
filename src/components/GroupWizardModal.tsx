import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { api, type EnrichedGroup } from '../services/api';
import type { CycleFrequency } from '../shared/types';

interface GroupWizardModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (group: EnrichedGroup) => void;
}

export const GroupWizardModal: React.FC<GroupWizardModalProps> = ({ open, onClose, onCreated }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Formatura');
  const [goalDescription, setGoalDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('1800');
  const [totalCycles, setTotalCycles] = useState('4');
  const [cycleFrequency, setCycleFrequency] = useState<CycleFrequency>('mensal');
  const [reservePercentage, setReservePercentage] = useState('10');
  const [delayPolicy, setDelayPolicy] = useState(
    'Acionar o Fundo Reserva Coletivo por até 1 ciclo com aviso prévio no grupo.'
  );
  const [dropoutPolicy, setDropoutPolicy] = useState(
    'Redistribuir o saldo restante entre os integrantes ou ajustar a meta.'
  );
  const [surplusPolicy, setSurplusPolicy] = useState(
    'Dividir sobras proporcionalmente ao final ou manter para o próximo projeto.'
  );
  const [roomPin, setRoomPin] = useState('');
  const [includeDemoPeers, setIncludeDemoPeers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (name.trim().length < 3) {
        setError('Informe um nome com pelo menos 3 caracteres para o grupo.');
        return;
      }
      const amt = Number(targetAmount);
      if (!Number.isFinite(amt) || amt <= 0) {
        setError('Informe um valor fictício maior que R$ 0.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const cyc = Number(totalCycles);
      if (!Number.isFinite(cyc) || cyc < 2 || cyc > 24) {
        setError('Escolha entre 2 e 24 ciclos de simulação.');
        return;
      }
      setStep(3);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (delayPolicy.trim().length < 5 || dropoutPolicy.trim().length < 5) {
      setError('Defina as regras de atraso e desistência para o Pacto de Transparência.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.groups.create({
        name: name.trim(),
        goal_description: goalDescription.trim() || `Simulação coletiva: ${name.trim()}`,
        category,
        target_amount: Number(targetAmount),
        total_cycles: Number(totalCycles),
        cycle_frequency: cycleFrequency,
        delay_policy: delayPolicy.trim(),
        dropout_policy: dropoutPolicy.trim(),
        surplus_policy: surplusPolicy.trim(),
        reserve_percentage: Number(reservePercentage),
        room_pin: roomPin.trim() || undefined,
        include_demo_peers: includeDemoPeers,
      });
      onCreated(res.group);
      setStep(1);
      setName('');
      setGoalDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar grupo simulado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Criar nova meta coletiva simulada"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-[#1E293B]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#2A7C13] dark:text-[#76C457]">
              Passo {step} de 3 · Simulação sem dinheiro real
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
              {step === 1 && 'Objetivo e Valor Fictício da Meta'}
              {step === 2 && 'Ciclos e Fundo Reserva Coletivo'}
              {step === 3 && 'Pacto de Regras Visíveis'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar assistente de criação"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de progresso do Wizard */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-colors ${
                idx <= step ? 'bg-[#2A7C13] dark:bg-[#76C457]' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="mt-5 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label
                  htmlFor="wiz-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Nome do Grupo / Meta Coletiva
                </label>
                <input
                  id="wiz-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Viagem Técnica SENAI Campus Party"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="wiz-category"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Categoria
                  </label>
                  <select
                    id="wiz-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                  >
                    <option value="Formatura">Formatura</option>
                    <option value="Viagem Técnica">Viagem Técnica</option>
                    <option value="Equipamentos">Equipamentos Compartilhados</option>
                    <option value="Projeto Escolar">Projeto Escolar / INTEGRA</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="wiz-target"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Valor Fictício da Meta (R$)
                  </label>
                  <input
                    id="wiz-target"
                    type="number"
                    min={50}
                    step={50}
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="wiz-desc"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Descrição do objetivo
                </label>
                <textarea
                  id="wiz-desc"
                  rows={3}
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  placeholder="Explique o propósito desta simulação educativa para os colegas..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="wiz-cycles"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Quantidade de Ciclos (2 a 24)
                  </label>
                  <input
                    id="wiz-cycles"
                    type="number"
                    min={2}
                    max={24}
                    required
                    value={totalCycles}
                    onChange={(e) => setTotalCycles(e.target.value)}
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="wiz-freq"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Frequência dos Ciclos
                  </label>
                  <select
                    id="wiz-freq"
                    value={cycleFrequency}
                    onChange={(e) => setCycleFrequency(e.target.value as CycleFrequency)}
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <label htmlFor="wiz-reserve" className="text-slate-700 dark:text-slate-300">
                    Fundo Reserva Coletivo (%)
                  </label>
                  <span className="font-mono text-[#2A7C13] dark:text-[#76C457]">
                    {reservePercentage}%
                  </span>
                </div>
                <input
                  id="wiz-reserve"
                  type="range"
                  min={0}
                  max={30}
                  step={5}
                  value={reservePercentage}
                  onChange={(e) => setReservePercentage(e.target.value)}
                  className="mt-2 w-full accent-[#2A7C13] dark:accent-[#76C457]"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Percentual simulado de amortecimento para cobrir atrasos pontuais sem travar a turma.
                </p>
              </div>

              <div>
                <label
                  htmlFor="wiz-pin"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  PIN da Oficina / Sala de Aula (opcional)
                </label>
                <input
                  id="wiz-pin"
                  type="text"
                  maxLength={6}
                  value={roomPin}
                  onChange={(e) => setRoomPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex.: 482910"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={includeDemoPeers}
                  onChange={(e) => setIncludeDemoPeers(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#2A7C13]"
                />
                <span>Incluir colegas de turma para simular dinâmica em grupo imediatamente</span>
              </label>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label
                  htmlFor="wiz-delay"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Regra se alguém atrasar um ciclo
                </label>
                <textarea
                  id="wiz-delay"
                  rows={2}
                  required
                  value={delayPolicy}
                  onChange={(e) => setDelayPolicy(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-dropout"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Regra se alguém precisar sair do grupo
                </label>
                <textarea
                  id="wiz-dropout"
                  rows={2}
                  required
                  value={dropoutPolicy}
                  onChange={(e) => setDropoutPolicy(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                />
              </div>

              <div>
                <label
                  htmlFor="wiz-surplus"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Destino de sobras ou ajuste de meta
                </label>
                <textarea
                  id="wiz-surplus"
                  rows={2}
                  required
                  value={surplusPolicy}
                  onChange={(e) => setSurplusPolicy(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#2A7C13] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-[#76C457]"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Pacto exigirá aceite antes do Ciclo 1
              </span>
            )}

            {step < 3 ? (
              <button
                key="wiz-next"
                type="button"
                onClick={handleNext}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2A7C13] px-5 py-2 text-xs font-semibold text-white hover:bg-[#15370D] dark:bg-[#76C457] dark:text-[#15370D]"
              >
                <span>Continuar</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                key="wiz-submit"
                type="submit"
                disabled={loading}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2A7C13] px-5 py-2 text-xs font-semibold text-white hover:bg-[#15370D] disabled:opacity-60 dark:bg-[#76C457] dark:text-[#15370D]"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{loading ? 'Salvando...' : 'Criar Grupo e Pacto'}</span>
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
};

import { normalizeGmailInput, type ParsedGmailMessage } from '../shared/gmailParser';
import { generateRecoveryKey } from '../shared/recovery';
import {
  calculateCollaborationIndex,
  calculateThermometerProgress,
  canStartSimulation,
  computeNextCycleState,
  runWhatIfSimulation,
} from '../shared/simulation';
import type {
  CollectiveGroup,
  CycleMemberStatus,
  EducationalPill,
  GroupMember,
  Profile,
  UserRole,
  WhatIfInput,
  WhatIfResult,
  WorkshopRoom,
} from '../shared/types';

export interface LocalStoredUser extends Profile {
  password_hash: string;
}

export interface LocalPasswordReset {
  id: string;
  user_id: string;
  email: string;
  code_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export type MailFolder = 'inbox' | 'starred' | 'sent' | 'trash' | 'all';

export interface LocalEmailMessage extends ParsedGmailMessage {
  recipientEmail: string;
}

export interface LocalDatabaseState {
  version: number;
  users: LocalStoredUser[];
  groups: CollectiveGroup[];
  workshops: WorkshopRoom[];
  pills: EducationalPill[];
  passwordResets: LocalPasswordReset[];
  emails: LocalEmailMessage[];
  savedMailAccounts: Array<{ email: string; name: string }>;
  googleMailboxConnectedByUser: Record<string, { email: string; name: string; connectedAt: string }>;
}

export interface EnrichedGroup extends CollectiveGroup {
  thermometer: ReturnType<typeof calculateThermometerProgress>;
  collaboration: ReturnType<typeof calculateCollaborationIndex>;
  can_start: boolean;
}

export interface WorkshopWithGroups extends WorkshopRoom {
  groups: CollectiveGroup[];
}

export interface AdminOverviewResponse {
  metrics: {
    totalUsers: number;
    activeUsers: number;
    totalGroups: number;
    activeGroups: number;
    completedGroups: number;
    avgCompletionRate: number;
    totalWorkshops: number;
    activePills: number;
  };
  institutionEngagement: Array<{ institution: string; users: number; groups: number }>;
  users: Profile[];
  groups: CollectiveGroup[];
  pills: EducationalPill[];
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DB_STORAGE_KEY = 'poupajunto_local_db_v1';
export const TOKEN_STORAGE_KEY = 'poupajunto_auth_token';
export const UI_STATE_STORAGE_KEY = 'poupajunto_ui_state_v1';

function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

const fallbackMemoryStorage = createMemoryStorage();

function getDefaultStorage(): KeyValueStorage {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // fallback em memória quando localStorage não estiver disponível
  }
  return fallbackMemoryStorage;
}

function hashLocalSecret(secret: string): string {
  // Hash determinístico leve (FNV-1a duplo 64-bit em hexadecimal) para validação offline sem dependências externas
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const input = `poupajunto::${secret}`;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `pj_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

function verifyLocalSecret(secret: string, storedHash: string): boolean {
  if (!storedHash) return false;
  return hashLocalSecret(secret) === storedHash;
}

function formatShortPtBrDate(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return 'Agora';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function createInitialSeedState(): LocalDatabaseState {
  const superadminHash = hashLocalSecret('TechMinds@2026');
  const educatorHash = hashLocalSecret('Senai@2026');
  const studentHash = hashLocalSecret('Aluno@2026');

  const users: LocalStoredUser[] = [
    {
      id: 'usr_superadmin',
      email: 'superadmin@poupajunto.senai.br',
      password_hash: superadminHash,
      full_name: 'Coordenação Tech Minds',
      display_name: 'Superadmin Tech Minds',
      nickname: 'Coordenação',
      avatar_url: '',
      role: 'superadmin',
      institution: 'SENAI Jaú-SP · INTEGRA 2026',
      bio: 'Conta de governança da plataforma educativa PoupaJunto.',
      theme_preference: 'light',
      active: true,
      created_at: '2026-10-01T08:00:00.000Z',
    },
    {
      id: 'usr_educador_1',
      email: 'prof.marcos@senai.br',
      password_hash: educatorHash,
      full_name: 'Marcos Oliveira',
      display_name: 'Prof. Marcos Oliveira',
      nickname: 'Prof. Marcos',
      avatar_url: '',
      role: 'educador',
      institution: 'SENAI Jaú-SP · Curso Técnico DS',
      bio: 'Docente orientador de projetos integradores e cidadania financeira.',
      theme_preference: 'light',
      active: true,
      created_at: '2026-10-05T09:00:00.000Z',
    },
    {
      id: 'usr_estudante_1',
      email: 'ana.clara@aluno.senai.br',
      password_hash: studentHash,
      full_name: 'Ana Clara Ferreira',
      display_name: 'Ana Clara Ferreira',
      nickname: 'Ana',
      avatar_url: '',
      role: 'estudante',
      institution: 'SENAI Jaú-SP · 3º DS',
      bio: 'Estudante do Ensino Médio Técnico organizando a formatura da turma.',
      theme_preference: 'light',
      active: true,
      created_at: '2026-10-10T10:00:00.000Z',
    },
    {
      id: 'usr_estudante_2',
      email: 'lucas.mendes@aluno.senai.br',
      password_hash: studentHash,
      full_name: 'Lucas Mendes Rocha',
      display_name: 'Lucas Mendes',
      nickname: 'Lucão',
      avatar_url: '',
      role: 'estudante',
      institution: 'SENAI Jaú-SP · 3º DS',
      bio: 'Integrante da equipe Tech Minds no projeto de prototipagem.',
      theme_preference: 'light',
      active: true,
      created_at: '2026-10-10T10:15:00.000Z',
    },
    {
      id: 'usr_estudante_3',
      email: 'beatriz.costa@aluno.senai.br',
      password_hash: studentHash,
      full_name: 'Beatriz Costa Lima',
      display_name: 'Beatriz Costa',
      nickname: 'Bia',
      avatar_url: '',
      role: 'estudante',
      institution: 'SENAI Jaú-SP · 3º DS',
      bio: 'Responsável por facilitar os pactos de transparência na turma.',
      theme_preference: 'light',
      active: true,
      created_at: '2026-10-11T11:00:00.000Z',
    },
    {
      id: 'usr_estudante_4',
      email: 'pedro.henrique@aluno.senai.br',
      password_hash: studentHash,
      full_name: 'Pedro Henrique Alves',
      display_name: 'Pedro Henrique',
      nickname: 'PH',
      avatar_url: '',
      role: 'estudante',
      institution: 'SENAI Jaú-SP · 2º Eletromecânica',
      bio: 'Participante das oficinas de educação financeira coletiva.',
      theme_preference: 'dark',
      active: true,
      created_at: '2026-10-12T14:00:00.000Z',
    },
  ];

  const workshops: WorkshopRoom[] = [
    {
      id: 'wsp_1',
      pin: '482910',
      title: 'Oficina Cidadania Financeira · 3º DS SENAI Jaú',
      educator_id: 'usr_educador_1',
      educator_name: 'Prof. Marcos Oliveira',
      institution: 'SENAI Jaú-SP',
      duration_minutes: 15,
      active: true,
      created_at: '2026-11-10T13:30:00.000Z',
    },
  ];

  const groups: CollectiveGroup[] = [
    {
      id: 'grp_formatura',
      name: 'Formatura 3º DS — Turma 2026',
      goal_description: 'Simulação de organização coletiva para colação e confraternização da turma técnica.',
      category: 'Formatura',
      target_amount: 2400,
      total_cycles: 4,
      cycle_frequency: 'mensal',
      current_cycle: 2,
      status: 'active',
      room_pin: '482910',
      created_by: 'usr_estudante_1',
      created_at: '2026-11-01T10:00:00.000Z',
      rules: {
        id: 'rule_formatura',
        group_id: 'grp_formatura',
        delay_policy: 'Acionar Fundo Reserva Coletivo por até 1 ciclo mediante aviso prévio no grupo.',
        dropout_policy: 'Redistribuir a meta restante entre os membros ativos ou ajustar o escopo do evento.',
        surplus_policy: 'Dividir sobras proporcionalmente entre os participantes ao fim do Ciclo 4.',
        reserve_percentage: 15,
        created_at: '2026-11-01T10:00:00.000Z',
      },
      members: [
        {
          id: 'gm_f1',
          group_id: 'grp_formatura',
          user_id: 'usr_estudante_1',
          display_name: 'Ana Clara Ferreira',
          nickname: 'Ana',
          avatar_url: '',
          institution: 'SENAI Jaú-SP · 3º DS',
          pact_accepted: true,
          pact_accepted_at: '2026-11-01T10:05:00.000Z',
          joined_at: '2026-11-01T10:00:00.000Z',
        },
        {
          id: 'gm_f2',
          group_id: 'grp_formatura',
          user_id: 'usr_estudante_2',
          display_name: 'Lucas Mendes',
          nickname: 'Lucão',
          avatar_url: '',
          institution: 'SENAI Jaú-SP · 3º DS',
          pact_accepted: true,
          pact_accepted_at: '2026-11-01T10:12:00.000Z',
          joined_at: '2026-11-01T10:02:00.000Z',
        },
        {
          id: 'gm_f3',
          group_id: 'grp_formatura',
          user_id: 'usr_estudante_3',
          display_name: 'Beatriz Costa',
          nickname: 'Bia',
          avatar_url: '',
          institution: 'SENAI Jaú-SP · 3º DS',
          pact_accepted: true,
          pact_accepted_at: '2026-11-01T10:18:00.000Z',
          joined_at: '2026-11-01T10:04:00.000Z',
        },
        {
          id: 'gm_f4',
          group_id: 'grp_formatura',
          user_id: 'usr_estudante_4',
          display_name: 'Pedro Henrique',
          nickname: 'PH',
          avatar_url: '',
          institution: 'SENAI Jaú-SP · 2º Eletromecânica',
          pact_accepted: true,
          pact_accepted_at: '2026-11-01T10:25:00.000Z',
          joined_at: '2026-11-01T10:06:00.000Z',
        },
      ],
      cycles: [
        { id: 'c_f_1_1', group_id: 'grp_formatura', member_id: 'usr_estudante_1', cycle_number: 1, simulated_status: 'on_time', simulated_value: 150, reserve_delta: 22.5, recorded_at: '2026-11-02T12:00:00.000Z' },
        { id: 'c_f_1_2', group_id: 'grp_formatura', member_id: 'usr_estudante_2', cycle_number: 1, simulated_status: 'on_time', simulated_value: 150, reserve_delta: 22.5, recorded_at: '2026-11-02T12:00:00.000Z' },
        { id: 'c_f_1_3', group_id: 'grp_formatura', member_id: 'usr_estudante_3', cycle_number: 1, simulated_status: 'on_time', simulated_value: 150, reserve_delta: 22.5, recorded_at: '2026-11-02T12:00:00.000Z' },
        { id: 'c_f_1_4', group_id: 'grp_formatura', member_id: 'usr_estudante_4', cycle_number: 1, simulated_status: 'on_time', simulated_value: 150, reserve_delta: 22.5, recorded_at: '2026-11-02T12:00:00.000Z' },
        { id: 'c_f_2_1', group_id: 'grp_formatura', member_id: 'usr_estudante_1', cycle_number: 2, simulated_status: 'on_time', simulated_value: 150, reserve_delta: 22.5, recorded_at: '2026-11-09T12:00:00.000Z' },
        { id: 'c_f_2_2', group_id: 'grp_formatura', member_id: 'usr_estudante_2', cycle_number: 2, simulated_status: 'reserve_used', simulated_value: 150, reserve_delta: -75, recorded_at: '2026-11-09T12:00:00.000Z' },
        { id: 'c_f_2_3', group_id: 'grp_formatura', member_id: 'usr_estudante_3', cycle_number: 2, simulated_status: 'on_time', simulated_value: 150, reserve_delta: 22.5, recorded_at: '2026-11-09T12:00:00.000Z' },
        { id: 'c_f_2_4', group_id: 'grp_formatura', member_id: 'usr_estudante_4', cycle_number: 2, simulated_status: 'on_time', simulated_value: 150, reserve_delta: 22.5, recorded_at: '2026-11-09T12:00:00.000Z' },
      ],
    },
    {
      id: 'grp_viagem',
      name: 'Viagem Técnica — Feira Tecnológica SP',
      goal_description: 'Planejamento educativo simulado de transporte e alimentação para visita técnica.',
      category: 'Viagem Técnica',
      target_amount: 1600,
      total_cycles: 4,
      cycle_frequency: 'semanal',
      current_cycle: 0,
      status: 'pact_pending',
      room_pin: '482910',
      created_by: 'usr_estudante_2',
      created_at: '2026-11-12T09:00:00.000Z',
      rules: {
        id: 'rule_viagem',
        group_id: 'grp_viagem',
        delay_policy: 'Comunicar até 48h antes do fechamento do ciclo e compensar na semana seguinte.',
        dropout_policy: 'Vaga pode ser repassada a colega da lista de espera da turma.',
        surplus_policy: 'Reverter sobras para caixa de emergência da oficina de robótica.',
        reserve_percentage: 10,
        created_at: '2026-11-12T09:00:00.000Z',
      },
      members: [
        {
          id: 'gm_v1',
          group_id: 'grp_viagem',
          user_id: 'usr_estudante_2',
          display_name: 'Lucas Mendes',
          nickname: 'Lucão',
          avatar_url: '',
          institution: 'SENAI Jaú-SP · 3º DS',
          pact_accepted: true,
          pact_accepted_at: '2026-11-12T09:10:00.000Z',
          joined_at: '2026-11-12T09:00:00.000Z',
        },
        {
          id: 'gm_v2',
          group_id: 'grp_viagem',
          user_id: 'usr_estudante_1',
          display_name: 'Ana Clara Ferreira',
          nickname: 'Ana',
          avatar_url: '',
          institution: 'SENAI Jaú-SP · 3º DS',
          pact_accepted: false,
          pact_accepted_at: null,
          joined_at: '2026-11-12T09:05:00.000Z',
        },
        {
          id: 'gm_v3',
          group_id: 'grp_viagem',
          user_id: 'usr_estudante_3',
          display_name: 'Beatriz Costa',
          nickname: 'Bia',
          avatar_url: '',
          institution: 'SENAI Jaú-SP · 3º DS',
          pact_accepted: true,
          pact_accepted_at: '2026-11-12T09:20:00.000Z',
          joined_at: '2026-11-12T09:08:00.000Z',
        },
      ],
      cycles: [],
    },
    {
      id: 'grp_robotica',
      name: 'Kit Prototipagem Arduino & Sensores',
      goal_description: 'Meta simulada concluída para compra compartilhada de bancada de testes.',
      category: 'Equipamentos',
      target_amount: 900,
      total_cycles: 3,
      cycle_frequency: 'quinzenal',
      current_cycle: 3,
      status: 'completed',
      room_pin: null,
      created_by: 'usr_estudante_1',
      created_at: '2026-10-15T14:00:00.000Z',
      rules: {
        id: 'rule_robotica',
        group_id: 'grp_robotica',
        delay_policy: 'Estender prazo em até 3 dias úteis sem penalidades.',
        dropout_policy: 'Integrante que sair cede o direito de uso compartilhado na oficina.',
        surplus_policy: 'Comprar componentes extras de reposição para a bancada.',
        reserve_percentage: 10,
        created_at: '2026-10-15T14:00:00.000Z',
      },
      members: [
        {
          id: 'gm_r1',
          group_id: 'grp_robotica',
          user_id: 'usr_estudante_1',
          display_name: 'Ana Clara Ferreira',
          nickname: 'Ana',
          avatar_url: '',
          institution: 'SENAI Jaú-SP · 3º DS',
          pact_accepted: true,
          pact_accepted_at: '2026-10-15T14:05:00.000Z',
          joined_at: '2026-10-15T14:00:00.000Z',
        },
        {
          id: 'gm_r2',
          group_id: 'grp_robotica',
          user_id: 'usr_estudante_2',
          display_name: 'Lucas Mendes',
          nickname: 'Lucão',
          avatar_url: '',
          institution: 'SENAI Jaú-SP · 3º DS',
          pact_accepted: true,
          pact_accepted_at: '2026-10-15T14:06:00.000Z',
          joined_at: '2026-10-15T14:02:00.000Z',
        },
        {
          id: 'gm_r3',
          group_id: 'grp_robotica',
          user_id: 'usr_estudante_3',
          display_name: 'Beatriz Costa',
          nickname: 'Bia',
          avatar_url: '',
          institution: 'SENAI Jaú-SP · 3º DS',
          pact_accepted: true,
          pact_accepted_at: '2026-10-15T14:07:00.000Z',
          joined_at: '2026-10-15T14:04:00.000Z',
        },
      ],
      cycles: [
        { id: 'c_r_1_1', group_id: 'grp_robotica', member_id: 'usr_estudante_1', cycle_number: 1, simulated_status: 'on_time', simulated_value: 100, reserve_delta: 10, recorded_at: '2026-10-16T10:00:00.000Z' },
        { id: 'c_r_1_2', group_id: 'grp_robotica', member_id: 'usr_estudante_2', cycle_number: 1, simulated_status: 'on_time', simulated_value: 100, reserve_delta: 10, recorded_at: '2026-10-16T10:00:00.000Z' },
        { id: 'c_r_1_3', group_id: 'grp_robotica', member_id: 'usr_estudante_3', cycle_number: 1, simulated_status: 'on_time', simulated_value: 100, reserve_delta: 10, recorded_at: '2026-10-16T10:00:00.000Z' },
        { id: 'c_r_2_1', group_id: 'grp_robotica', member_id: 'usr_estudante_1', cycle_number: 2, simulated_status: 'on_time', simulated_value: 100, reserve_delta: 10, recorded_at: '2026-10-23T10:00:00.000Z' },
        { id: 'c_r_2_2', group_id: 'grp_robotica', member_id: 'usr_estudante_2', cycle_number: 2, simulated_status: 'on_time', simulated_value: 100, reserve_delta: 10, recorded_at: '2026-10-23T10:00:00.000Z' },
        { id: 'c_r_2_3', group_id: 'grp_robotica', member_id: 'usr_estudante_3', cycle_number: 2, simulated_status: 'on_time', simulated_value: 100, reserve_delta: 10, recorded_at: '2026-10-23T10:00:00.000Z' },
        { id: 'c_r_3_1', group_id: 'grp_robotica', member_id: 'usr_estudante_1', cycle_number: 3, simulated_status: 'on_time', simulated_value: 100, reserve_delta: 10, recorded_at: '2026-10-30T10:00:00.000Z' },
        { id: 'c_r_3_2', group_id: 'grp_robotica', member_id: 'usr_estudante_2', cycle_number: 3, simulated_status: 'on_time', simulated_value: 100, reserve_delta: 10, recorded_at: '2026-10-30T10:00:00.000Z' },
        { id: 'c_r_3_3', group_id: 'grp_robotica', member_id: 'usr_estudante_3', cycle_number: 3, simulated_status: 'on_time', simulated_value: 100, reserve_delta: 10, recorded_at: '2026-10-30T10:00:00.000Z' },
      ],
    },
  ];

  const pills: EducationalPill[] = [
    {
      id: 'pill_1',
      title: 'Combinado prévio evita conflitos no grupo',
      content:
        'A maior causa de desistência em metas de turma não é a falta de interesse, mas a ausência de regras claras para atrasos e imprevistos. Pactuar por escrito antes do Ciclo 1 protege o projeto e as amizades.',
      category: 'Planejamento e Pactos',
      ods_tag: 'ODS 4 · Educação de Qualidade',
      cycle_trigger: 1,
      active: true,
    },
    {
      id: 'pill_2',
      title: 'Fundo Reserva Coletivo como amortecedor',
      content:
        'Separar entre 10% e 15% em uma reserva simulada permite absorver o imprevisto pontual de um integrante no Ciclo 2 sem atrasar fornecedores ou comprometer o cronograma da equipe.',
      category: 'Reserva para Imprevistos',
      ods_tag: 'ODS 8 · Trabalho Decente e Crescimento',
      cycle_trigger: 2,
      active: true,
    },
    {
      id: 'pill_3',
      title: 'Transparência substitui cobranças em aplicativos de mensagem',
      content:
        'Seguindo diretrizes de Cidadania Financeira do Banco Central, visualizar o progresso coletivo com clareza e comunicar dificuldades com antecedência fortalece a responsabilidade compartilhada.',
      category: 'Comunicação em Grupo',
      ods_tag: 'ODS 4 · Educação de Qualidade',
      cycle_trigger: 3,
      active: true,
    },
    {
      id: 'pill_4',
      title: 'O que fazer com sobras ao concluir a meta?',
      content:
        'Definir no Pacto Inicial se eventuais sobras serão divididas igualmente ou investidas no próximo projeto da turma evita discussões de última hora após o encerramento dos ciclos.',
      category: 'Cidadania Financeira',
      ods_tag: 'ODS 8 · Trabalho Decente e Crescimento',
      cycle_trigger: 4,
      active: true,
    },
    {
      id: 'pill_5',
      title: 'Simulação educativa ≠ compromisso bancário real',
      content:
        'Experimentar cenários de estresse no ambiente simulado desenvolve maturidade organizacional em jovens de 16 a 24 anos antes de lidarem com contratos ou compras coletivas reais.',
      category: 'Educação Financeira',
      ods_tag: 'ODS 4 · Educação de Qualidade',
      cycle_trigger: 1,
      active: true,
    },
  ];

  const emails: LocalEmailMessage[] = [
    {
      id: 'msg_seed_1',
      threadId: 'thr_seed_1',
      recipientEmail: '*',
      subject: 'Bem-vindo ao PoupaJunto · Oficina INTEGRA SENAI 2026',
      from: 'Prof. Marcos Oliveira <prof.marcos@senai.br>',
      fromName: 'Prof. Marcos Oliveira',
      fromEmail: 'prof.marcos@senai.br',
      date: '2026-11-12T09:00:00.000Z',
      dateFormatted: '12 de nov.',
      snippet: 'Sua turma já pode simular metas coletivas, testar cenários E Se? e registrar pactos de transparência.',
      unread: true,
      labelIds: ['INBOX', 'UNREAD'],
      bodyText: [
        'Olá, estudante!',
        '',
        'Seja bem-vindo(a) ao PoupaJunto — plataforma educativa desenvolvida pela equipe Tech Minds (SENAI Jaú-SP) para o INTEGRA SENAI 2026.',
        '',
        'O que você pode fazer agora:',
        '1. Revisar e aceitar o Pacto de Regras do grupo "Viagem Técnica — Feira Tecnológica SP".',
        '2. Simular os próximos ciclos da "Formatura 3º DS — Turma 2026".',
        '3. Experimentar cenários de imprevistos e reserva coletiva no Simulador "E Se?".',
        '4. Acessar a sala de oficina usando o PIN 482910.',
        '',
        'Todos os seus dados são salvos automaticamente neste dispositivo em modo local permanente.',
        '',
        '— Coordenação Tech Minds · SENAI Jaú-SP',
      ].join('\n'),
    },
    {
      id: 'msg_seed_2',
      threadId: 'thr_seed_2',
      recipientEmail: '*',
      subject: 'Lembrete de Pacto: Viagem Técnica — Feira Tecnológica SP',
      from: 'PoupaJunto Notificações <avisos@poupajunto.senai.br>',
      fromName: 'PoupaJunto Notificações',
      fromEmail: 'avisos@poupajunto.senai.br',
      date: '2026-11-12T09:15:00.000Z',
      dateFormatted: '12 de nov.',
      snippet: 'Ainda falta o aceite formal do Pacto de Regras antes de liberar o Ciclo 1 desta simulação.',
      unread: true,
      labelIds: ['INBOX', 'UNREAD'],
      bodyText: [
        'Olá!',
        '',
        'O grupo "Viagem Técnica — Feira Tecnológica SP" aguarda o aceite formal de todos os membros no Pacto de Regras.',
        '',
        'Regras propostas:',
        '- Atraso: Comunicar até 48h antes do fechamento do ciclo e compensar na semana seguinte.',
        '- Saída: Vaga pode ser repassada a colega da lista de espera da turma.',
        '- Fundo Reserva Coletivo: 10%.',
        '',
        'Acesse "Pactos de Regras" ou "Meus Grupos" para revisar e confirmar.',
      ].join('\n'),
    },
    {
      id: 'msg_seed_3',
      threadId: 'thr_seed_3',
      recipientEmail: '*',
      subject: 'Oficina em Sala Ativa · PIN 482910',
      from: 'Coordenação Tech Minds <superadmin@poupajunto.senai.br>',
      fromName: 'Coordenação Tech Minds',
      fromEmail: 'superadmin@poupajunto.senai.br',
      date: '2026-11-10T13:30:00.000Z',
      dateFormatted: '10 de nov.',
      snippet: 'Entre na oficina "Oficina Cidadania Financeira · 3º DS SENAI Jaú" usando o código PIN 482910.',
      unread: false,
      labelIds: ['INBOX'],
      bodyText: [
        'Sala de Oficina em Sala de Aula aberta!',
        '',
        'Título: Oficina Cidadania Financeira · 3º DS SENAI Jaú',
        'Educador: Prof. Marcos Oliveira',
        'Código PIN: 482910',
        'Duração recomendada: 15 minutos',
        '',
        'Use a aba "Modo Oficina (PIN)" para inspecionar os grupos participantes.',
      ].join('\n'),
    },
    {
      id: 'msg_seed_jvgg',
      threadId: 'thr_seed_jvgg',
      recipientEmail: 'jvggjvgg23@gmail.com',
      toEmail: 'jvggjvgg23@gmail.com',
      subject: 'Caixa Gmail Conectada · jvggjvgg23@gmail.com',
      from: 'PoupaJunto <contato@poupajunto.senai.br>',
      fromName: 'PoupaJunto',
      fromEmail: 'contato@poupajunto.senai.br',
      date: '2026-11-18T08:00:00.000Z',
      dateFormatted: 'Hoje',
      snippet: 'Sua caixa de entrada local para jvggjvgg23@gmail.com está ativa. Você pode ler, responder, escrever e alternar entre qualquer e-mail.',
      unread: true,
      starred: true,
      folder: 'inbox',
      labelIds: ['INBOX', 'UNREAD'],
      bodyText: [
        'Olá!',
        '',
        'Sua conta jvggjvgg23@gmail.com já está conectada ao PoupaJunto em modo local permanente.',
        '',
        'Aqui você pode:',
        '• Clicar em qualquer @gmail.com salvo ou digitar um novo e-mail para abrir a caixa de mensagens.',
        '• Escrever, responder e encaminhar mensagens para qualquer destinatário.',
        '• Receber automaticamente suas chaves de recuperação de senha e avisos dos grupos.',
        '',
        '— Equipe PoupaJunto · SENAI Jaú-SP',
      ].join('\n'),
    },
  ];

  return {
    version: 1,
    users,
    groups,
    workshops,
    pills,
    passwordResets: [],
    emails,
    savedMailAccounts: [
      { email: 'jvggjvgg23@gmail.com', name: 'Jvgg' },
      { email: 'ana.clara@aluno.senai.br', name: 'Ana Clara Ferreira' },
    ],
    googleMailboxConnectedByUser: {
      usr_estudante_1: {
        email: 'ana.clara@aluno.senai.br',
        name: 'Ana Clara Ferreira',
        connectedAt: '2026-11-12T09:00:00.000Z',
      },
    },
  };
}

export class LocalDatabaseService {
  private storage: KeyValueStorage;
  private state: LocalDatabaseState;

  constructor(storage?: KeyValueStorage) {
    this.storage = storage ?? getDefaultStorage();
    this.state = this.loadState();
  }

  private loadState(): LocalDatabaseState {
    const raw = this.storage.getItem(DB_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<LocalDatabaseState>;
        const seed = createInitialSeedState();
        const loaded: LocalDatabaseState = {
          version: 1,
          users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : seed.users,
          groups: Array.isArray(parsed.groups) ? parsed.groups : seed.groups,
          workshops: Array.isArray(parsed.workshops) ? parsed.workshops : seed.workshops,
          pills: Array.isArray(parsed.pills) && parsed.pills.length > 0 ? parsed.pills : seed.pills,
          passwordResets: Array.isArray(parsed.passwordResets) ? parsed.passwordResets : [],
          emails: Array.isArray(parsed.emails) && parsed.emails.length > 0 ? parsed.emails : seed.emails,
          savedMailAccounts:
            Array.isArray(parsed.savedMailAccounts) && parsed.savedMailAccounts.length > 0
              ? parsed.savedMailAccounts
              : seed.savedMailAccounts,
          googleMailboxConnectedByUser:
            parsed.googleMailboxConnectedByUser && typeof parsed.googleMailboxConnectedByUser === 'object'
              ? parsed.googleMailboxConnectedByUser
              : seed.googleMailboxConnectedByUser,
        };
        return loaded;
      } catch {
        // se corrompido, reinicia com seed
      }
    }
    const initial = createInitialSeedState();
    this.saveState(initial);
    return initial;
  }

  private saveState(nextState: LocalDatabaseState = this.state): void {
    this.state = nextState;
    try {
      this.storage.setItem(DB_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Se exceder cota com muitos e-mails antigos, compacta histórico não essencial
      if (this.state.emails.length > 40) {
        this.state.emails = this.state.emails.slice(0, 30);
        try {
          this.storage.setItem(DB_STORAGE_KEY, JSON.stringify(this.state));
        } catch {
          // ignore
        }
      }
    }
  }

  private sanitizeProfile(user: LocalStoredUser): Profile {
    const { password_hash: _pw, ...profile } = user;
    return { ...profile };
  }

  private enrichGroup(group: CollectiveGroup): EnrichedGroup {
    return {
      ...group,
      thermometer: calculateThermometerProgress(group),
      collaboration: calculateCollaborationIndex(group),
      can_start: canStartSimulation(group.members),
    };
  }

  private getCurrentUserIdFromToken(): string | null {
    const token = this.storage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return null;
    if (token.startsWith('pj_local_')) {
      return token.slice('pj_local_'.length);
    }
    return null;
  }

  private requireCurrentUser(): LocalStoredUser {
    const userId = this.getCurrentUserIdFromToken();
    if (!userId) {
      throw new Error('Sessão não autenticada. Faça login para continuar.');
    }
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error('Usuário não encontrado na base local.');
    }
    if (!user.active) {
      throw new Error('Esta conta foi desativada pela moderação.');
    }
    return user;
  }

  private pushInboxEmail(params: {
    recipientEmail: string;
    subject: string;
    fromName: string;
    fromEmail: string;
    snippet: string;
    bodyText: string;
  }): LocalEmailMessage {
    const nowIso = new Date().toISOString();
    const msg: LocalEmailMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      threadId: `thr_${Date.now()}`,
      recipientEmail: params.recipientEmail.toLowerCase(),
      subject: params.subject,
      from: `${params.fromName} <${params.fromEmail}>`,
      fromName: params.fromName,
      fromEmail: params.fromEmail,
      date: nowIso,
      dateFormatted: formatShortPtBrDate(nowIso),
      snippet: params.snippet,
      unread: true,
      labelIds: ['INBOX', 'UNREAD'],
      bodyText: params.bodyText,
    };
    this.state.emails.unshift(msg);
    this.saveState();
    return msg;
  }

  public getStoredToken(): string | null {
    return this.storage.getItem(TOKEN_STORAGE_KEY);
  }

  public setStoredToken(token: string | null): void {
    if (token) {
      this.storage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      this.storage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  public getUiState<T>(fallback: T): T {
    try {
      const raw = this.storage.getItem(UI_STATE_STORAGE_KEY);
      if (!raw) return fallback;
      return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
      return fallback;
    }
  }

  public setUiState(partial: Record<string, unknown>): void {
    try {
      const current = this.getUiState<Record<string, unknown>>({});
      this.storage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
    } catch {
      // ignore
    }
  }

  // --- AUTH ---
  public register(payload: {
    email: string;
    password: string;
    display_name: string;
    full_name?: string;
    institution?: string;
  }): { token: string; user: Profile } {
    const email = payload.email?.trim().toLowerCase() ?? '';
    if (!email || !email.includes('@')) {
      throw new Error('Informe um e-mail válido para cadastro.');
    }
    if (!payload.password || payload.password.length < 6) {
      throw new Error('A senha deve possuir no mínimo 6 caracteres.');
    }
    if (!payload.display_name || payload.display_name.trim().length < 2) {
      throw new Error('Informe um nome de exibição válido (LGPD: sem CPF ou dados bancários).');
    }
    if (this.state.users.some((u) => u.email.toLowerCase() === email)) {
      throw new Error('Já existe uma conta cadastrada com este e-mail.');
    }

    const now = new Date().toISOString();
    const cleanName = payload.display_name.trim();
    const newUser: LocalStoredUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email,
      password_hash: hashLocalSecret(payload.password),
      full_name: (payload.full_name || cleanName).trim(),
      display_name: cleanName,
      nickname: cleanName.split(' ')[0],
      avatar_url: '',
      role: 'estudante',
      institution: typeof payload.institution === 'string' ? payload.institution.trim() : '',
      bio: '',
      theme_preference: 'light',
      active: true,
      created_at: now,
    };

    this.state.users.push(newUser);
    this.state.googleMailboxConnectedByUser[newUser.id] = {
      email,
      name: cleanName,
      connectedAt: now,
    };
    this.saveState();

    this.pushInboxEmail({
      recipientEmail: email,
      subject: 'Conta criada com sucesso no PoupaJunto!',
      fromName: 'Equipe PoupaJunto',
      fromEmail: 'boasvindas@poupajunto.senai.br',
      snippet: `Olá, ${cleanName}! Seus grupos, pactos e simulações serão salvos automaticamente neste dispositivo.`,
      bodyText: [
        `Olá, ${cleanName}!`,
        '',
        'Sua conta educativa foi criada com sucesso e já está salva no armazenamento local permanente.',
        'Explore seus grupos, revise os pactos de transparência ou simule cenários no Simulador "E Se?".',
        '',
        '— Tech Minds · SENAI Jaú-SP · INTEGRA SENAI 2026',
      ].join('\n'),
    });

    const token = `pj_local_${newUser.id}`;
    this.setStoredToken(token);
    return { token, user: this.sanitizeProfile(newUser) };
  }

  public login(payload: { email: string; password: string }): { token: string; user: Profile } {
    const email = payload.email?.trim().toLowerCase() ?? '';
    const password = payload.password ?? '';
    if (!email || !password) {
      throw new Error('Preencha e-mail e senha para entrar.');
    }

    const user = this.state.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !user.password_hash || !verifyLocalSecret(password, user.password_hash)) {
      throw new Error('E-mail ou senha incorretos.');
    }
    if (!user.active) {
      throw new Error('Esta conta foi desativada pela moderação.');
    }

    const token = `pj_local_${user.id}`;
    this.setStoredToken(token);
    return { token, user: this.sanitizeProfile(user) };
  }

  public loginWithGoogleLocal(payload: { email: string; name?: string }): { token: string; user: Profile } {
    const email = normalizeGmailInput(payload.email ?? '');
    if (!email || !email.includes('@') || !email.includes('.')) {
      throw new Error('Informe um e-mail válido (ex.: nome@gmail.com).');
    }

    let user = this.state.users.find((u) => u.email.toLowerCase() === email);
    const now = new Date().toISOString();

    if (user) {
      if (!user.active) {
        throw new Error('Esta conta foi desativada pela moderação.');
      }
    } else {
      const cleanName = payload.name?.trim() || email.split('@')[0];
      user = {
        id: `usr_google_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        email,
        password_hash: '',
        full_name: cleanName,
        display_name: cleanName,
        nickname: cleanName.split(' ')[0] || 'Estudante',
        avatar_url: '',
        role: 'estudante',
        institution: 'SENAI Jaú-SP',
        bio: '',
        theme_preference: 'light',
        active: true,
        created_at: now,
      };
      this.state.users.push(user);
      this.pushInboxEmail({
        recipientEmail: email,
        subject: `Bem-vindo(a), ${email} · Caixa Gmail Local`,
        fromName: 'Equipe PoupaJunto',
        fromEmail: 'boasvindas@poupajunto.senai.br',
        snippet: `Conta ${email} conectada em modo local permanente sem API keys externas.`,
        bodyText: [
          `Olá, ${cleanName}!`,
          '',
          `Seu acesso via conta ${email} foi configurado localmente no PoupaJunto sem necessidade de chave de API ou verificação externa.`,
          'Você já pode visualizar, escrever, responder e gerenciar seus e-mails normalmente na aba E-mails (Gmail).',
        ].join('\n'),
      });
    }

    this.ensureSavedMailAccount(user.email, user.display_name);
    this.state.googleMailboxConnectedByUser[user.id] = {
      email: user.email,
      name: user.display_name,
      connectedAt: now,
    };
    this.saveState();

    const token = `pj_local_${user.id}`;
    this.setStoredToken(token);
    return { token, user: this.sanitizeProfile(user) };
  }

  public recoverPassword(email: string): {
    sentTo: string;
    expiresMinutes: number;
    recoveryKey: string;
    message: string;
  } {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Informe um e-mail válido cadastrado para gerar a chave de recuperação.');
    }

    let user = this.state.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      throw new Error(
        `Nenhuma conta encontrada para ${normalizedEmail}. Crie uma conta ou use um dos e-mails cadastrados.`
      );
    }
    if (!user.active) {
      throw new Error('Esta conta foi desativada pela moderação.');
    }

    const recoveryKey = generateRecoveryKey(8);
    const expiresMinutes = 15;
    const now = Date.now();
    const expiresAt = new Date(now + expiresMinutes * 60 * 1000).toISOString();

    for (const prev of this.state.passwordResets) {
      if (prev.user_id === user.id && !prev.used_at) {
        prev.used_at = new Date(now).toISOString();
      }
    }

    this.state.passwordResets.push({
      id: `rst_${now}_${Math.random().toString(36).slice(2, 6)}`,
      user_id: user.id,
      email: normalizedEmail,
      code_hash: hashLocalSecret(recoveryKey),
      expires_at: expiresAt,
      used_at: null,
      created_at: new Date(now).toISOString(),
    });
    this.saveState();

    this.pushInboxEmail({
      recipientEmail: normalizedEmail,
      subject: 'PoupaJunto — Sua chave de recuperação de senha',
      fromName: 'Segurança PoupaJunto',
      fromEmail: 'recuperacao@poupajunto.senai.br',
      snippet: `Sua chave de recuperação é ${recoveryKey} (válida por ${expiresMinutes} minutos).`,
      bodyText: [
        `Olá, ${user.display_name}!`,
        '',
        'Você solicitou a recuperação de senha da sua conta educativa no PoupaJunto.',
        '',
        `Sua chave de recuperação é: ${recoveryKey}`,
        '',
        `Digite esta chave na tela "Recuperar Senha" junto com sua nova senha.`,
        `Por segurança, esta chave expira em ${expiresMinutes} minutos e só pode ser usada uma vez.`,
        '',
        '— Equipe PoupaJunto (Modo Local Permanente)',
      ].join('\n'),
    });

    return {
      sentTo: normalizedEmail,
      expiresMinutes,
      recoveryKey,
      message: `Chave de recuperação gerada para ${normalizedEmail} e salva na Caixa de Entrada local do app.`,
    };
  }

  public resetPassword(payload: {
    email: string;
    recoveryKey: string;
    newPassword: string;
  }): { token: string; user: Profile; message: string } {
    const normalizedEmail = payload.email?.trim().toLowerCase() ?? '';
    const normalizedKey = payload.recoveryKey?.trim().toUpperCase() ?? '';
    const newPassword = payload.newPassword ?? '';

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Informe um e-mail válido.');
    }
    if (!normalizedKey || normalizedKey.length < 6) {
      throw new Error('Informe a chave de recuperação.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('A nova senha deve possuir no mínimo 6 caracteres.');
    }

    const user = this.state.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      throw new Error('Conta não encontrada para este e-mail.');
    }
    if (!user.active) {
      throw new Error('Esta conta foi desativada pela moderação.');
    }

    const nowMs = Date.now();
    const validRecord = [...this.state.passwordResets]
      .reverse()
      .find(
        (r) =>
          r.user_id === user.id &&
          !r.used_at &&
          Date.parse(r.expires_at) > nowMs &&
          verifyLocalSecret(normalizedKey, r.code_hash)
      );

    if (!validRecord) {
      throw new Error('Chave de recuperação inválida ou expirada. Solicite uma nova chave.');
    }

    validRecord.used_at = new Date(nowMs).toISOString();
    user.password_hash = hashLocalSecret(newPassword);
    this.saveState();

    const token = `pj_local_${user.id}`;
    this.setStoredToken(token);
    return {
      token,
      user: this.sanitizeProfile(user),
      message: 'Senha redefinida com sucesso!',
    };
  }

  public me(): { user: Profile } {
    const user = this.requireCurrentUser();
    return { user: this.sanitizeProfile(user) };
  }

  // --- PROFILE ---
  public updateProfile(
    payload: Partial<Pick<Profile, 'display_name' | 'full_name' | 'nickname' | 'institution' | 'bio' | 'theme_preference'>>
  ): { profile: Profile } {
    const user = this.requireCurrentUser();

    if (typeof payload.display_name === 'string' && payload.display_name.trim().length >= 2) {
      user.display_name = payload.display_name.trim();
    }
    if (typeof payload.full_name === 'string' && payload.full_name.trim().length >= 2) {
      user.full_name = payload.full_name.trim();
    }
    if (typeof payload.nickname === 'string') {
      user.nickname = payload.nickname.trim().slice(0, 32);
    }
    if (typeof payload.institution === 'string') {
      user.institution = payload.institution.trim().slice(0, 80);
    }
    if (typeof payload.bio === 'string') {
      user.bio = payload.bio.trim().slice(0, 240);
    }
    if (payload.theme_preference === 'light' || payload.theme_preference === 'dark') {
      user.theme_preference = payload.theme_preference;
    }

    for (const group of this.state.groups) {
      for (const member of group.members) {
        if (member.user_id === user.id) {
          member.display_name = user.display_name;
          member.nickname = user.nickname;
          member.institution = user.institution;
        }
      }
    }

    this.saveState();
    return { profile: this.sanitizeProfile(user) };
  }

  public uploadAvatar(imageDataUrl: string): { avatar_url: string; profile: Profile } {
    const user = this.requireCurrentUser();
    if (!imageDataUrl || !/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl)) {
      throw new Error('Formato de imagem inválido. Utilize PNG, JPG ou WebP.');
    }

    user.avatar_url = imageDataUrl;
    for (const group of this.state.groups) {
      for (const member of group.members) {
        if (member.user_id === user.id) {
          member.avatar_url = imageDataUrl;
        }
      }
    }

    this.saveState();
    return { avatar_url: imageDataUrl, profile: this.sanitizeProfile(user) };
  }

  // --- GROUPS ---
  public listGroups(): { groups: EnrichedGroup[] } {
    const user = this.requireCurrentUser();
    const visible =
      user.role === 'superadmin' || user.role === 'educador'
        ? this.state.groups
        : this.state.groups.filter(
            (g) =>
              g.created_by === user.id ||
              g.members.some((m) => m.user_id === user.id) ||
              Boolean(g.room_pin)
          );

    return { groups: visible.map((g) => this.enrichGroup(g)) };
  }

  public createGroup(payload: {
    name: string;
    goal_description: string;
    category: string;
    target_amount: number;
    total_cycles: number;
    cycle_frequency: 'semanal' | 'quinzenal' | 'mensal';
    delay_policy: string;
    dropout_policy: string;
    surplus_policy: string;
    reserve_percentage: number;
    room_pin?: string;
    include_demo_peers?: boolean;
  }): { group: EnrichedGroup } {
    const user = this.requireCurrentUser();
    if (!payload.name || payload.name.trim().length < 3) {
      throw new Error('Informe um nome descritivo para o grupo (mín. 3 caracteres).');
    }
    const parsedAmount = Number(payload.target_amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Informe um valor fictício de meta maior que zero.');
    }
    const parsedCycles = Math.round(Number(payload.total_cycles));
    if (!Number.isFinite(parsedCycles) || parsedCycles < 2 || parsedCycles > 24) {
      throw new Error('A quantidade de ciclos deve estar entre 2 e 24 rodadas.');
    }
    if (!payload.delay_policy || !payload.dropout_policy) {
      throw new Error('Defina as regras de atraso e saída no Pacto antes de criar o grupo.');
    }

    const groupId = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const members: GroupMember[] = [
      {
        id: `gm_${Date.now()}_0`,
        group_id: groupId,
        user_id: user.id,
        display_name: user.display_name,
        nickname: user.nickname || user.display_name.split(' ')[0],
        avatar_url: user.avatar_url,
        institution: user.institution,
        pact_accepted: false,
        pact_accepted_at: null,
        joined_at: now,
      },
    ];

    if (payload.include_demo_peers !== false) {
      const peers = this.state.users
        .filter((u) => u.id !== user.id && u.role === 'estudante' && u.active)
        .slice(0, 2);

      peers.forEach((peer, idx) => {
        members.push({
          id: `gm_${Date.now()}_${idx + 1}`,
          group_id: groupId,
          user_id: peer.id,
          display_name: peer.display_name,
          nickname: peer.nickname || peer.display_name.split(' ')[0],
          avatar_url: peer.avatar_url,
          institution: peer.institution,
          pact_accepted: true,
          pact_accepted_at: now,
          joined_at: now,
        });
      });
    }

    const newGroup: CollectiveGroup = {
      id: groupId,
      name: payload.name.trim(),
      goal_description:
        payload.goal_description?.trim() || 'Meta coletiva educativa simulada.',
      category: payload.category?.trim() || 'Projeto Escolar',
      target_amount: parsedAmount,
      total_cycles: parsedCycles,
      cycle_frequency:
        payload.cycle_frequency === 'semanal' || payload.cycle_frequency === 'quinzenal'
          ? payload.cycle_frequency
          : 'mensal',
      current_cycle: 0,
      status: 'pact_pending',
      room_pin: payload.room_pin?.trim() || null,
      created_by: user.id,
      created_at: now,
      rules: {
        id: `rule_${Date.now()}`,
        group_id: groupId,
        delay_policy: payload.delay_policy.trim(),
        dropout_policy: payload.dropout_policy.trim(),
        surplus_policy:
          payload.surplus_policy?.trim() || 'Dividir sobras proporcionalmente ao fim da simulação.',
        reserve_percentage: Math.max(0, Math.min(30, Math.round(Number(payload.reserve_percentage ?? 10)))),
        created_at: now,
      },
      members,
      cycles: [],
    };

    this.state.groups.unshift(newGroup);
    this.saveState();

    this.pushInboxEmail({
      recipientEmail: user.email,
      subject: `Novo grupo criado: ${newGroup.name}`,
      fromName: 'PoupaJunto Notificações',
      fromEmail: 'avisos@poupajunto.senai.br',
      snippet: `Meta de R$ ${newGroup.target_amount} em ${newGroup.total_cycles} ciclos salva localmente. Falta aceitar o pacto inicial.`,
      bodyText: [
        `Olá, ${user.display_name}!`,
        '',
        `O grupo "${newGroup.name}" foi criado e salvo automaticamente.`,
        `Meta simulada: R$ ${newGroup.target_amount.toFixed(2)} em ${newGroup.total_cycles} ciclos (${newGroup.cycle_frequency}).`,
        `Fundo Reserva Coletivo: ${newGroup.rules.reserve_percentage}%.`,
        '',
        'Próximo passo: abra o grupo e confirme o Pacto de Regras para liberar o Ciclo 1.',
      ].join('\n'),
    });

    return { group: this.enrichGroup(newGroup) };
  }

  public joinGroup(groupId: string): { group: EnrichedGroup } {
    const user = this.requireCurrentUser();
    const group = this.state.groups.find((g) => g.id === groupId);
    if (!group) {
      throw new Error('Grupo simulado não encontrado.');
    }

    if (!group.members.some((m) => m.user_id === user.id)) {
      group.members.push({
        id: `gm_${Date.now()}`,
        group_id: group.id,
        user_id: user.id,
        display_name: user.display_name,
        nickname: user.nickname || user.display_name.split(' ')[0],
        avatar_url: user.avatar_url,
        institution: user.institution,
        pact_accepted: false,
        pact_accepted_at: null,
        joined_at: new Date().toISOString(),
      });
      if (group.status === 'active') {
        group.status = 'pact_pending';
      }
      this.saveState();
    }

    return { group: this.enrichGroup(group) };
  }

  public acceptPact(groupId: string, acceptAllDemoPeers = false): { group: EnrichedGroup } {
    const user = this.requireCurrentUser();
    const group = this.state.groups.find((g) => g.id === groupId);
    if (!group) {
      throw new Error('Grupo simulado não encontrado.');
    }

    let member = group.members.find((m) => m.user_id === user.id);
    const now = new Date().toISOString();

    if (!member) {
      member = {
        id: `gm_${Date.now()}`,
        group_id: group.id,
        user_id: user.id,
        display_name: user.display_name,
        nickname: user.nickname || user.display_name.split(' ')[0],
        avatar_url: user.avatar_url,
        institution: user.institution,
        pact_accepted: true,
        pact_accepted_at: now,
        joined_at: now,
      };
      group.members.push(member);
    } else {
      member.pact_accepted = true;
      member.pact_accepted_at = now;
    }

    if (acceptAllDemoPeers) {
      for (const m of group.members) {
        if (!m.pact_accepted) {
          m.pact_accepted = true;
          m.pact_accepted_at = now;
        }
      }
    }

    if (canStartSimulation(group.members) && group.status === 'pact_pending') {
      group.status = 'active';
    }

    this.saveState();
    return { group: this.enrichGroup(group) };
  }

  public simulateCycle(
    groupId: string,
    memberStatuses: Record<string, CycleMemberStatus>
  ): { group: EnrichedGroup } {
    const user = this.requireCurrentUser();
    const group = this.state.groups.find((g) => g.id === groupId);
    if (!group) {
      throw new Error('Grupo simulado não encontrado.');
    }

    const result = computeNextCycleState(group, memberStatuses ?? {});
    group.current_cycle = result.nextCycleNumber;
    group.status = result.newStatus;
    group.cycles.push(...result.newRecords);
    this.saveState();

    if (group.status === 'completed') {
      this.pushInboxEmail({
        recipientEmail: user.email,
        subject: `Meta concluída: ${group.name}!`,
        fromName: 'PoupaJunto Conquistas',
        fromEmail: 'conquistas@poupajunto.senai.br',
        snippet: `Todos os ${group.total_cycles} ciclos foram finalizados! Seu Cartão de Pacto e Aprendizado está disponível.`,
        bodyText: [
          `Parabéns, ${user.display_name}!`,
          '',
          `O grupo "${group.name}" concluiu todos os ${group.total_cycles} ciclos simulados.`,
          'Você já pode visualizar ou baixar o Cartão de Pacto e Aprendizado na tela do grupo.',
        ].join('\n'),
      });
    }

    return { group: this.enrichGroup(group) };
  }

  public previewWhatIf(groupId: string, body: Partial<WhatIfInput>): { simulation: WhatIfResult; input: WhatIfInput } {
    this.requireCurrentUser();
    const group = this.state.groups.find((g) => g.id === groupId);
    const input: WhatIfInput = {
      target_amount: Number(body.target_amount ?? group?.target_amount ?? 2000),
      total_cycles: Number(body.total_cycles ?? group?.total_cycles ?? 4),
      member_count: Number(body.member_count ?? group?.members.length ?? 4),
      reserve_percentage: Number(body.reserve_percentage ?? group?.rules.reserve_percentage ?? 10),
      delayed_members: Number(body.delayed_members ?? 1),
      delayed_at_cycle: Number(body.delayed_at_cycle ?? 2),
      dropout_count: Number(body.dropout_count ?? 0),
    };
    return { simulation: runWhatIfSimulation(input), input };
  }

  // --- WORKSHOPS & PILLS ---
  public listWorkshops(): { workshops: WorkshopWithGroups[] } {
    this.requireCurrentUser();
    const workshops = this.state.workshops.map((w) => ({
      ...w,
      groups: this.state.groups.filter((g) => g.room_pin === w.pin),
    }));
    return { workshops };
  }

  public createWorkshop(payload: { title: string; duration_minutes: number }): { workshop: WorkshopWithGroups } {
    const user = this.requireCurrentUser();
    if (user.role !== 'educador' && user.role !== 'superadmin') {
      throw new Error('Acesso restrito a Educadores ou Superadmin.');
    }
    if (!payload.title || payload.title.trim().length < 3) {
      throw new Error('Informe um título para a sala de oficina.');
    }

    let pin = '';
    for (let i = 0; i < 20; i += 1) {
      const candidate = String(Math.floor(100000 + Math.random() * 900000));
      if (!this.state.workshops.some((w) => w.pin === candidate)) {
        pin = candidate;
        break;
      }
    }

    const newWorkshop: WorkshopRoom = {
      id: `wsp_${Date.now()}`,
      pin,
      title: payload.title.trim(),
      educator_id: user.id,
      educator_name: user.display_name,
      institution: user.institution || 'SENAI Jaú-SP',
      duration_minutes: Math.max(10, Math.min(90, Math.round(Number(payload.duration_minutes ?? 15)))),
      active: true,
      created_at: new Date().toISOString(),
    };

    this.state.workshops.unshift(newWorkshop);
    this.saveState();
    return { workshop: { ...newWorkshop, groups: [] } };
  }

  public joinWorkshopByPin(pin: string): { workshop: WorkshopWithGroups } {
    this.requireCurrentUser();
    const cleanPin = String(pin ?? '').trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      throw new Error('Digite um código PIN válido de 6 dígitos.');
    }

    const workshop = this.state.workshops.find((w) => w.pin === cleanPin && w.active);
    if (!workshop) {
      throw new Error('Oficina não encontrada ou encerrada para este PIN.');
    }

    const roomGroups = this.state.groups.filter((g) => g.room_pin === cleanPin);
    return { workshop: { ...workshop, groups: roomGroups } };
  }

  public listPills(): { pills: EducationalPill[] } {
    const user = this.requireCurrentUser();
    const pills = user.role === 'superadmin' ? this.state.pills : this.state.pills.filter((p) => p.active);
    return { pills };
  }

  // --- ADMIN ---
  private requireSuperAdmin(): LocalStoredUser {
    const user = this.requireCurrentUser();
    if (user.role !== 'superadmin') {
      throw new Error('Acesso restrito ao perfil Superadmin.');
    }
    return user;
  }

  public getAdminOverview(): AdminOverviewResponse {
    this.requireSuperAdmin();
    const totalGroups = this.state.groups.length;
    const completedGroups = this.state.groups.filter((g) => g.status === 'completed').length;
    const activeGroups = this.state.groups.filter((g) => g.status === 'active').length;

    const avgCompletionRate =
      totalGroups === 0
        ? 0
        : Math.round(
            this.state.groups.reduce(
              (sum, g) => sum + (g.current_cycle / Math.max(1, g.total_cycles)) * 100,
              0
            ) / totalGroups
          );

    const byInstitutionMap = new Map<string, { institution: string; users: number; groups: number }>();
    for (const u of this.state.users) {
      const key = u.institution?.trim() || 'Sem instituição informada';
      const curr = byInstitutionMap.get(key) ?? { institution: key, users: 0, groups: 0 };
      curr.users += 1;
      byInstitutionMap.set(key, curr);
    }
    for (const g of this.state.groups) {
      const creator = this.state.users.find((u) => u.id === g.created_by);
      const key = creator?.institution?.trim() || 'Sem instituição informada';
      const curr = byInstitutionMap.get(key) ?? { institution: key, users: 0, groups: 0 };
      curr.groups += 1;
      byInstitutionMap.set(key, curr);
    }

    return {
      metrics: {
        totalUsers: this.state.users.length,
        activeUsers: this.state.users.filter((u) => u.active).length,
        totalGroups,
        activeGroups,
        completedGroups,
        avgCompletionRate,
        totalWorkshops: this.state.workshops.length,
        activePills: this.state.pills.filter((p) => p.active).length,
      },
      institutionEngagement: Array.from(byInstitutionMap.values()),
      users: this.state.users.map((u) => this.sanitizeProfile(u)),
      groups: this.state.groups,
      pills: this.state.pills,
    };
  }

  public updateUserRole(userId: string, payload: { role?: UserRole; active?: boolean }): { user: Profile } {
    const admin = this.requireSuperAdmin();
    const target = this.state.users.find((u) => u.id === userId);
    if (!target) {
      throw new Error('Usuário não encontrado.');
    }

    const validRoles: UserRole[] = ['superadmin', 'educador', 'estudante'];
    if (payload.role && validRoles.includes(payload.role)) {
      if (target.id === admin.id && payload.role !== 'superadmin') {
        throw new Error('Não é permitido remover seu próprio acesso de Superadmin.');
      }
      target.role = payload.role;
    }

    if (typeof payload.active === 'boolean') {
      if (target.id === admin.id && !payload.active) {
        throw new Error('Não é permitido desativar a própria conta Superadmin.');
      }
      target.active = payload.active;
    }

    this.saveState();
    return { user: this.sanitizeProfile(target) };
  }

  public moderateGroup(groupId: string, action: 'delete' | 'reset_pact'): { deleted?: boolean; group?: CollectiveGroup } {
    this.requireSuperAdmin();
    const idx = this.state.groups.findIndex((g) => g.id === groupId);
    if (idx === -1) {
      throw new Error('Grupo não encontrado.');
    }

    if (action === 'delete') {
      this.state.groups.splice(idx, 1);
      this.saveState();
      return { deleted: true };
    }

    if (action === 'reset_pact') {
      this.state.groups[idx].status = 'pact_pending';
      this.state.groups[idx].current_cycle = 0;
      this.state.groups[idx].cycles = [];
      for (const m of this.state.groups[idx].members) {
        m.pact_accepted = false;
        m.pact_accepted_at = null;
      }
      this.saveState();
      return { group: this.state.groups[idx] };
    }

    throw new Error('Ação de moderação inválida.');
  }

  public createPill(payload: Omit<EducationalPill, 'id' | 'active'>): { pill: EducationalPill } {
    this.requireSuperAdmin();
    if (!payload.title || !payload.content || !payload.category) {
      throw new Error('Preencha título, conteúdo e categoria da pílula educativa.');
    }

    const pill: EducationalPill = {
      id: `pill_${Date.now()}`,
      title: payload.title.trim(),
      content: payload.content.trim(),
      category: payload.category.trim(),
      ods_tag: (payload.ods_tag || 'ODS 4 · Educação de Qualidade').trim(),
      cycle_trigger: Math.max(1, Math.min(24, Math.round(Number(payload.cycle_trigger ?? 1)))),
      active: true,
    };

    this.state.pills.unshift(pill);
    this.saveState();
    return { pill };
  }

  public updatePill(id: string, payload: Partial<EducationalPill>): { pill: EducationalPill } {
    this.requireSuperAdmin();
    const pill = this.state.pills.find((p) => p.id === id);
    if (!pill) {
      throw new Error('Pílula educativa não encontrada.');
    }

    if (typeof payload.title === 'string' && payload.title.trim()) pill.title = payload.title.trim();
    if (typeof payload.content === 'string' && payload.content.trim()) pill.content = payload.content.trim();
    if (typeof payload.category === 'string' && payload.category.trim()) pill.category = payload.category.trim();
    if (typeof payload.ods_tag === 'string' && payload.ods_tag.trim()) pill.ods_tag = payload.ods_tag.trim();
    if (Number.isFinite(Number(payload.cycle_trigger))) {
      pill.cycle_trigger = Math.max(1, Math.min(24, Math.round(Number(payload.cycle_trigger))));
    }
    if (typeof payload.active === 'boolean') pill.active = payload.active;

    this.saveState();
    return { pill };
  }

  public deletePill(id: string): { deleted: boolean } {
    this.requireSuperAdmin();
    const idx = this.state.pills.findIndex((p) => p.id === id);
    if (idx === -1) {
      throw new Error('Pílula educativa não encontrada.');
    }
    this.state.pills.splice(idx, 1);
    this.saveState();
    return { deleted: true };
  }

  // --- LOCAL MAILBOX / GMAIL ALTERNATIVE ---
  private ensureSavedMailAccount(email: string, name?: string): void {
    const cleanEmail = normalizeGmailInput(email);
    if (!cleanEmail || !cleanEmail.includes('@')) return;
    const cleanName = name?.trim() || cleanEmail.split('@')[0];
    const existing = this.state.savedMailAccounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      if (name?.trim() && existing.name === existing.email.split('@')[0]) {
        existing.name = cleanName;
      }
      return;
    }
    this.state.savedMailAccounts.unshift({ email: cleanEmail, name: cleanName });
  }

  private getActiveMailboxForUser(user: LocalStoredUser): { email: string; name: string } {
    const conn = this.state.googleMailboxConnectedByUser[user.id];
    if (conn) return { email: conn.email.toLowerCase(), name: conn.name };
    return { email: user.email.toLowerCase(), name: user.display_name };
  }

  private isMessageVisibleForAccount(
    msg: LocalEmailMessage,
    activeEmail: string,
    userEmail: string,
    folder: MailFolder
  ): boolean {
    const msgFolder = msg.folder ?? 'inbox';
    const isRecipient =
      msg.recipientEmail === '*' ||
      msg.recipientEmail.toLowerCase() === activeEmail ||
      msg.recipientEmail.toLowerCase() === userEmail;
    const isSender = msg.fromEmail.toLowerCase() === activeEmail;

    if (folder === 'sent') {
      return msgFolder === 'sent' && isSender;
    }
    if (folder === 'trash') {
      return msgFolder === 'trash' && (isRecipient || isSender);
    }
    if (folder === 'starred') {
      return msgFolder !== 'trash' && Boolean(msg.starred) && (isRecipient || isSender);
    }
    if (folder === 'all') {
      return msgFolder !== 'trash' && (isRecipient || isSender);
    }
    // inbox
    return msgFolder === 'inbox' && isRecipient;
  }

  public getMailboxConnection(): { email: string; name: string } | null {
    const userId = this.getCurrentUserIdFromToken();
    if (!userId) return null;
    const conn = this.state.googleMailboxConnectedByUser[userId];
    if (conn) return { email: conn.email, name: conn.name };
    return null;
  }

  public connectMailbox(email?: string, name?: string): { email: string; name: string } {
    const user = this.requireCurrentUser();
    const rawEmail = email?.trim() ? normalizeGmailInput(email) : user.email.toLowerCase();
    if (!rawEmail || !rawEmail.includes('@') || !rawEmail.includes('.')) {
      throw new Error('Informe um e-mail válido (ex.: seu.nome@gmail.com).');
    }

    const existingAccount = this.state.savedMailAccounts.find((a) => a.email.toLowerCase() === rawEmail);
    const matchingUser = this.state.users.find((u) => u.email.toLowerCase() === rawEmail);
    const targetName = (
      name?.trim() ||
      existingAccount?.name ||
      matchingUser?.display_name ||
      rawEmail.split('@')[0]
    ).trim();

    this.ensureSavedMailAccount(rawEmail, targetName);
    this.state.googleMailboxConnectedByUser[user.id] = {
      email: rawEmail,
      name: targetName,
      connectedAt: new Date().toISOString(),
    };

    const hasAccountSpecificMail = this.state.emails.some(
      (m) => m.recipientEmail.toLowerCase() === rawEmail || m.fromEmail.toLowerCase() === rawEmail
    );
    if (!hasAccountSpecificMail) {
      this.pushInboxEmail({
        recipientEmail: rawEmail,
        subject: `Caixa de Entrada ativa para ${rawEmail}`,
        fromName: 'PoupaJunto Mail',
        fromEmail: 'correio@poupajunto.senai.br',
        snippet: `Você conectou ${rawEmail}. Leia mensagens, responda ou escreva novos e-mails para qualquer endereço.`,
        bodyText: [
          `Olá, ${targetName}!`,
          '',
          `A caixa de entrada de ${rawEmail} está pronta no PoupaJunto.`,
          'Todas as mensagens enviadas e recebidas ficam salvas permanentemente neste navegador, sem precisar de API keys.',
          '',
          'Dica: clique em "Escrever" para enviar um e-mail para qualquer destinatário.',
        ].join('\n'),
      });
    } else {
      this.saveState();
    }

    return { email: rawEmail, name: targetName };
  }

  public disconnectMailbox(): void {
    const userId = this.getCurrentUserIdFromToken();
    if (!userId) return;
    delete this.state.googleMailboxConnectedByUser[userId];
    this.saveState();
  }

  public listKnownGoogleProfiles(): Array<{ email: string; name: string }> {
    const base: Array<{ email: string; name: string }> = [];
    const seen = new Set<string>();
    const add = (email: string, name: string) => {
      const clean = email.trim().toLowerCase();
      if (!clean || seen.has(clean)) return;
      seen.add(clean);
      base.push({ email: clean, name });
    };

    for (const acc of this.state.savedMailAccounts) {
      add(acc.email, acc.name);
    }
    for (const u of this.state.users) {
      if (u.active && (u.email.includes('gmail.com') || u.id.startsWith('usr_google_') || u.id === 'usr_estudante_1')) {
        add(u.email, u.display_name);
      }
    }
    add('jvggjvgg23@gmail.com', 'Jvgg');
    return base;
  }

  public listSavedMailboxAccounts(): Array<{ email: string; name: string; unreadCount: number }> {
    const userId = this.getCurrentUserIdFromToken();
    const currentUser = userId ? this.state.users.find((u) => u.id === userId) : null;
    const candidates = this.listKnownGoogleProfiles();
    if (currentUser) {
      if (!candidates.some((c) => c.email === currentUser.email.toLowerCase())) {
        candidates.unshift({ email: currentUser.email.toLowerCase(), name: currentUser.display_name });
      }
    }

    return candidates.map((acc) => {
      const unreadCount = this.state.emails.filter(
        (m) =>
          (m.folder ?? 'inbox') === 'inbox' &&
          m.unread &&
          (m.recipientEmail === '*' || m.recipientEmail.toLowerCase() === acc.email)
      ).length;
      return { ...acc, unreadCount };
    });
  }

  public getInboxUnreadCount(): number {
    const userId = this.getCurrentUserIdFromToken();
    if (!userId) return 0;
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) return 0;
    const active = this.getActiveMailboxForUser(user);
    return this.state.emails.filter((msg) =>
      this.isMessageVisibleForAccount(msg, active.email, user.email.toLowerCase(), 'inbox') && msg.unread
    ).length;
  }

  public listInboxMessages(query = '', folder: MailFolder = 'inbox'): ParsedGmailMessage[] {
    const user = this.requireCurrentUser();
    const active = this.getActiveMailboxForUser(user);
    const userEmail = user.email.toLowerCase();
    const q = query.trim().toLowerCase();

    return this.state.emails
      .filter((msg) => {
        if (!this.isMessageVisibleForAccount(msg, active.email, userEmail, folder)) {
          return false;
        }
        if (!q) return true;
        return (
          msg.subject.toLowerCase().includes(q) ||
          msg.fromName.toLowerCase().includes(q) ||
          msg.fromEmail.toLowerCase().includes(q) ||
          (msg.toEmail ?? '').toLowerCase().includes(q) ||
          msg.snippet.toLowerCase().includes(q) ||
          (msg.bodyText ?? '').toLowerCase().includes(q)
        );
      })
      .map(({ recipientEmail: _rec, ...rest }) => ({ ...rest }));
  }

  public getInboxMessageDetail(messageId: string): ParsedGmailMessage {
    this.requireCurrentUser();
    const msg = this.state.emails.find((m) => m.id === messageId);
    if (!msg) {
      throw new Error('Mensagem não encontrada.');
    }
    if (msg.unread) {
      msg.unread = false;
      msg.labelIds = msg.labelIds.filter((l) => l !== 'UNREAD');
      this.saveState();
    }
    const { recipientEmail: _rec, ...rest } = msg;
    return { ...rest };
  }

  public sendLocalEmail(payload: {
    to: string;
    subject: string;
    bodyText: string;
  }): ParsedGmailMessage {
    const user = this.requireCurrentUser();
    const active = this.getActiveMailboxForUser(user);
    const toEmail = normalizeGmailInput(payload.to ?? '');
    if (!toEmail || !toEmail.includes('@') || !toEmail.includes('.')) {
      throw new Error('Informe um e-mail de destinatário válido (ex.: colega@gmail.com).');
    }
    const subject = payload.subject?.trim() || '';
    if (!subject) {
      throw new Error('Informe o assunto do e-mail.');
    }
    const bodyText = payload.bodyText?.trim() || '';
    if (!bodyText) {
      throw new Error('Escreva o conteúdo da mensagem antes de enviar.');
    }

    this.ensureSavedMailAccount(toEmail);
    const nowIso = new Date().toISOString();
    const threadId = `thr_${Date.now()}`;
    const snippet = bodyText.replace(/\s+/g, ' ').slice(0, 120);

    const sentCopy: LocalEmailMessage = {
      id: `msg_sent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      threadId,
      recipientEmail: active.email,
      toEmail,
      subject,
      from: `${active.name} <${active.email}>`,
      fromName: active.name,
      fromEmail: active.email,
      date: nowIso,
      dateFormatted: formatShortPtBrDate(nowIso),
      snippet,
      unread: false,
      starred: false,
      folder: 'sent',
      labelIds: ['SENT'],
      bodyText,
    };

    const inboxCopy: LocalEmailMessage = {
      id: `msg_in_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      threadId,
      recipientEmail: toEmail,
      toEmail,
      subject,
      from: `${active.name} <${active.email}>`,
      fromName: active.name,
      fromEmail: active.email,
      date: nowIso,
      dateFormatted: formatShortPtBrDate(nowIso),
      snippet,
      unread: true,
      starred: false,
      folder: 'inbox',
      labelIds: ['INBOX', 'UNREAD'],
      bodyText,
    };

    this.state.emails.unshift(sentCopy);
    if (toEmail !== active.email) {
      this.state.emails.unshift(inboxCopy);
    } else {
      // Se enviou para si mesmo, aparece também na Caixa de Entrada como nova mensagem
      this.state.emails.unshift(inboxCopy);
    }
    this.saveState();

    const { recipientEmail: _rec, ...rest } = sentCopy;
    return { ...rest };
  }

  public toggleEmailStar(messageId: string): ParsedGmailMessage {
    this.requireCurrentUser();
    const msg = this.state.emails.find((m) => m.id === messageId);
    if (!msg) throw new Error('Mensagem não encontrada.');
    msg.starred = !msg.starred;
    this.saveState();
    const { recipientEmail: _rec, ...rest } = msg;
    return { ...rest };
  }

  public toggleEmailUnread(messageId: string): ParsedGmailMessage {
    this.requireCurrentUser();
    const msg = this.state.emails.find((m) => m.id === messageId);
    if (!msg) throw new Error('Mensagem não encontrada.');
    msg.unread = !msg.unread;
    msg.labelIds = msg.unread
      ? Array.from(new Set([...msg.labelIds, 'UNREAD']))
      : msg.labelIds.filter((l) => l !== 'UNREAD');
    this.saveState();
    const { recipientEmail: _rec, ...rest } = msg;
    return { ...rest };
  }

  public moveEmailToTrash(messageId: string): void {
    this.requireCurrentUser();
    const msg = this.state.emails.find((m) => m.id === messageId);
    if (!msg) throw new Error('Mensagem não encontrada.');
    msg.folder = 'trash';
    this.saveState();
  }

  public restoreEmailFromTrash(messageId: string): ParsedGmailMessage {
    this.requireCurrentUser();
    const msg = this.state.emails.find((m) => m.id === messageId);
    if (!msg) throw new Error('Mensagem não encontrada.');
    msg.folder = msg.labelIds.includes('SENT') ? 'sent' : 'inbox';
    this.saveState();
    const { recipientEmail: _rec, ...rest } = msg;
    return { ...rest };
  }

  public deleteEmailPermanently(messageId: string): void {
    this.requireCurrentUser();
    const idx = this.state.emails.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    this.state.emails.splice(idx, 1);
    this.saveState();
  }
}

export const localDb = new LocalDatabaseService();

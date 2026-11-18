import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env';
import type {
  CollectiveGroup,
  EducationalPill,
  Profile,
  WorkshopRoom,
} from '../../src/shared/types';

export interface StoredUser extends Profile {
  password_hash: string;
}

export interface PasswordResetRecord {
  id: string;
  user_id: string;
  email: string;
  code_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface DatabaseState {
  users: StoredUser[];
  groups: CollectiveGroup[];
  workshops: WorkshopRoom[];
  pills: EducationalPill[];
  passwordResets: PasswordResetRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'poupajunto-db.json');
export const AVATARS_DIR = path.join(DATA_DIR, 'avatars');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

function createInitialSeed(): DatabaseState {
  const superadminHash = bcrypt.hashSync(ENV.DEFAULT_SUPERADMIN_PASS, 10);
  const educatorHash = bcrypt.hashSync('Senai@2026', 10);
  const studentHash = bcrypt.hashSync('Aluno@2026', 10);

  const users: StoredUser[] = [
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

  return { users, groups, workshops, pills, passwordResets: [] };
}

class StoreService {
  private state: DatabaseState;

  constructor() {
    ensureDirs();
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<DatabaseState>;
        this.state = {
          users: parsed.users ?? [],
          groups: parsed.groups ?? [],
          workshops: parsed.workshops ?? [],
          pills: parsed.pills ?? [],
          passwordResets: parsed.passwordResets ?? [],
        };
      } catch {
        this.state = createInitialSeed();
        this.save();
      }
    } else {
      this.state = createInitialSeed();
      this.save();
    }
  }

  private save() {
    ensureDirs();
    fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public sanitizeProfile(user: StoredUser): Profile {
    const { password_hash: _pw, ...profile } = user;
    return profile;
  }

  public commit() {
    this.save();
  }
}

export const store = new StoreService();

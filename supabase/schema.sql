-- ============================================================================
-- PoupaJunto — Schema Completo PostgreSQL / Supabase (INTEGRA SENAI 2026)
-- Equipe Tech Minds (SENAI Jaú-SP)
-- Diretriz Ética: Ambiente 100% Simulado e Educativo (LGPD Compliant)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tipos Enumerados
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('superadmin', 'educador', 'estudante');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE group_status AS ENUM ('pact_pending', 'active', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cycle_member_status AS ENUM ('on_time', 'delayed', 'reserve_used');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE theme_mode AS ENUM ('light', 'dark');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tabela de Perfis (Coleta Mínima LGPD — sem CPF ou dados bancários)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role user_role NOT NULL DEFAULT 'estudante',
  institution TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  theme_preference theme_mode NOT NULL DEFAULT 'light',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Salas de Oficina / Turma (Modo Sala de Aula com PIN)
CREATE TABLE IF NOT EXISTS public.workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin VARCHAR(6) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  educator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  duration_minutes INT NOT NULL DEFAULT 15,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Grupos Coletivos Simulados
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  goal_description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Formatura',
  target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
  total_cycles INT NOT NULL CHECK (total_cycles BETWEEN 2 AND 24),
  cycle_frequency TEXT NOT NULL DEFAULT 'mensal',
  current_cycle INT NOT NULL DEFAULT 0,
  status group_status NOT NULL DEFAULT 'pact_pending',
  room_pin VARCHAR(6) REFERENCES public.workshops(pin) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Pacto de Regras Combinadas
CREATE TABLE IF NOT EXISTS public.group_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID UNIQUE NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  delay_policy TEXT NOT NULL,
  dropout_policy TEXT NOT NULL,
  surplus_policy TEXT NOT NULL,
  reserve_percentage INT NOT NULL DEFAULT 10 CHECK (reserve_percentage BETWEEN 0 AND 30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Membros do Grupo e Aceite Formal do Pacto
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pact_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  pact_accepted_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- 7. Ciclos de Simulação
CREATE TABLE IF NOT EXISTS public.simulation_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cycle_number INT NOT NULL CHECK (cycle_number >= 1),
  simulated_status cycle_member_status NOT NULL,
  simulated_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reserve_delta NUMERIC(12, 2) NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Pílulas Educativas (Banco Central + ONU ODS 4 e 8)
CREATE TABLE IF NOT EXISTS public.educational_pills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  ods_tag TEXT NOT NULL DEFAULT 'ODS 4 · Educação de Qualidade',
  cycle_trigger INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_pills ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para checar Superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin' AND active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policies: profiles
CREATE POLICY "Perfis visíveis para usuários autenticados"
  ON public.profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Usuário atualiza o próprio perfil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_superadmin());

CREATE POLICY "Superadmin gerencia perfis"
  ON public.profiles FOR ALL TO authenticated USING (public.is_superadmin());

-- Policies: groups & members
CREATE POLICY "Membros ou Superadmin visualizam grupos"
  ON public.groups FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = id AND gm.user_id = auth.uid())
    OR room_pin IS NOT NULL
    OR public.is_superadmin()
  );

CREATE POLICY "Usuários autenticados criam grupos"
  ON public.groups FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Criador ou Superadmin atualizam grupo"
  ON public.groups FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_superadmin());

-- Policies: educational_pills
CREATE POLICY "Pílulas ativas visíveis a todos autenticados"
  ON public.educational_pills FOR SELECT TO authenticated
  USING (active = TRUE OR public.is_superadmin());

CREATE POLICY "Apenas Superadmin edita pílulas"
  ON public.educational_pills FOR ALL TO authenticated
  USING (public.is_superadmin());

-- ============================================================================
-- Storage Bucket para Avatares (avatars)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatares públicos para leitura"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Usuário autenticado envia seu próprio avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Usuário autenticado atualiza seu próprio avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- Seed Inicial de Pílulas Educativas
-- ============================================================================

INSERT INTO public.educational_pills (title, content, category, ods_tag, cycle_trigger, active)
VALUES
  (
    'Por que combinar regras antes de começar?',
    'Na maioria dos grupos de estudantes, os conflitos não acontecem por má intenção, mas pela ausência de regras claras sobre atrasos e desistências. Definir o pacto antes do Ciclo 1 protege amizades e a meta coletiva.',
    'Planejamento e Pactos',
    'ODS 4 · Educação de Qualidade',
    1,
    TRUE
  ),
  (
    'O papel do Fundo Reserva Coletivo',
    'Destinar de 10% a 15% da meta simulada para uma reserva comum funciona como um amortecedor: se um integrante tiver um imprevisto temporário em um ciclo, o cronograma do grupo não trava.',
    'Reserva para Imprevistos',
    'ODS 8 · Trabalho Decente e Crescimento',
    2,
    TRUE
  ),
  (
    'Comunicação transparente supera cobranças',
    'De acordo com princípios de Cidadania Financeira do Banco Central, avisar antecipadamente uma dificuldade de aporte permite renegociar prazos com calma, evitando desgaste emocional na turma.',
    'Comunicação em Grupo',
    'ODS 4 · Educação de Qualidade',
    3,
    TRUE
  ),
  (
    'Avaliação pós-ciclo e sobras planejadas',
    'Ao finalizar uma meta coletiva, decidir previamente o destino de eventuais sobras — seja dividindo proporcionalmente ou mantendo um fundo inicial para o próximo projeto — consolida a cultura de planejamento.',
    'Cidadania Financeira',
    'ODS 8 · Trabalho Decente e Crescimento',
    4,
    TRUE
  )
ON CONFLICT DO NOTHING;

-- Nota sobre Seed do Superadmin no Supabase:
-- Crie o usuário em Authentication -> Users (ex.: superadmin@poupajunto.senai.br)
-- e execute o comando abaixo substituindo o UUID retornado:
-- INSERT INTO public.profiles (id, full_name, display_name, role, institution)
-- VALUES ('<UUID_DO_AUTH_USERS>', 'Coordenação Tech Minds', 'Superadmin SENAI', 'superadmin', 'SENAI Jaú-SP')
-- ON CONFLICT (id) DO UPDATE SET role = 'superadmin';

export type UserRole = 'superadmin' | 'educador' | 'estudante';
export type GroupStatus = 'pact_pending' | 'active' | 'completed';
export type CycleMemberStatus = 'on_time' | 'delayed' | 'reserve_used';
export type ThemePreference = 'light' | 'dark';
export type CycleFrequency = 'semanal' | 'quinzenal' | 'mensal';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  display_name: string;
  nickname: string;
  avatar_url: string;
  role: UserRole;
  institution: string;
  bio: string;
  theme_preference: ThemePreference;
  active: boolean;
  created_at: string;
}

export interface GroupRule {
  id: string;
  group_id: string;
  delay_policy: string;
  dropout_policy: string;
  surplus_policy: string;
  reserve_percentage: number;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string;
  nickname: string;
  avatar_url: string;
  institution: string;
  pact_accepted: boolean;
  pact_accepted_at: string | null;
  joined_at: string;
}

export interface SimulationCycleRecord {
  id: string;
  group_id: string;
  member_id: string;
  cycle_number: number;
  simulated_status: CycleMemberStatus;
  simulated_value: number;
  reserve_delta: number;
  recorded_at: string;
}

export interface CollectiveGroup {
  id: string;
  name: string;
  goal_description: string;
  category: string;
  target_amount: number;
  total_cycles: number;
  cycle_frequency: CycleFrequency;
  current_cycle: number;
  status: GroupStatus;
  room_pin: string | null;
  created_by: string;
  created_at: string;
  rules: GroupRule;
  members: GroupMember[];
  cycles: SimulationCycleRecord[];
}

export interface EducationalPill {
  id: string;
  title: string;
  content: string;
  category: string;
  ods_tag: string;
  cycle_trigger: number;
  active: boolean;
}

export interface WorkshopRoom {
  id: string;
  pin: string;
  title: string;
  educator_id: string;
  educator_name: string;
  institution: string;
  duration_minutes: number;
  active: boolean;
  created_at: string;
}

export interface BehavioralBadge {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  criterion: string;
}

export interface WhatIfInput {
  target_amount: number;
  total_cycles: number;
  member_count: number;
  reserve_percentage: number;
  delayed_members: number;
  delayed_at_cycle: number;
  dropout_count: number;
}

export interface WhatIfCyclePoint {
  cycle: number;
  plannedCumulative: number;
  stressedCumulative: number;
  reserveBalance: number;
  deficitCoveredByReserve: boolean;
}

export interface WhatIfResult {
  plannedPerMemberCycle: number;
  estimatedDelayCycles: number;
  projectedTotalCycles: number;
  reserveTargetAmount: number;
  peakShortfall: number;
  resilienceRating: 'alta' | 'moderada' | 'critica';
  summaryRecommendation: string;
  timeline: WhatIfCyclePoint[];
}

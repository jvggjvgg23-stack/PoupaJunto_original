import {
  localDb,
  type AdminOverviewResponse,
  type EnrichedGroup,
  type WorkshopWithGroups,
} from './localDb';
import type {
  CycleMemberStatus,
  EducationalPill,
  Profile,
  UserRole,
  WhatIfInput,
  WhatIfResult,
  CollectiveGroup,
} from '../shared/types';

export type { AdminOverviewResponse, EnrichedGroup, WorkshopWithGroups };

export function getStoredToken(): string | null {
  return localDb.getStoredToken();
}

export function setStoredToken(token: string | null): void {
  localDb.setStoredToken(token);
}

export const api = {
  auth: {
    register: async (payload: {
      email: string;
      password: string;
      display_name: string;
      full_name?: string;
      institution?: string;
    }): Promise<{ token: string; user: Profile }> => localDb.register(payload),

    login: async (payload: {
      email: string;
      password: string;
    }): Promise<{ token: string; user: Profile }> => localDb.login(payload),

    loginWithGoogle: async (payload: {
      email: string;
      name?: string;
    }): Promise<{ token: string; user: Profile }> => localDb.loginWithGoogleLocal(payload),

    recover: async (
      email: string
    ): Promise<{ sentTo: string; expiresMinutes: number; recoveryKey: string; message: string }> =>
      localDb.recoverPassword(email),

    resetPassword: async (payload: {
      email: string;
      recoveryKey: string;
      newPassword: string;
    }): Promise<{ token: string; user: Profile; message: string }> => localDb.resetPassword(payload),

    me: async (): Promise<{ user: Profile }> => localDb.me(),
  },

  profile: {
    get: async (): Promise<{ profile: Profile }> => ({ profile: localDb.me().user }),
    update: async (
      payload: Partial<
        Pick<Profile, 'display_name' | 'full_name' | 'nickname' | 'institution' | 'bio' | 'theme_preference'>
      >
    ): Promise<{ profile: Profile }> => localDb.updateProfile(payload),
    uploadAvatar: async (imageDataUrl: string): Promise<{ avatar_url: string; profile: Profile }> =>
      localDb.uploadAvatar(imageDataUrl),
  },

  groups: {
    list: async (): Promise<{ groups: EnrichedGroup[] }> => localDb.listGroups(),
    create: async (payload: {
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
    }): Promise<{ group: EnrichedGroup }> => localDb.createGroup(payload),
    join: async (id: string): Promise<{ group: EnrichedGroup }> => localDb.joinGroup(id),
    acceptPact: async (id: string, acceptAllDemoPeers = false): Promise<{ group: EnrichedGroup }> =>
      localDb.acceptPact(id, acceptAllDemoPeers),
    simulateCycle: async (
      id: string,
      memberStatuses: Record<string, CycleMemberStatus>
    ): Promise<{ group: EnrichedGroup }> => localDb.simulateCycle(id, memberStatuses),
    whatIf: async (
      id: string,
      input: Partial<WhatIfInput>
    ): Promise<{ simulation: WhatIfResult; input: WhatIfInput }> => localDb.previewWhatIf(id, input),
  },

  workshops: {
    list: async (): Promise<{ workshops: WorkshopWithGroups[] }> => localDb.listWorkshops(),
    create: async (payload: {
      title: string;
      duration_minutes: number;
    }): Promise<{ workshop: WorkshopWithGroups }> => localDb.createWorkshop(payload),
    joinByPin: async (pin: string): Promise<{ workshop: WorkshopWithGroups }> =>
      localDb.joinWorkshopByPin(pin),
  },

  pills: {
    list: async (): Promise<{ pills: EducationalPill[] }> => localDb.listPills(),
  },

  admin: {
    overview: async (): Promise<AdminOverviewResponse> => localDb.getAdminOverview(),
    updateUser: async (
      id: string,
      payload: { role?: UserRole; active?: boolean }
    ): Promise<{ user: Profile }> => localDb.updateUserRole(id, payload),
    moderateGroup: async (
      id: string,
      action: 'delete' | 'reset_pact'
    ): Promise<{ deleted?: boolean; group?: CollectiveGroup }> => localDb.moderateGroup(id, action),
    createPill: async (
      payload: Omit<EducationalPill, 'id' | 'active'>
    ): Promise<{ pill: EducationalPill }> => localDb.createPill(payload),
    updatePill: async (
      id: string,
      payload: Partial<EducationalPill>
    ): Promise<{ pill: EducationalPill }> => localDb.updatePill(id, payload),
    deletePill: async (id: string): Promise<{ deleted: boolean }> => localDb.deletePill(id),
  },
};

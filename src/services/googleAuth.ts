import { localDb } from './localDb';

export interface LocalGoogleUser {
  email: string;
  displayName: string;
}

export const getKnownLocalGoogleProfiles = (): Array<{ email: string; name: string }> => {
  return localDb.listKnownGoogleProfiles();
};

export const listSavedGmailAccounts = (): Array<{
  email: string;
  name: string;
  unreadCount: number;
}> => {
  return localDb.listSavedMailboxAccounts();
};

export const getCurrentGoogleUser = (): LocalGoogleUser | null => {
  const conn = localDb.getMailboxConnection();
  if (!conn) return null;
  return { email: conn.email, displayName: conn.name };
};

export const getAccessToken = async (): Promise<string | null> => {
  const conn = localDb.getMailboxConnection();
  return conn ? `local_mailbox_${conn.email}` : null;
};

export const googleSignIn = async (params?: {
  email?: string;
  name?: string;
}): Promise<{ user: LocalGoogleUser; accessToken: string }> => {
  const conn = localDb.connectMailbox(params?.email, params?.name);
  return {
    user: { email: conn.email, displayName: conn.name },
    accessToken: `local_mailbox_${conn.email}`,
  };
};

export const googleLogout = async (): Promise<void> => {
  localDb.disconnectMailbox();
};

export const invalidateAccessToken = (): void => {
  localDb.disconnectMailbox();
};

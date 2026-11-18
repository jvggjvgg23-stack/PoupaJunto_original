import type { ParsedGmailMessage } from '../shared/gmailParser';
import { localDb, type MailFolder } from './localDb';

export type { MailFolder };

export class GmailUnauthorizedError extends Error {
  constructor(message = 'Caixa local desconectada. Selecione ou informe um e-mail para continuar.') {
    super(message);
    this.name = 'GmailUnauthorizedError';
  }
}

export async function listGmailMessages(params: {
  accessToken: string;
  query?: string;
  folder?: MailFolder;
  maxResults?: number;
}): Promise<ParsedGmailMessage[]> {
  if (!params.accessToken) {
    throw new GmailUnauthorizedError();
  }
  const items = localDb.listInboxMessages(params.query ?? '', params.folder ?? 'inbox');
  const max = params.maxResults ?? 50;
  return items.slice(0, max);
}

export async function getGmailMessageDetail(params: {
  accessToken: string;
  messageId: string;
}): Promise<ParsedGmailMessage> {
  if (!params.accessToken) {
    throw new GmailUnauthorizedError();
  }
  return localDb.getInboxMessageDetail(params.messageId);
}

export async function sendGmailMessage(params: {
  accessToken: string;
  to: string;
  subject: string;
  bodyText: string;
}): Promise<ParsedGmailMessage> {
  if (!params.accessToken) {
    throw new GmailUnauthorizedError();
  }
  return localDb.sendLocalEmail({
    to: params.to,
    subject: params.subject,
    bodyText: params.bodyText,
  });
}

export async function toggleGmailStar(messageId: string): Promise<ParsedGmailMessage> {
  return localDb.toggleEmailStar(messageId);
}

export async function toggleGmailUnread(messageId: string): Promise<ParsedGmailMessage> {
  return localDb.toggleEmailUnread(messageId);
}

export async function trashGmailMessage(messageId: string): Promise<void> {
  localDb.moveEmailToTrash(messageId);
}

export async function restoreGmailMessage(messageId: string): Promise<ParsedGmailMessage> {
  return localDb.restoreEmailFromTrash(messageId);
}

export async function deleteGmailMessageForever(messageId: string): Promise<void> {
  localDb.deleteEmailPermanently(messageId);
}

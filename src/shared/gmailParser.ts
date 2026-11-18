export interface GmailHeader {
  name?: string;
  value?: string;
}

export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: {
    size?: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

export interface GmailRawMessage {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
}

export interface ParsedGmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromName: string;
  fromEmail: string;
  toEmail?: string;
  date: string;
  dateFormatted: string;
  snippet: string;
  unread: boolean;
  starred?: boolean;
  folder?: 'inbox' | 'sent' | 'trash';
  labelIds: string[];
  bodyText?: string;
}

export function normalizeGmailInput(raw: string): string {
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!trimmed) return '';
  if (trimmed.includes('@')) {
    return trimmed;
  }
  return `${trimmed}@gmail.com`;
}

export function decodeBase64Url(data: string): string {
  if (!data) return '';
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const base64 = normalized + padding;

  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  return Buffer.from(base64, 'base64').toString('utf-8');
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(Number(dec)));
}

export function stripHtmlToText(html: string): string {
  const withoutStyleOrScript = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ');
  const withBreaks = withoutStyleOrScript
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n');
  const stripped = withBreaks.replace(/<[^>]+>/g, '');
  return decodeHtmlEntities(stripped)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function getHeaderValue(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers || headers.length === 0) return '';
  const target = name.toLowerCase();
  const found = headers.find((h) => h.name?.toLowerCase() === target);
  return found?.value?.trim() || '';
}

export function parseSender(fromHeader: string): { fromName: string; fromEmail: string } {
  const raw = fromHeader.trim();
  if (!raw) return { fromName: 'Remetente desconhecido', fromEmail: '' };

  const match = raw.match(/^(?:"?([^"]*)"?\s)?<([^>]+)>$/);
  if (match) {
    const name = (match[1] || '').trim();
    const email = (match[2] || '').trim();
    return {
      fromName: name || email,
      fromEmail: email,
    };
  }

  return {
    fromName: raw,
    fromEmail: raw.includes('@') ? raw : '',
  };
}

export function formatEmailDate(rawDate: string, internalDateMs?: string): string {
  const timestamp = internalDateMs ? Number(internalDateMs) : Date.parse(rawDate);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return rawDate || 'Data indisponível';
  }
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleDateString('pt-BR');
  }
}

export function extractBodyTextFromPayload(payload: GmailMessagePart | undefined): string {
  if (!payload) return '';

  const collect = (part: GmailMessagePart, mimeTarget: string): string | null => {
    if (part.mimeType?.toLowerCase() === mimeTarget && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
    if (part.parts && part.parts.length > 0) {
      for (const child of part.parts) {
        const found = collect(child, mimeTarget);
        if (found !== null) return found;
      }
    }
    return null;
  };

  const plain = collect(payload, 'text/plain');
  if (plain !== null && plain.trim().length > 0) {
    return plain.trim();
  }

  const html = collect(payload, 'text/html');
  if (html !== null && html.trim().length > 0) {
    return stripHtmlToText(html);
  }

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    return payload.mimeType?.toLowerCase().includes('html') ? stripHtmlToText(decoded) : decoded.trim();
  }

  return '';
}

export function parseGmailMessage(raw: GmailRawMessage, includeBody = false): ParsedGmailMessage {
  const headers = raw.payload?.headers;
  const subject = getHeaderValue(headers, 'Subject') || '(Sem assunto)';
  const from = getHeaderValue(headers, 'From');
  const date = getHeaderValue(headers, 'Date');
  const { fromName, fromEmail } = parseSender(from);
  const labelIds = raw.labelIds ?? [];
  const snippet = decodeHtmlEntities(raw.snippet || '');

  const parsed: ParsedGmailMessage = {
    id: raw.id,
    threadId: raw.threadId || raw.id,
    subject,
    from: from || fromName,
    fromName,
    fromEmail,
    date,
    dateFormatted: formatEmailDate(date, raw.internalDate),
    snippet,
    unread: labelIds.includes('UNREAD'),
    labelIds,
  };

  if (includeBody) {
    const extracted = extractBodyTextFromPayload(raw.payload);
    parsed.bodyText = extracted || snippet;
  }

  return parsed;
}

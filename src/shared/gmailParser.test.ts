import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeBase64Url,
  extractBodyTextFromPayload,
  parseGmailMessage,
  parseSender,
  stripHtmlToText,
} from './gmailParser';

function toBase64Url(text: string): string {
  return Buffer.from(text, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

test('decodeBase64Url decodes UTF-8 Portuguese characters properly', () => {
  const sample = 'Organização financeira coletiva — INTEGRA SENAI 2026!';
  const encoded = toBase64Url(sample);
  assert.equal(decodeBase64Url(encoded), sample);
});

test('parseSender extracts display name and email cleanly', () => {
  assert.deepEqual(parseSender('"Secretaria SENAI Jaú" <secretaria@senai.br>'), {
    fromName: 'Secretaria SENAI Jaú',
    fromEmail: 'secretaria@senai.br',
  });
  assert.deepEqual(parseSender('aluno@senai.br'), {
    fromName: 'aluno@senai.br',
    fromEmail: 'aluno@senai.br',
  });
});

test('extractBodyTextFromPayload prefers text/plain over text/html in multipart payloads', () => {
  const payload = {
    mimeType: 'multipart/alternative',
    parts: [
      {
        mimeType: 'text/plain',
        body: { data: toBase64Url('Olá turma, reunião confirmada amanhã às 14h.') },
      },
      {
        mimeType: 'text/html',
        body: { data: toBase64Url('<p>Olá <strong>turma</strong></p>') },
      },
    ],
  };

  assert.equal(
    extractBodyTextFromPayload(payload),
    'Olá turma, reunião confirmada amanhã às 14h.'
  );
});

test('extractBodyTextFromPayload falls back to sanitized text when only text/html is present', () => {
  const payload = {
    mimeType: 'multipart/alternative',
    parts: [
      {
        mimeType: 'text/html',
        body: {
          data: toBase64Url(
            '<style>.hidden{display:none}</style><p>Aviso importante &amp; prazo:</p><p>Entrega dia 20.</p><script>alert(1)</script>'
          ),
        },
      },
    ],
  };

  const text = extractBodyTextFromPayload(payload);
  assert.equal(text.includes('Aviso importante & prazo:'), true);
  assert.equal(text.includes('Entrega dia 20.'), true);
  assert.equal(text.includes('alert(1)'), false);
  assert.equal(text.includes('<p>'), false);
});

test('parseGmailMessage extracts headers, unread badge, and full body', () => {
  const raw = {
    id: 'msg_123',
    threadId: 'thr_123',
    labelIds: ['INBOX', 'UNREAD'],
    snippet: 'Resumo do aviso &amp; cronograma',
    internalDate: String(Date.UTC(2026, 10, 15, 14, 30)),
    payload: {
      headers: [
        { name: 'Subject', value: 'Cronograma Projeto Tech Minds' },
        { name: 'From', value: 'Prof. Marcos <marcos@senai.br>' },
        { name: 'Date', value: 'Sun, 15 Nov 2026 14:30:00 +0000' },
      ],
      mimeType: 'text/plain',
      body: { data: toBase64Url('Prezados, segue o cronograma atualizado.') },
    },
  };

  const parsed = parseGmailMessage(raw, true);
  assert.equal(parsed.subject, 'Cronograma Projeto Tech Minds');
  assert.equal(parsed.fromName, 'Prof. Marcos');
  assert.equal(parsed.fromEmail, 'marcos@senai.br');
  assert.equal(parsed.unread, true);
  assert.equal(parsed.snippet, 'Resumo do aviso & cronograma');
  assert.equal(parsed.bodyText, 'Prezados, segue o cronograma atualizado.');
});

test('stripHtmlToText converts line breaks cleanly', () => {
  assert.equal(stripHtmlToText('Linha 1<br/>Linha 2'), 'Linha 1\nLinha 2');
});

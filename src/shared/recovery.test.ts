import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeBase64Url } from './gmailParser';
import { buildRecoveryEmailRaw, generateRecoveryKey } from './recovery';

test('generateRecoveryKey creates 8-character uppercase unambiguous key', () => {
  const key = generateRecoveryKey();
  assert.equal(key.length, 8);
  assert.match(key, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
});

test('buildRecoveryEmailRaw encodes valid RFC 2822 UTF-8 MIME email containing the recovery key', () => {
  const raw = buildRecoveryEmailRaw({
    toEmail: 'estudante@gmail.com',
    displayName: 'Ana Clara',
    recoveryKey: 'PJ7K9M2X',
    expiresMinutes: 15,
  });

  assert.equal(raw.includes('+'), false);
  assert.equal(raw.includes('/'), false);
  assert.equal(raw.includes('='), false);

  const decoded = decodeBase64Url(raw);
  assert.equal(decoded.includes('To: estudante@gmail.com'), true);
  assert.equal(decoded.includes('Subject: =?UTF-8?B?'), true);
  assert.equal(decoded.includes('Sua chave de recuperação é: PJ7K9M2X'), true);
  assert.equal(decoded.includes('expira em 15 minutos'), true);
});

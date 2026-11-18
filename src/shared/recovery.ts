const KEY_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateRecoveryKey(length = 8): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
  }
  return result;
}

export function encodeBase64(text: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(text, 'utf-8').toString('base64');
  }
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

export function encodeBase64Url(text: string): string {
  return encodeBase64(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function encodeRfc2047Utf8(text: string): string {
  return `=?UTF-8?B?${encodeBase64(text)}?=`;
}

export function buildRecoveryEmailRaw(params: {
  toEmail: string;
  displayName: string;
  recoveryKey: string;
  expiresMinutes?: number;
}): string {
  const { toEmail, displayName, recoveryKey, expiresMinutes = 15 } = params;
  const safeName = displayName.trim() || 'Estudante';
  const subject = 'PoupaJunto — Sua chave de recuperação de senha';

  const bodyLines = [
    `Olá, ${safeName}!`,
    '',
    'Você solicitou a recuperação de senha da sua conta educativa no PoupaJunto.',
    '',
    `Sua chave de recuperação é: ${recoveryKey}`,
    '',
    `Digite esta chave na tela "Recuperar Senha" do PoupaJunto junto com sua nova senha.`,
    `Por segurança, esta chave expira em ${expiresMinutes} minutos e só pode ser usada uma vez.`,
    '',
    'Se você não solicitou esta alteração, pode ignorar este e-mail com segurança.',
    '',
    '— Equipe PoupaJunto (Tech Minds · SENAI Jaú-SP · INTEGRA SENAI 2026)',
    'Ambiente de Simulação Educativa — Sem Movimentação de Dinheiro Real',
  ];

  const mimeMessage = [
    `To: ${toEmail.trim()}`,
    `Subject: ${encodeRfc2047Utf8(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    bodyLines.join('\r\n'),
  ].join('\r\n');

  return encodeBase64Url(mimeMessage);
}

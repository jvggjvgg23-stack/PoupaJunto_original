import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeGmailInput } from '../shared/gmailParser';
import { LocalDatabaseService, type KeyValueStorage } from './localDb';

function createPersistentMockStorage(): KeyValueStorage {
  const store = new Map<string, string>();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
  };
}

test('register, group creation, pact, and cycle simulation persist across reloads', () => {
  const storage = createPersistentMockStorage();
  const db1 = new LocalDatabaseService(storage);

  const reg = db1.register({
    email: 'novo.aluno@senai.br',
    password: 'Senha@123',
    display_name: 'Novo Aluno',
    institution: 'SENAI Jaú-SP · 1º DS',
  });
  assert.equal(reg.user.email, 'novo.aluno@senai.br');

  const created = db1.createGroup({
    name: 'Feira de Robótica',
    goal_description: 'Compra simulada de sensores',
    category: 'Equipamentos',
    target_amount: 1200,
    total_cycles: 3,
    cycle_frequency: 'mensal',
    delay_policy: 'Usar reserva coletiva por 1 ciclo',
    dropout_policy: 'Redistribuir saldo entre membros',
    surplus_policy: 'Investir no próximo projeto',
    reserve_percentage: 10,
    include_demo_peers: true,
  });
  assert.equal(created.group.status, 'pact_pending');

  const accepted = db1.acceptPact(created.group.id, true);
  assert.equal(accepted.group.status, 'active');

  const cycled = db1.simulateCycle(created.group.id, {});
  assert.equal(cycled.group.current_cycle, 1);

  // Simula fechamento e reabertura do navegador criando nova instância sobre o mesmo storage
  const db2 = new LocalDatabaseService(storage);
  const me = db2.me();
  assert.equal(me.user.email, 'novo.aluno@senai.br');

  const groupsAfterReload = db2.listGroups().groups;
  const persistedGroup = groupsAfterReload.find((g) => g.id === created.group.id);
  assert.ok(persistedGroup, 'Grupo recém-criado deve permanecer salvo após recarregar');
  assert.equal(persistedGroup.current_cycle, 1);
  assert.equal(persistedGroup.status, 'active');

  // Verifica que e-mails de boas-vindas e criação de grupo foram entregues na caixa local
  const inbox = db2.listInboxMessages();
  assert.ok(inbox.some((m) => m.subject.includes('Feira de Robótica')));
  assert.ok(inbox.some((m) => m.subject.includes('Conta criada com sucesso')));
});

test('local Google sign-in, password recovery to inbox, and resetPassword work offline', () => {
  const storage = createPersistentMockStorage();
  const db = new LocalDatabaseService(storage);

  const googleSession = db.loginWithGoogleLocal({
    email: 'estudante.google@gmail.com',
    name: 'Estudante Google',
  });
  assert.equal(googleSession.user.email, 'estudante.google@gmail.com');

  const rec = db.recoverPassword('estudante.google@gmail.com');
  assert.equal(rec.sentTo, 'estudante.google@gmail.com');
  assert.equal(rec.recoveryKey.length, 8);

  const inbox = db.listInboxMessages('chave de recuperação');
  assert.equal(inbox.length, 1);
  assert.ok((inbox[0].bodyText ?? '').includes(rec.recoveryKey));

  const reset = db.resetPassword({
    email: 'estudante.google@gmail.com',
    recoveryKey: rec.recoveryKey,
    newPassword: 'NovaSenha@2026',
  });
  assert.equal(reset.user.email, 'estudante.google@gmail.com');

  // Reinstancia para garantir persistência da nova senha
  const dbReloaded = new LocalDatabaseService(storage);
  const loggedIn = dbReloaded.login({
    email: 'estudante.google@gmail.com',
    password: 'NovaSenha@2026',
  });
  assert.equal(loggedIn.user.display_name, 'Estudante Google');
});

test('educator workshop PIN and superadmin pills persist across reloads', () => {
  const storage = createPersistentMockStorage();
  const db = new LocalDatabaseService(storage);

  db.login({ email: 'prof.marcos@senai.br', password: 'Senai@2026' });
  const ws = db.createWorkshop({ title: 'Oficina Teste Local', duration_minutes: 20 });
  assert.match(ws.workshop.pin, /^\d{6}$/);

  db.login({ email: 'superadmin@poupajunto.senai.br', password: 'TechMinds@2026' });
  const pillRes = db.createPill({
    title: 'Pílula Offline Permanente',
    content: 'Conteúdo salvo localmente.',
    category: 'Reserva',
    ods_tag: 'ODS 4 · Educação de Qualidade',
    cycle_trigger: 2,
  });

  const dbReloaded = new LocalDatabaseService(storage);
  const joined = dbReloaded.joinWorkshopByPin(ws.workshop.pin);
  assert.equal(joined.workshop.title, 'Oficina Teste Local');

  const overview = dbReloaded.getAdminOverview();
  assert.ok(overview.pills.some((p) => p.id === pillRes.pill.id));
});

test('normalizeGmailInput handles bare handles and full emails', () => {
  assert.equal(normalizeGmailInput('joao.silva'), 'joao.silva@gmail.com');
  assert.equal(normalizeGmailInput('  Maria@Gmail.com '), 'maria@gmail.com');
  assert.equal(normalizeGmailInput('prof@senai.br'), 'prof@senai.br');
  assert.equal(normalizeGmailInput('   '), '');
});

test('multi-account @gmail.com switching, compose/send, star, and trash persist across reloads', () => {
  const storage = createPersistentMockStorage();
  const db = new LocalDatabaseService(storage);

  db.loginWithGoogleLocal({ email: 'jvggjvgg23@gmail.com', name: 'Jvgg' });
  const jvggInbox = db.listInboxMessages('', 'inbox');
  assert.ok(jvggInbox.some((m) => m.subject.includes('jvggjvgg23@gmail.com')));

  // Conecta qualquer outro e-mail (informando apenas o prefixo sem @)
  const switched = db.connectMailbox('colega.teste');
  assert.equal(switched.email, 'colega.teste@gmail.com');
  const colleagueInbox = db.listInboxMessages('', 'inbox');
  assert.ok(colleagueInbox.some((m) => m.subject.includes('colega.teste@gmail.com')));

  // Envia e-mail para jvggjvgg23@gmail.com
  const sent = db.sendLocalEmail({
    to: 'jvggjvgg23@gmail.com',
    subject: 'Combinado da Formatura',
    bodyText: 'Oi Jvgg! Tudo certo para o Ciclo 3.',
  });
  assert.equal(sent.folder, 'sent');
  assert.equal(db.listInboxMessages('', 'sent').length, 1);

  // Volta para jvggjvgg23@gmail.com e verifica recebimento na Caixa de Entrada
  db.connectMailbox('jvggjvgg23@gmail.com');
  const received = db.listInboxMessages('Combinado da Formatura', 'inbox');
  assert.equal(received.length, 1);
  assert.equal(received[0].fromEmail, 'colega.teste@gmail.com');

  // Favorita, move outro para lixeira e restaura após recarregar
  const starred = db.toggleEmailStar(received[0].id);
  assert.equal(starred.starred, true);
  assert.ok(db.listInboxMessages('', 'starred').some((m) => m.id === received[0].id));

  db.moveEmailToTrash(received[0].id);
  assert.equal(db.listInboxMessages('Combinado da Formatura', 'inbox').length, 0);
  assert.equal(db.listInboxMessages('Combinado da Formatura', 'trash').length, 1);

  const dbReloaded = new LocalDatabaseService(storage);
  assert.equal(dbReloaded.getMailboxConnection()?.email, 'jvggjvgg23@gmail.com');
  assert.ok(
    dbReloaded.listSavedMailboxAccounts().some((a) => a.email === 'colega.teste@gmail.com')
  );
  dbReloaded.restoreEmailFromTrash(received[0].id);
  assert.equal(dbReloaded.listInboxMessages('Combinado da Formatura', 'inbox').length, 1);
});


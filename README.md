# PoupaJunto

> **Ambiente de Simulação Educativa — Sem Movimentação de Dinheiro Real**  
> Projeto desenvolvido pela equipe **Tech Minds (SENAI Jaú-SP)** para o **INTEGRA SENAI 2026**.

O **PoupaJunto** é uma plataforma educativa de organização financeira coletiva voltada para jovens de 16 a 24 anos. O aplicativo permite simular metas em grupo (como formaturas, viagens técnicas e projetos de turma), combinar pactos transparentes antes de iniciar os ciclos e testar cenários de imprevistos sem utilizar dinheiro real, CPF ou dados bancários.

---

## Principais Funcionalidades

- **Funcionamento 100% Local e Salvamento Permanente**: Opera sem necessidade de API keys, Supabase, Firebase ou serviços externos obrigatórios. Todos os dados (contas, grupos, pactos, simulações, configurações do simulador, pílulas e e-mails) são salvos automaticamente no `localStorage` do navegador.
- **Autenticação e Recuperação Local**:
  - Cadastro e login direto por e-mail e senha (sem verificação externa obrigatória).
  - Acesso rápido com contas de demonstração (**Estudante**, **Educador** e **Superadmin**).
  - **Entrar com o Google (Local)**: seleção ou cadastro instantâneo com qualquer endereço `@gmail.com` ou outro e-mail.
  - **Recuperar Senha**: geração de chave temporária de 8 caracteres entregue automaticamente na caixa de entrada interna do aplicativo.
- **Grupos Coletivos e Pactos de Regras**: Criação guiada de metas simuladas, exigência de aceite formal do pacto antes do Ciclo 1, Termômetro de Progresso, Fundo Reserva Coletivo e simulação ciclo a ciclo.
- **Simulador “E Se?”**: Análise interativa de cenários de atraso, desistência e percentual de reserva coletiva com persistência automática por grupo.
- **E-mails (Gmail Local)**: Caixa de mensagens completa no navegador com alternância entre múltiplas contas `@gmail.com`, suporte a qualquer endereço de e-mail, escrita (**Escrever**), resposta, encaminhamento, favoritos, busca, **Enviados** e **Lixeira**. *(Limitação: opera localmente no navegador, sem sincronização com servidores externos do Gmail).*
- **Modo Oficina (PIN)**: Sala educativa para turmas entrarem com código de 6 dígitos (ex.: `482910`) e educadores criarem novas oficinas.
- **Trilhas e Pílulas Educativas**: Conteúdos curtos alinhados aos **ODS 4 e ODS 8**.
- **Painel Superadmin**: Métricas agregadas da turma/instituição, gestão de perfis, moderação de grupos e gerenciamento de pílulas educativas.
- **PWA e Modo Escuro**: Suporte offline (`vite-plugin-pwa`), ícone **PoupaJ** e alternância entre tema claro e escuro.

---

## Contas de Demonstração

| Perfil | E-mail | Senha |
| :--- | :--- | :--- |
| **Estudante** | `ana.clara@aluno.senai.br` | `Aluno@2026` |
| **Educador** | `prof.marcos@senai.br` | `Senai@2026` |
| **Superadmin** | `superadmin@poupajunto.senai.br` | `TechMinds@2026` |

- **PIN de Oficina (Demo)**: `482910`

---

## Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS 4, Lucide React, Motion
- **PWA**: `vite-plugin-pwa`
- **Backend / Servidor de Desenvolvimento**: Node.js, Express (`server.ts`, porta `3000`)
- **Persistência no Cliente**: `localStorage` (`src/services/localDb.ts`)
- **Testes**: Node Test Runner com `tsx`

---

## Como Executar Localmente

### Pré-requisitos
- Node.js 20+ e npm

### Instalação e Execução

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento (porta 3000)
npm run dev
```

Acesse `http://localhost:3000` no navegador. Nenhuma variável de ambiente ou API key é obrigatória.

### Scripts Disponíveis

```bash
# Verificar tipos TypeScript
npm run lint

# Gerar build de produção
npm run build

# Executar todos os testes unitários
npx --yes tsx --test src/shared/simulation.test.ts src/shared/gmailParser.test.ts src/shared/recovery.test.ts src/services/localDb.test.ts
```

---

## Estrutura do Projeto

```text
├── public/                 # Ícone PoupaJ (icon.svg) e assets estáticos
├── server/                 # Rotas e utilitários do servidor Express local
├── server.ts               # Ponto de entrada do servidor (porta 3000)
└── src/
    ├── components/         # Telas e modais (Auth, Dashboard, Grupos, Simulador, E-mails, Superadmin, etc.)
    ├── services/           # Banco local persistente (localDb.ts), API cliente e caixa Gmail local
    └── shared/             # Regras de simulação, parser de e-mails, chaves de recuperação e tipos
```

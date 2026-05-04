# Backlog

## Estrategia De Entrega

As entregas devem ser pequenas e revisaveis. Cada bloco precisa deixar o projeto em um estado melhor, mesmo que ainda nao esteja completo.

Formato:

- `P0`: necessario para MVP utilizavel;
- `P1`: melhora validacao e confianca;
- `P2`: evolucao apos validar uso real.

## Milestone 0: Fundacao

Objetivo: preparar monorepo, padroes, tema e backend base.

### Mobile

- `MOB-001`: criar app Expo com TypeScript.
- `MOB-002`: configurar Expo Router.
- `MOB-003`: criar estrutura `src/components`, `src/features`, `src/theme`.
- `MOB-004`: implementar tokens iniciais de tema.
- `MOB-005`: criar componentes base `Screen`, `AppText`, `Button`, `Badge`, `ListItem`.
- `MOB-006`: criar shell de navegacao autenticada e publica.

### Backend

- `BE-001`: criar app Fastify com TypeScript.
- `BE-002`: configurar Prisma e PostgreSQL.
- `BE-003`: configurar validacao de env.
- `BE-004`: criar estrutura modular de backend.
- `BE-005`: criar healthcheck.
- `BE-006`: configurar logs estruturados.

### Shared

- `SH-001`: criar `packages/schemas`.
- `SH-002`: criar `packages/tsconfig`.
- `SH-003`: criar scripts raiz do monorepo.

## Milestone 1: Auth E Acesso

Objetivo: entrar no app e aplicar acesso por apartamento.

### Mobile

- `MOB-101`: tela de login.
- `MOB-102`: estado de sessao.
- `MOB-103`: rota protegida.
- `MOB-104`: tela inicial vazia para Host Admin.

### Backend

- `BE-101`: validar JWT do Supabase.
- `BE-102`: criar modelo `users`.
- `BE-103`: criar modelo `organizations`.
- `BE-104`: criar modelo `organization_memberships`.
- `BE-105`: criar middleware de auth.
- `BE-106`: criar helper de escopo por apartamento.

## Milestone 2: Apartamentos E Canais

Objetivo: Host Admin cadastra apartamentos e conecta fontes iCal.

### Mobile

- `MOB-201`: lista de apartamentos.
- `MOB-202`: formulario de apartamento.
- `MOB-203`: tela de detalhe do apartamento.
- `MOB-204`: formulario de fonte iCal.
- `MOB-205`: UI de status de sincronizacao.

### Backend

- `BE-201`: CRUD de apartamentos com permissao.
- `BE-202`: CRUD de fontes iCal.
- `BE-203`: criptografar URL iCal em repouso.
- `BE-204`: endpoints de listagem por escopo autorizado.
- `BE-205`: endpoint de sync manual.

## Milestone 3: Sync iCal E Reservas

Objetivo: importar reservas e exibir agenda operacional.

### Mobile

- `MOB-301`: lista de reservas proximas.
- `MOB-302`: Today Board.
- `MOB-303`: detalhe de reserva.
- `MOB-304`: filtros por data, apartamento e status.
- `MOB-305`: pull-to-refresh.

### Backend

- `BE-301`: parser iCal.
- `BE-302`: job `sync_ical_source`.
- `BE-303`: persistir reservas com upsert idempotente.
- `BE-304`: registrar `sync_runs`.
- `BE-305`: endpoint de reservas filtradas.
- `BE-306`: status operacional derivado.

## Milestone 4: Tarefas

Objetivo: criar e acompanhar tarefas antes/depois da estadia.

### Mobile

- `MOB-401`: lista de tarefas no Today Board.
- `MOB-402`: detalhe de tarefa.
- `MOB-403`: criar tarefa manual.
- `MOB-404`: marcar tarefa como `Done`.
- `MOB-405`: marcar tarefa como `Not done`.

### Backend

- `BE-401`: modelos `tasks` e `task_templates`.
- `BE-402`: CRUD basico de tarefas.
- `BE-403`: regras de permissao por role.
- `BE-404`: gerar tarefas a partir de reserva.
- `BE-405`: auditoria de mudanca de status.

## Milestone 5: Equipe E Convites

Objetivo: Host Admin convida e controla acesso.

### Mobile

- `MOB-501`: lista de membros.
- `MOB-502`: tela de convite.
- `MOB-503`: tela de aceitar convite.
- `MOB-504`: UI de apartamentos atribuidos.

### Backend

- `BE-501`: modelo `invitations`.
- `BE-502`: endpoint de criar convite.
- `BE-503`: endpoint de aceitar convite.
- `BE-504`: modelo `apartment_memberships`.
- `BE-505`: regras de acesso para `co_host` e `team`.

## Milestone 6: Beta Interno

Objetivo: testar com operacao real.

- `QA-001`: seed de exemplo com 4 apartamentos.
- `QA-002`: roteiro de teste do Host Admin.
- `QA-003`: roteiro de teste do Co-host.
- `QA-004`: roteiro de teste do Team.
- `QA-005`: checklist de bugs e feedback.
- `QA-006`: configuracao de Sentry.

## Primeiras Entregas Para Os Agentes

### Agente Mobile

Primeira entrega pequena:

- criar app Expo no monorepo;
- configurar TypeScript;
- criar pasta de tema;
- implementar `Screen`, `AppText`, `Button` e `Badge`;
- criar tela inicial mockada do Today Board usando tokens.

### Agente Backend

Primeira entrega pequena:

- criar app Fastify no monorepo;
- configurar TypeScript;
- criar healthcheck;
- configurar env validation;
- preparar Prisma com schema inicial vazio ou minimo;
- criar estrutura modular base.

## Criterio De Pronto Para Primeira Rodada

- `pnpm install` funciona na raiz.
- `pnpm lint` ou comando equivalente existe.
- mobile abre no Expo com tela mockada.
- backend responde `GET /health`.
- nenhum componente usa cor hexadecimal fora do tema.
- nenhum endpoint de dominio existe sem auth planejada.

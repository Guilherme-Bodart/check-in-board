# Check-In Board Implementation Blueprint

## Status

Documento central de planejamento antes da implementacao.

Nome do produto: `Check-In Board`

Objetivo: criar um app mobile-first para operacao diaria de reservas, check-ins, check-outs e tarefas em multiplos apartamentos e canais.

## Resumo Do Produto

O Check-In Board ajuda Host Admins e equipes pequenas de aluguel por temporada a enxergar o que precisa acontecer hoje em cada apartamento.

O MVP vai validar uma rotina simples:

- cadastrar apartamentos;
- conectar multiplos canais por apartamento via iCal;
- visualizar reservas atuais e proximas;
- criar e acompanhar tarefas antes e depois da estadia;
- limitar acesso por papel e por apartamento.

## Personas E Permissoes

### Host Admin

Exemplo: sua irma, que gerencia o apartamento dela e apartamentos de outros proprietarios.

Pode:

- ver todos os apartamentos da operacao;
- cadastrar apartamentos;
- conectar canais iCal;
- criar e editar tarefas;
- convidar membros;
- atribuir acesso por apartamento;
- acompanhar status de sync.

### Co-host

Exemplo: proprietario ou pessoa que acompanha apenas os proprios apartamentos.

Pode:

- ver apenas apartamentos atribuidos;
- ver reservas e tarefas desses apartamentos;
- acompanhar como a operacao esta indo.

Nao pode:

- convidar equipe;
- gerenciar canais;
- editar configuracoes;
- gerenciar outros usuarios.

### Team

Exemplo: limpeza ou apoio operacional.

Pode:

- ver contexto minimo de tarefas atribuidas;
- marcar tarefa como `Done` ou `Not done`.

Nao pode:

- gerenciar apartamentos;
- ver dados alem do necessario;
- convidar usuarios;
- configurar canais.

## Decisoes Fechadas

- Produto: `Check-In Board`
- Plataforma: mobile-only no MVP
- App: `Expo + React Native + TypeScript`
- Backend: `Node.js + TypeScript + Fastify`
- Banco: `PostgreSQL`
- ORM: `Prisma`
- Auth: `Supabase Auth`
- Jobs: `BullMQ + Redis`
- Fonte inicial de reservas: multiplos iCal por apartamento
- Design system: tokens centralizados em `apps/mobile/src/theme`
- Idioma inicial: ingles aceitavel, produto pensado para Brasil
- Offline: fora do MVP
- Plano comercial: gratuito no beta inicial
- Primeiro usuario real: operacao da sua irma

## Fora Do MVP

- painel web completo;
- integracoes oficiais com Airbnb, Booking ou PMS;
- precificacao dinamica;
- financeiro e repasses;
- chat com hospede;
- automacoes avancadas;
- app offline;
- permissoes customizadas por acao;
- relatorios avancados.

## Arquitetura Inicial

```text
apps/mobile
  Expo app
  Expo Router
  TanStack Query
  Theme tokens

apps/backend
  Fastify API
  Prisma
  PostgreSQL
  BullMQ workers
  iCal integration

packages/schemas
  Zod contracts shared by mobile and backend
```

Fluxo principal:

1. Host Admin cria conta.
2. Host Admin cadastra apartamentos.
3. Host Admin adiciona fontes iCal por apartamento.
4. Worker sincroniza iCal periodicamente.
5. Backend normaliza reservas.
6. App mostra Today Board, reservas e tarefas.
7. Team marca tarefas como feitas ou nao feitas.

## Modelo De Dados Inicial

Entidades P0:

- `users`
- `organizations`
- `organization_memberships`
- `apartments`
- `apartment_memberships`
- `ical_sources`
- `reservations`
- `tasks`
- `task_templates`
- `invitations`
- `sync_runs`
- `audit_logs`

Regra central:

- permissao efetiva sempre passa por `apartment_memberships`;
- todas as queries de dominio filtram pelo escopo autorizado do usuario;
- datas ficam em UTC;
- timezone fica no apartamento.

## Design System

O design system fica documentado em [design-system.md](docs/design-system.md).

Regra mais importante:

- nenhuma tela deve usar cor hexadecimal diretamente;
- cores, tipografia, espacamento e radius devem vir de `theme`;
- botoes e badges devem ser componentes reutilizaveis;
- status operacional deve usar tokens semanticos.

Isso permite trocar a paleta dos botoes em um unico lugar e refletir no app inteiro.

## Padroes De Engenharia

Os padroes ficam documentados em [engineering-standards.md](docs/engineering-standards.md).

Principios obrigatorios:

- TypeScript strict;
- Zod em contratos;
- Fastify modular;
- Prisma migrations;
- logs estruturados;
- timeouts e retries em iCal;
- autorizacao por apartamento;
- checks antes de concluir entregas.

## Backlog

O backlog fatiado fica em [backlog.md](docs/backlog.md).

Primeiras milestones:

- Fundacao;
- Auth e acesso;
- Apartamentos e canais;
- Sync iCal e reservas;
- Tarefas;
- Equipe e convites;
- Beta interno.

## Agentes

O plano de trabalho dos agentes fica em [agent-workflow.md](docs/agent-workflow.md).

Divisao:

- Lider tecnico: planejamento, revisao, integracao e coordenacao.
- Agente Mobile: `apps/mobile`.
- Agente Backend: `apps/backend`.

Primeira rodada apos publicacao:

- Mobile cria app Expo, tema e Today Board mockado.
- Backend cria Fastify, healthcheck, env validation e Prisma base.

## Checklist Antes De Codar

- Documentos principais versionados.
- Repositorio publicado no GitHub.
- Backlog P0 revisado.
- Agentes com escopo separado.
- Design system definido.
- Padroes de engenharia definidos.
- Primeiras tarefas pequenas delegadas.

## Criterios De Sucesso Do MVP

- Host Admin usa o app diariamente para ver operacao.
- Reservas aparecem consolidadas por apartamento.
- Tarefas substituem parte da coordenacao manual.
- Co-host ve apenas seus apartamentos.
- Team consegue marcar tarefa sem confusao.
- Sync iCal e confiavel o suficiente para validacao inicial.

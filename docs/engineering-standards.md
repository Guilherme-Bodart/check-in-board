# Engineering Standards

## Objetivo

Definir padroes de engenharia antes do codigo para que mobile, backend e pacotes compartilhados crescam com consistencia.

## Stack Final Do MVP

- Monorepo: `pnpm workspaces`
- Mobile: `Expo`, `React Native`, `TypeScript`, `Expo Router`
- Backend: `Fastify`, `TypeScript`, `Prisma`, `PostgreSQL`
- Jobs: `BullMQ`, `Redis`
- Auth: `Supabase Auth`
- Schemas compartilhados: `Zod`
- Observabilidade: `Sentry`, `Pino`, correlation id
- Build mobile: `EAS`
- Deploy backend inicial: `Render`

## Estrutura Do Repositorio

```text
apps/
  mobile/
  backend/
packages/
  schemas/
  config/
  tsconfig/
docs/
```

## Principios De Codigo

- Preferir simplicidade a arquitetura prematura.
- Validar entradas e saidas em fronteiras de confianca.
- Manter autorizacao por apartamento em todo endpoint.
- Criar modulos pequenos e coesos.
- Evitar estado global no mobile quando `TanStack Query` resolve.
- Evitar strings magicas para roles, status e providers.
- Tratar operacoes externas com timeout, retry limitado e logs.

## TypeScript

Regras:

- `strict` ligado.
- Sem `any` salvo justificativa local.
- Tipos de dominio compartilhados devem vir de `packages/schemas`.
- DTOs de API devem ter schema Zod.
- Evitar tipos duplicados entre mobile e backend.

## Mobile

Padroes:

- telas em `apps/mobile/app`;
- features em `apps/mobile/src/features`;
- componentes base em `apps/mobile/src/components`;
- tema em `apps/mobile/src/theme`;
- chamadas API em services/hooks por feature.

Estado:

- dados de servidor: `TanStack Query`;
- estado local simples: estado React;
- estado local compartilhado e efemero: `Zustand`, apenas quando necessario;
- sessao: provedor de auth + armazenamento seguro.

Forms:

- `React Hook Form`;
- `Zod` para validacao;
- mensagens curtas e especificas.

## Backend

Padroes:

- `src/modules/<module>` para rotas, service, repository e schemas.
- `src/shared` para erros, logger, authz, env e utilitarios comuns.
- `src/jobs` para definicao e processamento de filas.
- `src/integrations` para iCal, Supabase, Expo Push e futuros provedores.

Cada modulo deve tentar seguir:

```text
module/
  routes.ts
  service.ts
  repository.ts
  schemas.ts
  types.ts
```

## API

Regras:

- REST simples no MVP.
- JSON em todas as respostas.
- Erros padronizados.
- Paginacao para listas que podem crescer.
- Filtros explicitos por data, apartamento e status.
- Nunca confiar no `apartment_id` enviado sem checar permissao.

Formato de erro:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this apartment."
  }
}
```

## Autorizacao

Roles:

- `host_admin`
- `co_host`
- `team`

Regras:

- `host_admin`: gerencia organizacao, apartamentos, canais, membros e tarefas.
- `co_host`: visualiza apartamentos atribuidos e acompanha operacao.
- `team`: ve contexto minimo e marca tarefa como feita ou nao feita.

Toda query de dominio deve receber um escopo autorizado:

```ts
const scope = await authorization.getApartmentScope(userId)
```

## Banco De Dados

Regras:

- PostgreSQL como fonte da verdade.
- Prisma migrations versionadas.
- Soft delete para entidades de configuracao.
- Timestamps `created_at` e `updated_at` em entidades principais.
- Timezone por apartamento.
- Datas armazenadas em UTC.

## iCal

Regras:

- parsing defensivo;
- timeout curto;
- retry com exponential backoff e jitter;
- idempotencia por `ical_source_id + external_event_key`;
- nao deletar reserva imediatamente quando sumir do feed;
- guardar status de sync para a UI;
- nunca logar URL iCal completa.

## Tarefas

Estados iniciais:

- `pending`
- `done`
- `not_done`
- `cancelled`

Tipos iniciais:

- `pre_check_in`
- `post_check_out`
- `cleaning`
- `manual`

Regras:

- tarefa pode estar ligada a reserva ou ser manual;
- `team` so altera status permitido;
- historico/auditoria deve registrar mudanca de status.

## Testes

MVP minimo:

- backend: testes unitarios de permissao, parser iCal e services principais;
- backend: testes de integracao para endpoints P0;
- mobile: testes leves de componentes criticos quando houver regra;
- validar manualmente fluxos de onboarding, sync e tarefas no app.

Ferramentas sugeridas:

- `Vitest` no backend e packages;
- `React Native Testing Library` no mobile;
- `Prisma` com banco de teste para integracao.

## Qualidade

Comandos esperados no monorepo:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm format
```

O projeto deve ter:

- ESLint;
- Prettier;
- TypeScript strict;
- checagem de env;
- CI basico quando o repositorio estiver estavel.

## Secrets E Ambientes

Nunca commitar `.env`.

Arquivos permitidos:

- `.env.example`
- `.env.local.example`

Variaveis devem ser validadas no boot.

Ambientes:

- `local`
- `staging`
- `production`

## Git

Branches sugeridas:

- `main`: base estavel;
- `codex/planning-foundation`: planejamento inicial;
- `codex/mobile-foundation`: app Expo inicial;
- `codex/backend-foundation`: backend inicial.

Commits:

- pequenos;
- mensagem no imperativo ou descricao curta;
- sem misturar planejamento, mobile e backend em um commit gigante quando isso puder ser evitado.

## Revisao

Antes de concluir uma entrega:

- rodar checks relevantes;
- revisar permissao e vazamento de dados;
- revisar estados de erro/loading;
- conferir se componentes usam design tokens;
- atualizar docs quando uma decisao mudar.

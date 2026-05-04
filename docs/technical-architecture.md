# Arquitetura Técnica

## Objetivo

Definir a arquitetura inicial para um aplicativo mobile-only de operação de reservas e tarefas antes/depois da estadia, com foco em simplicidade no MVP e base sólida para crescimento.

## Premissas

- Cliente principal: app mobile com React Native via Expo.
- Backend principal: API e workers em Node.js com TypeScript.
- Escopo do MVP: reservas vindas de múltiplos canais por apartamento via iCal.
- Perfis iniciais: Host Admin, Co-host e Team.
- Permissões devem ser controladas por apartamento.
- Não haverá suporte offline no MVP.
- O produto precisa continuar simples para operação diária, mas sem bloquear futuras integrações mais robustas.

## Stack Recomendada

### Mobile

- `Expo` + `React Native` + `TypeScript`
- `Expo Router` para navegação baseada em arquivos
- `TanStack Query` para cache de servidor, refetch e invalidação
- `Zustand` apenas para estado local efêmero de UI
- `React Hook Form` + `Zod` para formulários e validação
- `expo-secure-store` para armazenamento seguro de sessão
- `expo-notifications` para push notifications
- `Sentry` para crash reporting e erro em runtime

### Backend

- `Fastify` + `TypeScript` para API HTTP
- `Zod` para validação de entrada/saída em bordas de confiança
- `Prisma` como ORM
- `PostgreSQL` como banco principal
- `Redis` + `BullMQ` para filas, retries e jobs assíncronos
- `Sentry` para erros
- `Pino` para logs estruturados
- `OpenTelemetry` preparado desde o início para traces e métricas

### Infraestrutura

- `Expo EAS Build` para builds mobile
- `Expo EAS Update` para rollout de atualizações OTA por ambiente
- Plataforma de deploy com serviços separados para `api`, `worker` e `cron`
- `Render` como recomendação inicial para backend gerenciado, com Postgres, Redis, worker e cron

## Comparação Curta De Alternativas

### Mobile

- `Expo` recomendado: melhor velocidade de entrega no MVP, suporte maduro para notificações, builds e distribuição.
- `React Native bare` alternativa: dá mais controle nativo, mas aumenta custo operacional cedo demais.
- `Flutter` alternativa: excelente performance, mas duplicaria esforço tecnológico fora do stack TypeScript.

### Backend

- `Fastify` recomendado: menor overhead, ótima performance e encaixe natural com serviços enxutos.
- `NestJS` alternativa: melhor para times grandes e forte convenção, mas adiciona mais estrutura do que o MVP precisa.
- `Express` alternativa: simples e conhecido, porém exige mais disciplina manual para validação, tipagem e performance.

### Banco E Acesso A Dados

- `PostgreSQL + Prisma` recomendado: modelo relacional forte para permissões por apartamento, reservas, tarefas e auditoria.
- `Firestore` alternativa: acelera o início, mas complica consultas relacionais, auditoria e regras mais ricas de autorização.
- `Drizzle` alternativa: mais próximo de SQL e muito eficiente, mas Prisma tende a acelerar onboarding e produtividade inicial.

### Autenticação

- `Supabase Auth` recomendado: reduz trabalho de segurança, integra bem com Expo e emite JWTs fáceis de validar no backend.
- `Clerk/Auth0` alternativa: ótima experiência e recursos avançados, mas com custo e lock-in maiores no começo.
- Auth própria não recomendada no MVP: aumenta risco de segurança sem vantagem relevante agora.

## Arquitetura Inicial

```text
Mobile App (Expo)
  -> API Fastify
      -> PostgreSQL
      -> Redis / BullMQ
      -> Sentry / Logs / Traces

Cron de plataforma
  -> enfileira jobs

Worker BullMQ
  -> sincroniza iCal
  -> recalcula tarefas
  -> envia notificações
```

### Princípios

- Monólito modular no backend, evitando microserviços no MVP.
- API stateless.
- Toda operação de longa duração sai da request e vai para fila.
- Banco relacional como fonte única da verdade.
- Cache no cliente apenas para experiência de uso, nunca como origem de dados.
- Sem offline: o app sempre depende de conectividade para leitura e mutação.

### Módulos Iniciais Do Backend

- `auth`
- `users`
- `organizations`
- `apartments`
- `memberships`
- `ical-sources`
- `reservations`
- `tasks`
- `notifications`
- `sync`
- `audit`

## Fluxo De Sincronização iCal

Cada apartamento pode possuir múltiplas fontes iCal, normalmente uma por canal/listing.

### Fluxo recomendado

1. Um job agendado identifica apartamentos com sincronização ativa.
2. Para cada fonte iCal, o sistema enfileira `sync_ical_source`.
3. O worker busca o arquivo ICS com timeout curto, retry com exponential backoff e jitter.
4. O parser converte `VEVENT` em uma estrutura canônica interna.
5. O sistema gera uma chave externa estável por evento, preferindo `UID`; se necessário, usa fallback determinístico.
6. Reservas são criadas ou atualizadas por `ical_source_id + external_event_key`.
7. Mudanças relevantes disparam reconciliação de tarefas daquele período.
8. O resultado da sincronização fica registrado em `sync_runs`, com contagem de eventos, duração e erro, se houver.

### Regras importantes

- Não apagar reservas imediatamente quando um evento some do feed; primeiro marcar como `missing_in_feed` e confirmar a remoção apenas após N sincronizações consecutivas.
- Preservar o conteúdo bruto do evento parseado para depuração.
- Deduplicar por fonte, não globalmente entre canais, salvo regra explícita futura.
- Tratar iCal como origem eventual e imperfeita; atrasos e inconsistências são esperados.

### Frequência inicial

- Sincronização recorrente a cada 10 minutos por fonte ativa.
- Reprocessamento manual por Host Admin.
- Job noturno de reconciliação para detectar drift entre reservas e tarefas.

## Modelo De Dados Inicial

### Entidades Principais

### `organizations`

- Agrupa apartamentos, usuários e configurações da operação.

### `users`

- Perfil interno da aplicação vinculado ao provedor de autenticação.

Campos sugeridos:

- `id`
- `auth_provider`
- `auth_subject`
- `full_name`
- `email`
- `phone`
- `status`
- `created_at`
- `updated_at`

### `organization_memberships`

- Relaciona usuário à organização.

Campos sugeridos:

- `organization_id`
- `user_id`
- `role`
- `status`

### `apartments`

Campos sugeridos:

- `id`
- `organization_id`
- `name`
- `timezone`
- `check_in_time_default`
- `check_out_time_default`
- `status`

### `apartment_memberships`

- Permissão efetiva por apartamento.

Campos sugeridos:

- `apartment_id`
- `user_id`
- `role`
- `can_view`
- `can_update_task_status`
- `can_manage_integrations`

### `ical_sources`

- Uma fonte por calendário/canal conectado.

Campos sugeridos:

- `id`
- `apartment_id`
- `provider`
- `label`
- `ical_url_encrypted`
- `sync_enabled`
- `last_success_at`
- `last_failure_at`
- `etag`
- `last_modified`

### `reservations`

Campos sugeridos:

- `id`
- `apartment_id`
- `ical_source_id`
- `external_event_key`
- `external_uid`
- `status`
- `guest_name`
- `starts_at`
- `ends_at`
- `raw_summary`
- `raw_payload`
- `last_seen_in_feed_at`
- `created_at`
- `updated_at`

### `task_templates`

- Define tarefas padrão por tipo de evento operacional.

Campos sugeridos:

- `id`
- `organization_id`
- `name`
- `trigger_type`
- `offset_minutes`
- `default_assignee_role`
- `checklist_schema`
- `active`

### `tasks`

Campos sugeridos:

- `id`
- `apartment_id`
- `reservation_id`
- `task_template_id`
- `title`
- `description`
- `status`
- `due_at`
- `completed_at`
- `completed_by_user_id`
- `assigned_user_id`
- `result`
- `created_at`
- `updated_at`

### `device_push_tokens`

Campos sugeridos:

- `id`
- `user_id`
- `platform`
- `expo_push_token`
- `last_seen_at`
- `revoked_at`

### `sync_runs`

Campos sugeridos:

- `id`
- `ical_source_id`
- `started_at`
- `finished_at`
- `status`
- `events_seen`
- `reservations_created`
- `reservations_updated`
- `error_code`
- `error_message`

### `audit_logs`

Campos sugeridos:

- `id`
- `organization_id`
- `actor_user_id`
- `apartment_id`
- `entity_type`
- `entity_id`
- `action`
- `metadata`
- `created_at`

## Estratégia De Autenticação E Autorização

### Autenticação

- Provedor recomendado: `Supabase Auth`.
- Fluxo inicial: magic link ou OTP por e-mail.
- Sessão armazenada com `expo-secure-store`.
- Backend valida JWT assinado pelo provedor e faz mapping para `users`.
- Rotacionar refresh tokens conforme política do provedor.

### Autorização

- Modelo principal: RBAC por apartamento.

Papéis iniciais recomendados:

- `host_admin`: gerencia apartamentos, fontes iCal, usuários e tarefas.
- `co_host`: visualização operacional dos apartamentos permitidos.
- `team`: leitura e atualização de status de tarefa nos apartamentos permitidos.

### Regras práticas

- Toda request autenticada resolve o conjunto de apartamentos permitidos do usuário.
- Queries sempre filtram por `apartment_id` autorizado.
- Mutações de integrações e permissões são exclusivas de `host_admin`.
- `team` pode marcar `feito` e `não feito`, mas não altera integração, configuração ou permissões.
- Registrar ações sensíveis em `audit_logs`.

## Jobs E Agendamento

### Estratégia

- Não usar `setInterval` dentro da API.
- Usar cron da plataforma apenas para disparar jobs-raiz.
- Usar `BullMQ` para processamento real, retries, concorrência e rastreabilidade.

### Jobs iniciais

- `enqueue_active_ical_syncs`
- `sync_ical_source`
- `reconcile_reservation_tasks`
- `send_due_task_notifications`
- `nightly_consistency_check`
- `cleanup_revoked_push_tokens`

### Políticas

- Retries com exponential backoff e jitter.
- Idempotência por chave de negócio sempre que possível.
- Dead-letter lógico via status de falha persistido em banco e alerta para admins.

## Notificações

### MVP

- Push notifications via `expo-notifications`.
- Notificações in-app baseadas no mesmo payload de domínio.

### Eventos recomendados

- tarefa criada para usuário
- tarefa próxima do vencimento
- tarefa vencida
- falha repetida de sincronização iCal para Host Admin

### Decisões de produto/técnica

- Push token por dispositivo em `device_push_tokens`.
- Respeitar opt-in explícito do usuário.
- Payloads enxutos, sem dados sensíveis em texto aberto.
- Centralizar templates de notificação no backend.

## Observabilidade

### MVP recomendado

- `Pino` para logs estruturados em JSON
- `Sentry` no mobile e backend para erros e stack traces
- Correlation ID por request e propagação para jobs

Indicadores iniciais de dashboard:

- taxa de sync com sucesso
- duração média de sync
- jobs falhos por tipo
- backlog da fila

### Preparação para crescimento

- Instrumentar backend com `OpenTelemetry`.
- Exportar traces e métricas para um provedor OTLP-compatible quando o volume justificar.

Alertas iniciais:

- falha consecutiva de sync por fonte
- aumento do atraso da fila
- erro de autenticação em massa

## Segurança

- Criptografar `ical_url` em repouso.
- Nunca expor segredos em logs.
- Timeouts curtos e retries limitados em chamadas externas.
- Rate limiting na API.
- Validação estrita com `Zod` em payloads externos e internos.
- Segregar secrets por ambiente.
- Usar MFA para contas administrativas quando habilitado pelo provedor.
- Minimizar PII persistida de reservas; não depender de nome de hóspede para regras de negócio.
- App sem offline reduz superfície local, mas sessões e tokens devem permanecer em armazenamento seguro.

## Deploy

### Mobile

- `EAS Build` para gerar builds de desenvolvimento, staging e produção.
- `EAS Update` para hotfixes OTA compatíveis com a versão nativa.

Canais sugeridos:

- `preview`
- `staging`
- `production`

### Backend

- Serviço `api`
- Serviço `worker`
- Serviço `cron`
- Banco `PostgreSQL`
- Fila/cache `Redis`

### Recomendação inicial

- Deploy do backend em `Render`.
- Manter tudo conteinerizado com Docker para portabilidade futura.
- Evoluir para IaC mais forte apenas quando houver mais ambientes, compliance ou equipe maior.

## Ambientes

### `local`

- Docker Compose com Postgres e Redis
- API e worker rodando localmente
- app Expo apontando para backend de desenvolvimento

### `staging`

- Ambiente o mais próximo possível de produção
- Base e filas isoladas
- EAS channel `staging`
- usado para validar sync, permissões e notificações antes de promover

### `production`

- dados reais
- monitoramento e alertas ativos
- acesso administrativo restrito

## Riscos Técnicos

- iCal é uma integração limitada e eventual; pode haver atraso, duplicidade e campos pobres.
- Alguns canais alteram o comportamento do feed sem aviso, exigindo parser defensivo.
- Remoção prematura de reservas por falhas transitórias pode quebrar a operação se não houver janela de confirmação.
- Permissão por apartamento precisa ser aplicada em todas as queries; qualquer atalho vira risco de vazamento.
- Push notifications dependem de credenciais móveis, tokens válidos e tratamento de revogação.
- Sem offline, a percepção de lentidão em rede ruim pode afetar o time operacional; a UX precisa priorizar loading states, retry e refetch claros.

## Sugestão De Estrutura De Projeto

### Monorepo

Recomendado usar `pnpm workspaces` com separação por apps e packages compartilhados.

```text
/apps
  /mobile
  /backend
/packages
  /config
  /schemas
  /typescript-config
```

### Mobile

```text
apps/mobile
  /app
  /src
    /components
    /features
    /hooks
    /lib
    /stores
    /services
    /theme
    /types
```

Sugestão de features:

- `auth`
- `apartments`
- `reservations`
- `tasks`
- `notifications`
- `settings`

### Backend

```text
apps/backend
  /src
    /app
    /modules
      /auth
      /organizations
      /apartments
      /memberships
      /ical-sources
      /reservations
      /tasks
      /notifications
      /sync
      /audit
    /db
    /jobs
    /integrations
      /ical
      /expo
    /shared
      /errors
      /logger
      /security
      /telemetry
```

### Pacotes compartilhados

- `packages/schemas`: contratos Zod compartilhados entre mobile e backend.
- `packages/config`: env parsing, constantes e feature flags.
- `packages/typescript-config`: base comum de TS.

## Decisões Recomendadas Para O MVP

- Construir mobile com Expo e Expo Router.
- Construir backend como monólito modular em Fastify.
- Usar PostgreSQL + Prisma desde o início.
- Usar Supabase Auth para não reinventar autenticação.
- Sincronizar iCal por jobs assíncronos com BullMQ.
- Lançar notificações push apenas para eventos operacionais críticos.
- Manter autorização por apartamento como regra central de arquitetura, não como detalhe de tela.

## Evoluções Futuras Esperadas

- Substituir parte do iCal por integrações diretas com PMS/channel manager quando fizer sentido.
- Adicionar atribuição mais rica de tarefas por time/escala.
- Criar trilha de auditoria mais detalhada para operação.
- Introduzir analytics operacionais e SLAs por tarefa.
- Avaliar read models ou busca dedicada se o volume operacional crescer muito.

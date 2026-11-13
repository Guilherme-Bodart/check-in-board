# Check-In Board — Arquivo Mestre do Projeto (`project-master.md`)

> **Fonte Única da Verdade sobre o Estado Atual, Arquitetura e Padrões do Projeto.**  
> Documentos complementares ativos:
> - [Backlog Futuro (`docs/backlog.md`)](file:///c:/Users/Inbazz2/Documents/GitHub/check-in-board/docs/backlog.md) — Evoluções candidatas (o que pode ou não entrar no futuro).
> - [Workflow de Agentes & Orquestração (`docs/agent-workflow.md`)](file:///c:/Users/Inbazz2/Documents/GitHub/check-in-board/docs/agent-workflow.md) — Como o Orquestrador delega tarefas aos agentes e escolhe o modelo ideal.
> - [Design System & Arquitetura de UI (`docs/DESIGN.md`)](file:///c:/Users/Inbazz2/Documents/GitHub/check-in-board/docs/DESIGN.md) — Especificação visual *Carbon Enterprise* (Mobile-First & Desktop).

---

## 1. Visão Geral do Produto Hoje

O **Check-In Board** é um SaaS operacional e financeiro para gestores de imóveis de temporada (anfitriões profissionais, co-anfitriões e administradoras). Ele centraliza a operação de múltiplos apartamentos e proprietários, unificando reservas importadas via iCal (Airbnb, Booking, etc.) e reservas diretas/manuais, tarefas operacionais de limpeza/manutenção, controle de equipe com permissões por imóvel e apuração financeira com fechamento de repasses.

### Direção Oficial Atual e Regras de Produto Cravadas
- **`apps/web` (Next.js App Router — Desktop + Web-Mobile Simplificado):** É o **único frontend principal**.
  - **Desktop:** Visão completa de gestão, tabelas densas, demonstrativos A4 e configurações avançadas.
  - **Web-Mobile (Celular):** Experiência **enxuta, simples e direta**, com menos elementos por tela para consulta e ação rápida (deixando análises densas para o Desktop).
  - **App Nativo (`apps/mobile`) congelado:** Não investir tempo no app Expo no momento; o foco 100% mobile é o **Web-Mobile**.
- **Público e Permissões (Apenas Admins e Donos de Imóveis):**
  - O sistema é voltado **exclusivamente para gestores e proprietários de apartamentos** (sem perfil operacional de limpeza/terceirizados logando na plataforma).
  - **`Admin-Admin` (`host_admin`):** Vê todos os apartamentos, todos os proprietários e todo o financeiro consolidado.
  - **`Admin-Proprietário` (`co_host` / Convidado Dono de Apartamento):** Vê **apenas os seus próprios apartamentos** e o **financeiro/receitas/despesas estritamente dos seus próprios apartamentos**.
- **Dinheiro Apenas Informativo/Gerencial:**
  - O Check-In Board **não processa pagamentos** (sem gateway, sem movimentação bancária dentro da plataforma). Todos os valores registrados são apenas para controle gerencial e prestação de contas entre o gestor e o proprietário.
- **Sincronização iCal Econômica (Trigger no Acesso com Cooldown de 1h) & Notificações com Diff:**
  - **Zero custo de tempo real / background 24/7:** O sync automático roda **apenas quando o usuário entra no sistema**, respeitando uma trava mínima de **1 hora (cooldown)** entre sincronizações automáticas.
  - **Notificações Inteligentes (Sem Spam):** Só gera notificação na página de notificações se o sync trouxer **novidades reais** (ex: *"3 novas reservas"*, *"1 reserva cancelada"*) ou se ocorrer **falha/erro**. Se sincronizar e não houver nenhuma mudança nas reservas, nenhuma notificação aparece.
- **`apps/backend-spring` (Java 21 + Spring Boot):** É o **único backend oficial** e fonte única da verdade.

---

## 2. Estrutura do Monorepo (`pnpm workspaces`)

```text
check-in-board/
├── apps/
│   ├── backend-spring/       # API Oficial (Java 21, Spring Boot, Security JWT, JPA, Flyway, iCal4j)
│   ├── web/                  # SaaS Principal (Next.js App Router, Tailwind v4, Radix/shadcn, Recharts)
│   ├── finance-mvp/          # MVP Financeiro Rápido (Next.js)
│   └── mobile/               # App Nativo complementar (Expo / React Native)
├── packages/
│   ├── design-system/        # Tokens CSS (--cib-*) e constantes visuais compartilhadas
│   └── tsconfig/             # Configurações base de TypeScript
└── docs/
    ├── project-master.md     # Este arquivo mestre (estado atual, arquitetura e padrões)
    ├── backlog.md            # Backlog de evoluções futuras (opcionais/candidatas)
    ├── agent-workflow.md     # Workflow do Orquestrador, agentes e seleção de modelos
    └── DESIGN.md             # Regras visuais, responsividade e componentes (Carbon Enterprise)
```

---

## 3. O Que Já Está Implementado e Funcionando

### 3.1 Backend Oficial (`apps/backend-spring`)
Construído em **Java 21 + Spring Boot**, estruturado por domínio (`package-by-feature`) e versionado com **14 migrações Flyway (`V1` a `V14`)**:

1. **Autenticação & Segurança (`modules/auth`, `V1`, `V2`):**
   - `POST /auth/sign-up`, `POST /auth/sign-in`, `GET /auth/me`.
   - `POST /auth/change-password`, `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`.
   - Autenticação stateless via JWT (HS256), senhas com BCrypt e tokens de reset com hash SHA-256.
   - Criação automática de `Organization`, `OrganizationMembership` (`host_admin`) e `Owner` interno padrão no cadastro inicial.
2. **Proprietários / Clientes (`modules/owners`, `V7`):**
   - `GET /owners`, `POST /owners`, `GET /owners/{ownerId}`, `PUT /owners/{ownerId}`, `DELETE /owners/{ownerId}`.
   - Separação entre proprietário `internal` (imóveis próprios da administradora/anfitrião) e `client` (imóveis de terceiros administrados).
   - Contagem de apartamentos vinculados e bloqueio de exclusão caso existam imóveis ativos ligados ao proprietário.
3. **Apartamentos & Permissões (`modules/apartments`, `V3`):**
   - `GET /apartments`, `POST /apartments`, `GET /apartments/{apartmentId}`, `PUT /apartments/{apartmentId}`, `DELETE /apartments/{apartmentId}` (soft delete).
   - Vinculação obrigatória a um `Owner`, validação de `timezone` (`ZoneId`) e controle de escopo por `apartment_memberships`.
4. **Fontes iCal & Criptografia (`modules/icalsources`, `integrations/ical`, `V4`):**
   - `GET /apartments/{apartmentId}/ical-sources`, `POST /apartments/{apartmentId}/ical-sources`, `PUT /apartments/{apartmentId}/ical-sources/{icalSourceId}`, `DELETE /apartments/{apartmentId}/ical-sources/{icalSourceId}`.
   - URLs iCal criptografadas em repouso com **AES-GCM** (`SecretEncryptionService`).
   - Política de segurança de URL (`IcalUrlPolicy`): bloqueia hosts locais, IPs privados e protocolos inseguros (anti-SSRF).
   - Suporte a pausar/reativar sincronização (`syncEnabled`) por fonte.
5. **Reservas, Sync iCal com Diff, Auto-Sync 1h, Notificações & Operations Board (`modules/reservations`, `V5`, `V13`, `V14`):**
   - `POST /ical-sources/{icalSourceId}/sync` (via URL salva ou payload ICS direto) e `GET /ical-sources/{icalSourceId}/sync-runs`.
   - `POST /ical-sources/auto-sync`: dispara sincronização automática das fontes ativas com **trava mínima de 1 hora (cooldown)** por fonte e retorna apenas as execuções relevantes (*Regra do Silêncio*: novas reservas, cancelamentos ou falhas).
   - `GET /notifications/sync`: lista as notificações de sincronização com detalhamento completo do que mudou (`reservationsCreated`, `reservationsCancelled`, lista de `changes` em `diff_details_json` ou `errorMessage`).
   - Parser `iCal4j` com tratamento correto de eventos `VALUE=DATE` (all-day) no fuso horário do apartamento, detecção de `STATUS:CANCELLED` e upsert idempotente (`ical_source_id + external_event_key`).
   - CRUD de **Reservas Manuais/Diretas** e enriquecimento de reservas (hóspede, quantidade de hóspedes `guest_count`, telefone, notas, valores financeiros e horários customizados).
   - `GET /apartments/{apartmentId}/operations-board?date=YYYY-MM-DD&days=7`: classifica reservas em `checkIns`, `checkOuts`, `inHouse` e `upcoming` respeitando o timezone local do imóvel.
6. **Tarefas Operacionais (`modules/tasks`, `V6`):**
   - `GET /apartments/{apartmentId}/tasks`, `POST /apartments/{apartmentId}/tasks`, `PATCH /tasks/{taskId}/status`, `GET /tasks/today`.
   - Ciclo de vida `pending`, `done`, `not_done` (exige justificativa em `statusNote`) e `cancelled`, com vínculo opcional a uma reserva.
7. **Administradores e Proprietários Convidados (`modules/team`):**
   - `GET /team-members`, `POST /team-members`, `PUT /team-members/{membershipId}`, `DELETE /team-members/{membershipId}`.
   - Foco nos perfis `host_admin` (*Admin Geral*) e `co_host` (*Admin-Proprietário*), com vínculo explícito de acesso aos apartamentos do proprietário (`canView`).
8. **Financeiro Completo, Estadias e Repasses com Escopo por Proprietário (`modules/finance`, `V8`, `V9`, `V10`, `V11`, `V12`):**
   - **Lançamentos e Resumo Global (`FinanceController`):** `GET/POST/PUT/DELETE /financial-entries` e `GET /financial-summary` (receitas, despesas e lucro por proprietário e por apartamento).
   - **Visibilidade Financeira do `Admin-Proprietário` (`co_host`):** Leitura liberada em `/financial-entries`, `/financial-summary`, `/rental-stays` e `/finance-mvp/*` estritamente filtrada pelos apartamentos vinculados ao proprietário convidado (`canView = true`), mantendo criação/edição/exclusão exclusivas para `host_admin`.
   - **Estadias e Fechamento por Imóvel (`RentalStayController`):** gestão de estadias (`rental_stays`), vínculo com despesas e controle de períodos de repasse mensal (`settlement_periods` com status `pending` / `paid`).
   - **Endpoints dedicados ao Finance MVP (`FinanceMvpController`).**

---

### 3.2 Aplicação Web Principal (`apps/web`)
Construída em **Next.js App Router + TypeScript + Tailwind CSS v4 + Radix UI / shadcn**, seguindo o padrão *Carbon Enterprise* (`docs/DESIGN.md`):

- **Navegação Híbrida Responsiva:**
  - **Desktop (`>= 1024px`):** Sidebar lateral fixa (`w-[260px]`) e cabeçalho limpo.
  - **Mobile & Tablet (`< 1024px`):** Bottom Navigation Bar fixa (`h-16`) com 5 atalhos rápidos (*Hoje*, *Calendário*, *Imóveis*, *Financeiro* e gaveta *Menu*).
- **Rotas Autenticadas (`src/app/(auth)/`):**
  - `/dashboard` (**Hoje / Painel Operacional**):
    - Navegação rápida de data (`<`, `Hoje`, `>`), filtro por apartamento e atalhos diretos de bolso (`+ Compra / Consumo` e `Relatório PDF Proprietário`).
    - Resumo direto **"Quem Entra e Quem Sai Hoje"** mostrando exatamente quantos apartamentos têm check-in e check-out no dia e **quais são** (nome do imóvel, hóspede e canal).
    - KPIs em grade responsiva, gráfico de volume de reservas (apenas Desktop), quadros completos e tarefas do dia.
  - `/calendario` (**Cronograma & Grade Mensal**):
    - Visão **Cronograma (Tape Chart)** mobile-first com coluna de imóvel fixa à esquerda, auto-scroll para o dia de *Hoje*, detecção visual de conflitos/overbooking e cores executivas de alto contraste por canal (Airbnb vs Direto/Manual).
    - Visão **Mês em Grade** tradicional.
    - **Modal Unificado de Reserva (`ReservationUnifiedModal`)** dividido em abas (*Reserva & Financeiro* com modo rápido **Hóspede** vs **Bloqueio / Uso do Proprietário**; e *Tarefas & Despesas Operacionais* exibindo o que já está registrado na reserva antes de abrir o formulário de novos itens com presets de 1 clique para evitar duplicidade).
    - **Central de Relatórios e PDF (`CalendarReportsModal`):** acessível no celular e no desktop, com presets de 1 clique (**Mês Passado**, **Semana Passada** e **Mês Selecionado**) para gerar/compartilhar o PDF do proprietário, escala de limpeza e portaria.
  - `/apartamentos` (**Gestão de Imóveis**):
    - Listagem e filtros (`/apartamentos`), criação (`/apartamentos/novo`), detalhes (`/apartamentos/[apartmentId]`), edição (`/editar`), gestão completa de fontes iCal e histórico de sync (`/ical`) e financeiro dedicado do imóvel com faturamento e repasses (`/financeiro` + `BillingModal`).
  - `/reservas` (**Central de Reservas**):
    - Cards estruturados no mobile (`md:hidden`) e `DataTable` no desktop (`hidden md:block`), filtros por imóvel/canal/pendência de preço e modal de criação/edição e precificação.
  - `/clientes` (**Proprietários**):
    - Listagem (`/clientes`), criação (`/clientes/novo`) e edição (`/clientes/[ownerId]/editar`), diferenciando carteira própria (`internal`) e clientes (`client`).
  - `/financeiro` (**Financeiro Consolidado**):
    - Resumo de receitas, despesas e resultado líquido no período, presets instantâneos (**Mês Atual**, **Mês Passado**, **Semana Passada**), filtros automáticos por imóvel/proprietário e atalho rápido `+ Compra / Despesa`.
    - Formulário `/financeiro/lancamentos/novo` otimizado para entrada rápida no celular (padrão em Despesa + Consumo, chips de 1 toque para categorias formatadas como *Consumo / Mercado*, *Limpeza*, *Manutenção*, e botões `Hoje` / `Ontem`).
  - `/configuracoes` (**Conta, Proprietários Convidados e Segurança**):
    - Dados da conta e organização (`/configuracoes`), gestão de administradores e proprietários convidados por imóvel (`/configuracoes/equipe`, `/novo`, `/[membershipId]/editar`) e alteração de senha (`/configuracoes/seguranca`).
  - `/notificacoes` (**Central de Notificações Inteligente**):
    - Sincronização automática de iCal ao entrar no sistema (trava mínima de 1h) com sininho e badge no topo/menu.
    - Exibe apenas notificações com mudanças reais (novas reservas ou cancelamentos) ou falhas de sincronização, expandindo os detalhes exatos ao clicar.
- **Internacionalização (`src/i18n/pt-br.ts`):**
  - Textos compartilhados centralizados em português do Brasil (`pt-BR`) com acentuação UTF-8 correta.

---

## 4. Contratos e Regras de Ouro da Arquitetura

### 4.1 Contrato do Operations Board (`GET /apartments/{apartmentId}/operations-board`)
- **Parâmetros:** `date=YYYY-MM-DD` e `days=7` (janela futura).
- **Resposta:** `apartmentId`, `date`, `days`, `timezone`, `checkIns`, `checkOuts`, `inHouse`, `upcoming` e `totals`.
- **Regras:**
  - O backend classifica cada reserva usando o `timezone` do apartamento (eventos `VALUE=DATE` do iCal são interpretados à meia-noite local do imóvel, nunca UTC puro).
  - O frontend renderiza explicitamente as 4 seções usando os `totals` oficiais retornados.

### 4.2 Padrões de Engenharia (Frontend & Backend)
1. **Separação de Responsabilidades na UI:**
   - Telas de listagem apenas listam, filtram e exibem `<EmptyState />` orientativo.
   - Zero overflow horizontal: uso obrigatório de `min-w-0` em células flex/grid, badges atômicas (`whitespace-nowrap`) e modais tripartidos (Header fixo, Body rolável verticalmente, Footer fixo).
   - Nenhuma cor hexadecimal solta fora dos tokens semânticos (`@check-in-board/design-system` / `DESIGN.md`).
2. **Segurança e Persistência no Spring Boot:**
   - Controllers finos com DTOs `record` e Jakarta Validation (`@Valid`, `@NotBlank`, etc.).
   - Regra de autorização sempre verificada no `Service` (nunca confiar em `apartmentId` ou `ownerId` enviados pelo cliente sem validar o vínculo com a organização e o usuário autenticado).
   - Migrações de banco exclusivamente via **Flyway** (`src/main/resources/db/migration/V*__.sql`).
   - Segredos (como URLs iCal) criptografados em repouso e jamais expostos em logs.

---

## 5. Comandos Oficiais de Desenvolvimento e Validação

| Ação | Comando na Raiz (`c:\Users\Inbazz2\Documents\GitHub\check-in-board`) |
| :--- | :--- |
| **Rodar Backend Spring (Dev)** | `pnpm dev:backend-spring` |
| **Testar Backend Spring** | `pnpm test:backend-spring` |
| **Buildar Backend Spring** | `pnpm build:backend-spring` |
| **Rodar Web Principal (Dev)** | `pnpm dev:web` |
| **Typecheck do Web Principal** | `pnpm --filter @check-in-board/web typecheck` |
| **Buildar Web Principal** | `pnpm build:web` |
| **Rodar Finance MVP (Dev)** | `pnpm dev:finance-mvp` |
| **Buildar Finance MVP** | `pnpm build:finance-mvp` |
| **Rodar Mobile Expo (Dev)** | `pnpm dev:mobile` |
| **Typecheck Global do Monorepo** | `pnpm typecheck` |
| **Testes Globais do Monorepo** | `pnpm test` |

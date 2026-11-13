# Check-In Board

SaaS operacional e financeiro para gestão de apartamentos de temporada (reservas via iCal e diretas, cronograma mobile-first, tarefas de limpeza/manutenção, equipe com permissões por imóvel e fechamento financeiro de proprietários).

## Documentação Oficial (Fonte Única da Verdade)

Toda a documentação do projeto foi consolidada em **4 arquivos vivos** dentro de `docs/`:

1. **[Arquivo Mestre do Projeto (`docs/project-master.md`)](docs/project-master.md)** — Como o projeto está hoje, arquitetura do monorepo (`apps/web`, `apps/backend-spring`, `apps/finance-mvp`, `apps/mobile`), módulos implementados, banco de dados (`V1`–`V13`), rotas e padrões de código.
2. **[Backlog Futuro (`docs/backlog.md`)](docs/backlog.md)** — Ideias e evoluções candidatas para o futuro (organizadas por horizonte e área, já com recomendação de agente e modelo de IA).
3. **[Workflow de Agentes & Orquestração (`docs/agent-workflow.md`)](docs/agent-workflow.md)** — Como o **Orchestrator (Argon)** distribui tarefas entre os agentes especialistas escolhendo o modelo ideal (`Gemini 4 Argon`, `Gemini 4 Hydrogen` e `Gemini 3.8 Flash`).
4. **[Design System & UI (`docs/DESIGN.md`)](docs/DESIGN.md)** — Especificação visual *Carbon Enterprise* (Mobile-First & Desktop, anti-overflow, modais, badges e tabelas/cards).

---

## Comandos Rápidos

```bash
# Backend Oficial (Java 21 + Spring Boot)
pnpm dev:backend-spring
pnpm test:backend-spring
pnpm build:backend-spring

# Web SaaS Principal (Next.js App Router)
pnpm dev:web
pnpm build:web

# Finance MVP
pnpm dev:finance-mvp
pnpm build:finance-mvp

# Mobile (Expo)
pnpm dev:mobile

# Verificações Globais
pnpm typecheck
pnpm test
pnpm lint
```

# Check-In Board — Workspace Agent Rules

Estas regras são obrigatórias para todos os agentes e subagentes trabalhando neste repositório.

## 1. Fluxo de Git (Commit Automático, Sem Push)
- Sempre que concluir uma tarefa de código ou documentação e os checks (`typecheck` / `test` / `build`) passarem, faça imediatamente o **`git commit` local** com uma mensagem clara e semântica.
- **Nunca execute `git push`** a menos que o usuário peça explicitamente; o usuário faz o push manualmente.
- Nunca deixe tarefas de listagem recursiva travadas em `node_modules` (prefira `git ls-files` ou `git grep`).

## 2. Fonte Única da Verdade na Documentação (`docs/`)
Não crie arquivos `.md` avulsos ou duplicados de arquitetura/planejamento. Toda a documentação vive nestes 4 arquivos:
1. `docs/project-master.md` — Estado atual real do projeto, stack (`apps/web` + `apps/backend-spring` + `apps/finance-mvp` + `apps/mobile`), banco (`V1`–`V13`) e contratos.
2. `docs/backlog.md` — Backlog futuro de evoluções candidatas. Quando um item for concluído, remova-o do `backlog.md` e registre-o no `project-master.md`.
3. `docs/agent-workflow.md` — Protocolo do Orquestrador, fronteiras de arquivos e seleção de modelos.
4. `docs/DESIGN.md` — Especificação visual *Carbon Enterprise* e regras de componentes.

## 3. Seleção de Modelos na Orquestração (Swarm / Subagentes)
Ao delegar tarefas no Swarm ou via subagentes, respeite a relação entre capacidade e cota:
- **`Orchestrator (Argon)`:** Exclusivo para o Coordenador/Líder Técnico (planejamento, definição de contratos e revisão final). Não use para codificar features repetitivas.
- **`Gemini 4 Hydrogen` (`Medium` / `High` / `XHigh`):** Modelo padrão do **dia a dia** (cota renova diariamente). Use para ~80% das tarefas: telas Next.js, rotas/CRUDs Spring Boot, formulários, filtros e modais.
- **`Gemini 4 Argon` (`Medium` / `High`):** Modelo **topo de linha / pesado** (cota semanal compartilhada). Reserve para algoritmos críticos (reconciliação iCal, fusos horários, cálculos financeiros em centavos, concorrência e segurança/RBAC).
- **`Gemini 3.8 Flash`:** Use para tarefas mecânicas rápidas (`typecheck`, `lint`, dicionário `i18n`) e para o subagente `browser`.

## 4. Regras de UI e Componentes Reutilizáveis (`apps/web`)
- **Zero Controles Improvisados 1 a 1:** Em `apps/web/src/features/**`, é proibido usar `<select>` HTML nativo do navegador. Use sempre `<Select>` de `src/components/ui/form-controls.tsx` ou as primitivas Radix de `src/components/ui/select.tsx`.
- **Botões e Interatividade:** Use `<Button>` (`src/components/ui/button.tsx`) e `<IconButton>` (`src/components/ui/icon-button.tsx`). Todo elemento interativo deve ter `cursor-pointer`, reação clara de `hover` e compressão tátil (`active:scale-[0.98]`).
- **Anti-Overflow:** Respeite o `docs/DESIGN.md` (`min-w-0` em flex/grid, badges atômicas com `whitespace-nowrap`, cards no mobile `md:hidden` e tabelas no desktop `hidden md:block`).

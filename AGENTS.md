# Check-In Board — Workspace Agent Rules

Estas regras são obrigatórias para todos os agentes e subagentes trabalhando neste repositório.

## 0. Perfil da Usuária (Não-Programadora) & Atendimento Autônomo
- **Quem usa este chat:** A usuária principal deste chat (irmã do criador do projeto) **não é programadora**. Ela tem permissão total para pedir qualquer edição ou melhoria no projeto.
- **Comunicação Simples e Direta:** Fale sempre em português claro, amigável e sem jargões técnicos desnecessários. Nunca peça para ela rodar comandos no terminal, editar JSON/SQL ou resolver erros de código manualmente — faça tudo por conta própria nos bastidores.
- **Cadastros e Operações Automáticas (ex: Importação de CSV de Apartamentos):** Quando ela enviar um CSV, planilha ou lista de apartamentos/proprietários/reservas no chat pedindo para cadastrar no sistema, execute o cadastro automaticamente (via API/script/endpoint de importação em lote) para que ela não precise cadastrar na mão.

## 1. Fluxo de Git (Commit Automático, Sem Push)
- Sempre que concluir uma tarefa de código ou documentação e os checks (`typecheck` / `test` / `build`) passarem, faça imediatamente o **`git commit` local** com uma mensagem clara e semântica.
- **Nunca execute `git push`** a menos que o usuário peça explicitamente; o usuário faz o push manualmente.
- Nunca deixe tarefas de listagem recursiva travadas em `node_modules` (prefira `git ls-files` ou `git grep`).

## 2. Fonte Única da Verdade na Documentação (`docs/`)
Não crie arquivos `.md` avulsos ou duplicados de arquitetura/planejamento. Toda a documentação vive nestes 4 arquivos:
1. `docs/project-master.md` — Estado atual real do projeto, stack (`apps/web` + `apps/backend-spring` + `apps/finance-mvp` + `apps/mobile`), banco (`V1`–`V16`) e contratos.
2. `docs/backlog.md` — Backlog futuro de evoluções candidatas. Quando um item for concluído, remova-o do `backlog.md` e registre-o no `project-master.md`.
3. `docs/agent-workflow.md` — Protocolo do Orquestrador, fronteiras de arquivos e seleção de modelos.
4. `docs/DESIGN.md` — Especificação visual *Carbon Enterprise* e regras de componentes.

## 3. Política **Hydrogen-First** (Economia Rigorosa de Cota Argon)
- **Hydrogen por Padrão (`Gemini 4 Hydrogen` — `Medium` / `High` / `XHigh`):**
  - Use **Hydrogen** para **tudo no dia a dia**, inclusive planejamento de tarefas simples/médias, criação e edição de telas Next.js, endpoints Spring Boot, importação de dados/CSV, formulários, filtros e ajustes visuais.
- **Economia Máxima de `Gemini 4 Argon` (`Orchestrator` / `Argon`):**
  - A cota do Argon é semanal e limitada. **Evite usar Argon** a menos que a tarefa seja genuinamente complexa ou crítica (ex: arquitetura pesada, algoritmos complexos de reconciliação/concorrência ou bugs profundos). Se a sessão estiver em Argon para uma tarefa simples, troque para `gemini-4-hydrogen-high` (via `swarm` action `model`) ou delegue o trabalho diretamente para workers `Hydrogen`.
- **Regra do Escopo Micro e Direto (1 a 3 arquivos por Worker):** Nunca despeje um escopo gigante em um único agente. Divida o trabalho em tarefas pequenas, cirúrgicas e diretas.
- **`Gemini 3.8 Flash`:** Use para tarefas mecânicas rápidas (`typecheck`, `lint`, dicionário `i18n`, verificação de build) e para o subagente `browser`.

## 4. Regras de UI e Componentes Reutilizáveis (`apps/web`)
- **Zero Controles Improvisados 1 a 1:** Em `apps/web/src/features/**`, é proibido usar `<select>` HTML nativo do navegador. Use sempre `<Select>` de `src/components/ui/form-controls.tsx` ou as primitivas Radix de `src/components/ui/select.tsx`.
- **Botões e Interatividade:** Use `<Button>` (`src/components/ui/button.tsx`) e `<IconButton>` (`src/components/ui/icon-button.tsx`). Todo elemento interativo deve ter `cursor-pointer`, reação clara de `hover` e compressão tátil (`active:scale-[0.98]`).
- **Anti-Overflow:** Respeite o `docs/DESIGN.md` (`min-w-0` em flex/grid, badges atômicas com `whitespace-nowrap`, cards no mobile `md:hidden` e tabelas no desktop `hidden md:block`).

# Boas práticas de programação

Este documento define o padrão de engenharia do projeto. Ele deve orientar novas features, correções, revisões e commits.

## Princípios

- Prefira código simples, explícito e fácil de revisar.
- Mantenha mudanças próximas do domínio afetado.
- Evite abstrações antes de existir repetição ou complexidade real.
- Preserve contratos existentes sempre que possível.
- Corrija a causa do problema, não apenas o sintoma visível.
- Escreva código para leitura futura, não apenas para passar no build atual.

## TypeScript

- Use tipos precisos para entradas, saídas e estados.
- Evite `any`; quando for inevitável, deixe a justificativa perto do uso.
- Modele estados assíncronos de forma explícita: loading, erro, vazio e sucesso.
- Prefira funções pequenas com nomes de domínio claros.
- Evite strings mágicas para roles, status, permissões e rotas importantes.
- Valide dados em fronteiras de confiança com schemas, preferencialmente Zod quando disponível.

## Frontend

- Textos de navegação, títulos, mensagens reutilizáveis e labels globais devem ficar em `apps/web/src/i18n`.
- Textos em português devem usar acentos corretamente.
- Componentes devem consumir tokens do design system, não hexadecimais soltos.
- Use classes semânticas já mapeadas no Tailwind, como `bg-background`, `bg-surface`, `text-text-primary` e `border-border`.
- Toda tela deve considerar estados de carregamento, erro e vazio.
- A interface deve priorizar fluxo operacional: densidade boa, leitura rápida e ações claras.
- Não adicione textos explicando a própria UI dentro do app quando o controle visual já comunica a ação.

## Design system

- O pacote `@check-in-board/design-system` é a fonte de tokens globais.
- Novas cores, raios, espaçamentos e fontes globais devem nascer no pacote de design system.
- O app web deve consumir `@check-in-board/design-system/theme.css`.
- Evite duplicar tokens em arquivos locais.
- Se um componente precisa de variação visual repetida, crie um padrão reutilizável pequeno.

## i18n

- O idioma inicial é `pt-BR`.
- Centralize strings compartilhadas em `apps/web/src/i18n/pt-br.ts`.
- Organize o dicionário por domínio: `common`, `shell`, `auth`, `apartments`, `calendar`, `finance`, `owners`, `settings`, `reservations`.
- Textos específicos de uma única tela podem migrar gradualmente, mas não devem ficar sem acento.
- Ao repetir um texto pela segunda vez, mova-o para o dicionário.

## Backend e APIs

- Valide payloads de entrada.
- Retorne erros consistentes e úteis para a UI.
- Mantenha regras de autorização perto dos casos de uso protegidos.
- Operações externas devem ter timeout, retry limitado e logs.
- Evite acoplar controllers/routes diretamente a detalhes de persistência.

## Testes e validação

- Rode o menor conjunto de checks que cobre a mudança.
- Para mudanças no web, rode pelo menos `pnpm --filter @check-in-board/web typecheck`.
- Para mudanças visuais ou de build, rode `pnpm --filter @check-in-board/web build`.
- Para mudanças no design system, rode `pnpm --filter @check-in-board/design-system typecheck`.
- Adicione testes quando a mudança alterar regra de negócio, contrato de API ou fluxo crítico.

## Commits

- Faça commits por contexto, não por arquivo e não por dia inteiro de trabalho.
- Um bom commit deve contar uma parte completa da história: por exemplo, "criar fundação de i18n" ou "migrar textos de financeiro".
- Evite commits enormes que misturam backend, UI, documentação e refatoração sem relação direta.
- Evite commits pequenos demais que não deixam o projeto em estado compreensível.
- Antes de commitar, revise `git diff` e inclua apenas arquivos relacionados ao contexto.
- Não inclua mudanças de outra pessoa ou sujeira antiga do working tree.
- Mensagens devem ser curtas e no imperativo, como `Add web i18n foundation`.

## Revisão

- Procure bugs, regressões e estados ausentes antes de celebrar a mudança.
- Verifique se a implementação seguiu o design system e o i18n.
- Confirme se os textos de UI estão em português correto.
- Liste riscos residuais quando algo ficar intencionalmente incremental.

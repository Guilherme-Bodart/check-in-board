# Rollout de design system e i18n

Este documento registra o passo a passo para centralizar estilos e textos do web app, mantendo os textos em português do Brasil com acentos corretos.

## Objetivos

- Usar o pacote `@check-in-board/design-system` como fonte dos tokens visuais.
- Evitar valores de cor, espaçamento e fonte duplicados no app web.
- Centralizar textos estáveis em `apps/web/src/i18n`.
- Corrigir textos em português, incluindo acentuação.
- Migrar de forma incremental para não misturar uma mudança estrutural grande com ajustes de tela.

## Passo a passo

1. Mapear onde os tokens e textos estavam definidos.
2. Criar `packages/design-system/src/theme.css` com variáveis CSS públicas do design system.
3. Exportar `@check-in-board/design-system/theme.css` pelo pacote.
4. Importar esse tema em `apps/web/src/app/globals.css`.
5. Fazer o `@theme` do Tailwind consumir as variáveis `--cib-*`.
6. Criar `apps/web/src/i18n/pt-br.ts` como dicionário tipado inicial.
7. Exportar `messages` em `apps/web/src/i18n/index.ts`.
8. Migrar metadados, layout autenticado e sidebar para o dicionário.
9. Corrigir acentuação dos textos mais visíveis encontrados nas páginas atuais.
10. Rodar typecheck do design system e do web app.

## Regra para novos textos

- Textos compartilhados, navegação, títulos de página, mensagens globais e labels reutilizáveis devem entrar em `apps/web/src/i18n/pt-br.ts`.
- Textos muito específicos de uma tela podem ficar próximos do componente durante a fase inicial, mas devem estar em português correto.
- Não adicionar texto sem acento por conveniência. O projeto usa UTF-8 e deve exibir português natural.
- Quando um texto aparecer em mais de uma tela, mover para o dicionário antes de reutilizar.

## Regra para novos estilos

- Cores, fonte base, raios e espaçamentos globais devem vir de `@check-in-board/design-system`.
- O app web deve consumir tokens por classes Tailwind (`bg-background`, `text-text-primary`, `border-border`) ou por variáveis `--cib-*`.
- Evitar novos hexadecimais diretamente em componentes.
- Se um token não existir, adicionar primeiro no pacote `design-system`.

## Status atual

- Design system CSS exportado pelo pacote.
- Web app importando o tema do pacote.
- Dicionário `pt-BR` criado e usado em metadados, shell autenticado e sidebar.
- Correções iniciais de acentuação aplicadas em calendário, apartamentos, fontes iCal, financeiro, clientes/proprietários e permissões.

## Próximos passos

1. Migrar mensagens de erro e sucesso por feature para `pt-br.ts`.
2. Criar seções no dicionário por domínio: `apartments`, `calendar`, `finance`, `owners`, `settings`, `reservations`.
3. Revisar componentes de formulário e diálogos para remover textos hardcoded repetidos.
4. Adicionar uma checagem simples para bloquear termos comuns sem acento, como `Configuracoes`, `Calendario`, `proprietario` e `lancamento`.

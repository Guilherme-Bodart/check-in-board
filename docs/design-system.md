# Design System

## Objetivo

O design system do Check-In Board deve permitir alterar cores, componentes,
espacamentos e estados em poucos lugares, sem reescrever cada tela. O produto
principal agora e o `apps/web`; o mobile pode reutilizar a mesma linguagem, mas
este documento define primeiro o padrao do web app.

## Direcao

- Ferramenta SaaS operacional, nao landing page.
- Denso, calmo e facil de escanear.
- Listagens e filtros em telas de listagem; formularios em rotas proprias.
- Estados explicitos para loading, vazio, erro, sucesso, sem permissao e acao em andamento.
- Visual inspirado por padroes SaaS modernos como SaaS UI, sem adotar Chakra/SaaS UI como dependencia.

## Tokens

Os tokens publicos ficam em `packages/design-system/src/theme.css` e sao
importados por `apps/web/src/app/globals.css`. Telas devem usar classes Tailwind
baseadas nesses tokens, como `bg-surface`, `text-text-primary`, `border-border`
e `bg-primary`.

Fontes de verdade:

- `packages/design-system/src/tokens.ts`: paleta, semantica, radius, spacing e tipografia.
- `packages/design-system/src/theme.css`: variaveis CSS publicas.
- `apps/web/src/app/globals.css`: mapeamento dos tokens para o Tailwind.

Regras:

- Nenhuma tela deve usar hexadecimal direto.
- Cards, paineis e tabelas usam radius de ate `8px` sempre que possivel.
- `12px` fica reservado para dialogs/modais ou containers maiores herdados.
- Nao usar cards dentro de cards.
- Nao usar fonte baseada em viewport width.
- Letter spacing deve ser neutro em textos normais; uppercase tecnico pode usar tracking discreto.

## Componentes Base Web

Componentes reutilizaveis vivem em `apps/web/src/components/ui`.

Componentes obrigatorios:

- `Button`: variantes `primary`, `secondary`, `ghost`, `danger`.
- `IconButton`: botoes compactos com icone Lucide e `aria-label`.
- `Input`, `Select`, `Textarea`: estados default, disabled e focus.
- `Field`: label, hint e erro.
- `Panel`: superficie padrao para secoes e formularios.
- `MetricCard`: card compacto de indicador.
- `Badge`: status/tipo com cores semanticas.
- `Toolbar`: area de busca, filtros e acao principal.
- `DataTable`: wrapper de tabela com loading e empty state.
- `EmptyState`: titulo direto, texto curto e acao primaria opcional.
- `PageHeader`: titulo, descricao curta e acao principal.
- `FormPageLayout`: pagina de criacao/edicao com acao de voltar.

## Padrao De Telas

List pages:

- mostram metricas, filtros, tabela/lista e empty state;
- podem ter um botao `Novo`, `Adicionar` ou equivalente;
- nao contem formulario de criacao ou edicao embutido.

Create/edit pages:

- usam `FormPageLayout`;
- carregam dados auxiliares necessarios para selects;
- salvam e voltam para a listagem ou detalhe;
- mostram erro proximo ao formulario.

Detail/config pages:

- mostram dados e configuracoes de um recurso especifico;
- podem conter formularios quando a finalidade da pagina for editar aquela configuracao especifica.

Dashboard:

- e exclusivamente operacional;
- nao cria apartamento, iCal, cliente ou configuracao global;
- pode apontar para a rota correta quando faltar configuracao.

## Empty State

Empty states devem ser curtos e acionaveis:

- titulo claro;
- texto auxiliar de uma frase;
- botao para a proxima acao quando o usuario tiver permissao.

Exemplos:

- "Nenhum apartamento cadastrado" + "Adicione o primeiro apartamento para acompanhar reservas e tarefas."
- "Nenhum proprietario encontrado" + "Ajuste os filtros ou cadastre um proprietario."
- "Nenhum lancamento no periodo" + "Crie um lancamento para registrar receita ou despesa."

## Mobile Web

O web app deve funcionar bem no celular:

- acoes principais ficam visiveis no topo da pagina;
- tabelas podem virar listas compactas quando necessario;
- formularios usam campos grandes, ordem simples e botao principal no fim;
- o foco mobile e adicionar/atualizar informacoes rapidamente.

## Checklist

- A tela separa listagem de criacao/edicao?
- A tela usa componentes base?
- Existem loading, erro e empty state?
- O mobile consegue executar a acao principal?
- As permissoes escondem acoes proibidas?
- A cor comunica significado de forma consistente?

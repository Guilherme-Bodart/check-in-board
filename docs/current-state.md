# Current State

## Direcao Atual

- `apps/web` e o produto principal completo.
- `apps/backend-spring` e o backend oficial em producao.
- `apps/finance-mvp` e um MVP financeiro separado para uso real imediato.
- O backend Node antigo nao deve receber novas features.

## Implementado

- Monorepo com pnpm.
- Spring backend com auth, organizacoes, usuarios, proprietarios, apartamentos,
  iCal, reservas, tarefas, equipe, financeiro, estadias manuais e repasses.
- Web principal com login, dashboard, apartamentos, clientes, reservas,
  calendario, financeiro e configuracoes.
- Finance MVP com controle operacional financeiro simples.
- Tokens compartilhados em `packages/design-system`.

## Lacunas Atuais

- Algumas telas do web principal ainda misturam listagem com formulario.
- Dashboard ainda contem acoes de criacao/configuracao que devem ir para rotas proprias.
- Design system existe, mas faltam componentes base consistentes no web.
- Textos antigos possuem encoding quebrado em algumas telas.
- Docs antigos ainda citavam mobile-only e backend Node como centro do produto.

## Regra De Produto Em Andamento

- Tela de listagem lista, filtra e mostra empty state.
- Criacao e edicao ficam em rotas proprias.
- Dashboard e operacional, nao administrativo.
- Spring e a fonte unica de dados.

## Validacao Esperada

- `pnpm --filter @check-in-board/web typecheck`
- `pnpm --filter @check-in-board/web build`
- `pnpm --filter @check-in-board/backend-spring test`
- Smoke manual no frontend online com `NEXT_PUBLIC_API_BASE_URL` apontando para o Spring.

# Plano de Produto Check-In Board

## Resumo

Check-In Board e um SaaS para operacao de apartamentos de temporada. O produto
principal agora e o web app em `apps/web`, consumindo o backend Spring em
`apps/backend-spring`. O `apps/finance-mvp` continua separado como MVP financeiro
rapido para uso real e futura migracao de aprendizados.

O objetivo e entregar um produto completo para pequenos operadores que precisam
controlar apartamentos, proprietarios, reservas via iCal, tarefas operacionais,
equipe e financeiro basico sem depender de planilhas e mensagens soltas.

## Personas

- Host Admin: gerencia conta, apartamentos, proprietarios, integracoes, equipe e financeiro.
- Co-host: acompanha apartamentos atribuidos, reservas e tarefas.
- Team: executa tarefas com contexto minimo e marca andamento/conclusao.

## Produto Principal

O web app deve oferecer:

- login e conta;
- dashboard operacional;
- clientes/proprietarios;
- apartamentos;
- iCal por apartamento;
- reservas importadas;
- calendario;
- tarefas;
- financeiro principal;
- configuracoes, seguranca e equipe.

O mobile continua importante, mas o web app e a superficie principal para
gestao completa. No mobile web, o foco e conseguir cadastrar e atualizar
informacoes com rapidez.

## Principios De UX

- Cada tela tem uma responsabilidade clara.
- Listagens nao contem formularios de criacao/edicao.
- Empty states sempre indicam a proxima acao.
- Dashboard nao mistura operacao com configuracao.
- O visual deve ser SaaS operacional: limpo, profissional, denso e previsivel.
- iCal e opcional; o apartamento deve funcionar manualmente.

## Escopo P0

- Autenticacao com Spring.
- Criar e gerenciar proprietarios.
- Criar e gerenciar apartamentos.
- Gerenciar fontes iCal por apartamento.
- Sincronizar e listar reservas.
- Dashboard com board operacional.
- Criar, listar e atualizar tarefas.
- Gerenciar equipe e permissoes.
- Financeiro principal com receitas, despesas e resumo por periodo.
- Estados de loading, erro, vazio e sem permissao.

## Fora Do P0

- API profunda com OTAs.
- Precificacao dinamica.
- Mensageria com hospede.
- Pagamentos online.
- Relatorios avancados.
- PDF financeiro.
- Automacoes complexas.
- Billing/SaaS pago.

## Backend Oficial

O backend oficial e `apps/backend-spring`.

O backend Node antigo nao deve receber novas features de produto. Ele so deve ser
tocado para remover dependencias antigas ou facilitar migracao.

## Finance MVP

O `apps/finance-mvp` permanece como app separado enquanto for util para operacao
real imediata. Funcionalidades maduras dele podem ser migradas depois para
`apps/web`, usando os mesmos dados do Spring.

## Roadmap Imediato

1. Alinhar docs e design system web.
2. Criar componentes base reutilizaveis.
3. Separar rotas de listagem, criacao e edicao.
4. Remover acoes de criacao do dashboard.
5. Completar fluxos de proprietarios, apartamentos, iCal, financeiro e equipe.
6. Validar build, typecheck, testes Spring e smoke manual online.

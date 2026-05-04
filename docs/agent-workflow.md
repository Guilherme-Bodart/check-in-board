# Agent Workflow

## Papéis

### Lider Tecnico

Responsavel por:

- quebrar trabalho em entregas pequenas;
- manter arquitetura e produto alinhados;
- revisar entregas dos agentes;
- evitar conflitos de arquivos;
- integrar contratos entre mobile e backend;
- atualizar backlog e docs quando decisoes mudarem.

### Agente Mobile

Dono de:

- `apps/mobile`;
- componentes;
- tema;
- navegacao;
- telas;
- hooks de API;
- estados de loading, erro e vazio.

Nao deve editar backend, Prisma ou scripts de deploy sem combinacao previa.

### Agente Backend

Dono de:

- `apps/backend`;
- Prisma schema e migrations;
- API;
- jobs;
- auth;
- autorizacao;
- sync iCal;
- observabilidade backend.

Nao deve editar telas mobile ou componentes de UI sem combinacao previa.

## Estrategia De Entrega

As tarefas devem ser pequenas e independentes.

Tamanho ideal:

- 1 a 4 arquivos principais;
- 1 comportamento validavel;
- checks claros;
- sem depender de muita espera do outro agente.

## Ordem Inicial

1. Lider cria planejamento e publica no GitHub.
2. Mobile cria fundacao visual mockada.
3. Backend cria API base e healthcheck.
4. Lider revisa as duas entregas.
5. Backend define primeiros contratos.
6. Mobile integra chamadas reais.
7. Lider ajusta backlog e proxima rodada.

## Contratos Entre Mobile E Backend

Contratos devem nascer em `packages/schemas`.

Regra:

- backend valida request e response com Zod;
- mobile usa os mesmos schemas para tipar chamadas;
- mudanca de contrato exige atualizacao do backlog e revisao do lider.

## Regras Para Evitar Conflitos

- Mobile nao edita `apps/backend`.
- Backend nao edita `apps/mobile`.
- Ambos podem propor mudancas em `packages/schemas`, mas o lider deve coordenar.
- Docs compartilhados ficam sob responsabilidade do lider.
- Alteracoes em scripts raiz devem ser coordenadas pelo lider.

## Ciclo De Revisao

Cada entrega deve responder:

- o que mudou;
- como validar;
- quais arquivos foram alterados;
- quais riscos ficaram;
- qual proxima entrega recomendada.

## Primeira Rodada De Tarefas

### Mobile: Foundation UI

Escopo:

- criar app Expo;
- configurar tema;
- implementar componentes base;
- criar Today Board mockado.

Fora do escopo:

- auth real;
- chamadas API;
- persistencia;
- push.

### Backend: Foundation API

Escopo:

- criar app Fastify;
- configurar env;
- criar healthcheck;
- configurar Prisma;
- criar estrutura de modulos.

Fora do escopo:

- auth real;
- endpoints de dominio;
- sync iCal;
- jobs reais.

## Cadencia

Preferir rodadas curtas:

- Rodada 1: fundacao mobile e backend.
- Rodada 2: auth e estrutura de usuario.
- Rodada 3: apartamentos e fontes iCal.
- Rodada 4: reservas e sync.
- Rodada 5: tarefas e permissoes.

## Checklist Do Lider Antes De Aceitar Entrega

- A entrega respeita o escopo?
- Os arquivos alterados pertencem ao agente?
- Os comandos principais rodam?
- O design usa tokens?
- O backend valida inputs?
- A autorizacao futura nao foi bloqueada?
- O backlog precisa ser atualizado?

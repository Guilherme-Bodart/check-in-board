# Plano de Produto Check-In Board

## 1. Resumo do problema

Pequenos operadores de apartamentos de temporada precisam coordenar reservas, limpeza, check-in e pendências operacionais entre vários imóveis e vários canais, mas normalmente fazem isso em WhatsApp, planilhas e memória. Isso gera ruído, retrabalho e risco de erro, principalmente quando a operação cresce para mais de um imóvel e mais de uma pessoa envolvida.

O problema fica ainda mais visível quando:

- um Host Admin gerencia vários apartamentos ao mesmo tempo;
- cada apartamento recebe reservas de múltiplos canais;
- parte do time só precisa executar ou confirmar tarefas, sem acesso administrativo;
- a operação precisa funcionar no celular, em tempo real, sem dependência de desktop;
- o sincronismo inicial entre canais precisa ser simples e barato, com iCal no MVP.

Nosso objetivo é criar um app mobile-only, internet only, focado em operação diária de reservas e tarefas para pequenos operadores no Brasil, com um MVP gratuito para validar uso real com a irmã do usuário.

## 2. ICP e personas

### ICP primário

Pequenos operadores de aluguel por temporada no Brasil que:

- gerenciam de 2 a 30 apartamentos;
- anunciam em 2 ou mais canais por apartamento;
- trabalham com apoio de co-hosts, limpeza ou equipe operacional;
- hoje operam com processos manuais e pouca padronização;
- precisam de visibilidade operacional mais do que de BI avançado;
- aceitam usar interface em inglês se a experiência for simples.

### ICP secundário

Hosts em crescimento que ainda não querem pagar por PMS robusto e preferem testar uma solução gratuita e enxuta antes de migrar para algo maior.

### Personas

### 1. Host Admin

Quem é:
Operador principal do negócio, responsável pela carteira de imóveis, canais, pessoas e qualidade da operação.

Objetivos:

- ver tudo o que precisa acontecer hoje em todos os apartamentos;
- reduzir falhas de comunicação entre reservas e execução;
- distribuir trabalho sem perder controle;
- convidar pessoas certas com acesso mínimo necessário.

Dores:

- visão fragmentada por canal e por conversa;
- dificuldade de acompanhar múltiplos imóveis ao mesmo tempo;
- risco de esquecer pendência entre check-out e próxima entrada.

### 2. Co-host

Quem é:
Pessoa que acompanha parte da operação de determinados apartamentos, mas não administra a conta inteira.

Objetivos:

- enxergar apenas os apartamentos sob sua responsabilidade;
- acompanhar reservas e tarefas ligadas a esses apartamentos;
- colaborar sem precisar mexer em configurações sensíveis.

Dores:

- excesso de informação irrelevante quando tudo fica misturado;
- dependência do Host Admin para receber contexto.

### 3. Team

Quem é:
Pessoa operacional, como limpeza, manutenção leve ou apoio local.

Objetivos:

- saber o que foi pedido;
- marcar se concluiu ou não a tarefa;
- não se perder em detalhes administrativos.

Dores:

- instruções espalhadas em mensagens;
- pouca clareza sobre prioridade, prazo e imóvel certo.

## 3. Proposta de valor

O CheckBoard entrega uma lista operacional simples e mobile-first para quem gerencia apartamentos em múltiplos canais, consolidando reservas via iCal e organizando o que precisa ser feito por imóvel, por data e por pessoa.

Valor central:

- visão única da operação diária em múltiplos imóveis;
- menor dependência de planilhas e conversas soltas;
- acesso mínimo por papel, reduzindo erro operacional;
- onboarding leve para testar sem custo;
- foco em execução real, não em software pesado de PMS.

## 4. Escopo do MVP

O MVP deve resolver o fluxo principal de operar reservas e tarefas do dia no celular.

### Incluído no MVP

- autenticação básica e acesso por convite;
- estrutura de organização com Host Admin, Co-host e Team;
- cadastro de apartamentos;
- associação de múltiplos canais por apartamento;
- importação/sincronização de calendário por iCal no nível do apartamento/canal;
- visualização consolidada de reservas por apartamento;
- lista operacional simples com tarefas ligadas a reservas ou criadas manualmente;
- filtros por data, apartamento e status;
- confirmação simples de tarefa feita ou não feita;
- visão global para Host Admin;
- visão restrita para Co-host e Team conforme permissões;
- interface mobile-only;
- idioma inicialmente em inglês aceitável, com conteúdo e operação pensados para contexto do Brasil;
- operação internet only, sem modo offline no MVP;
- plano gratuito único para teste inicial.

### Regras funcionais do MVP

- cada apartamento pode ter múltiplos canais;
- o Host Admin vê todos os apartamentos que gerencia;
- o Co-host vê apenas os apartamentos atribuídos a ele;
- o Co-host não gerencia conta, equipe ou configurações administrativas;
- o Team tem acesso majoritariamente de leitura;
- o Team pode no máximo marcar se a tarefa pedida foi feita ou não;
- apenas o Host Admin pode convidar membros da equipe;
- o produto deve priorizar rapidez de consulta e atualização pelo celular.

## 5. Fora do escopo

Para manter o MVP enxuto, ficam explicitamente fora:

- integrações API profundas com OTAs e channel managers;
- precificação dinâmica;
- pagamentos;
- mensageria com hóspede;
- automações complexas e regras avançadas;
- relatórios financeiros;
- gestão documental de hóspedes;
- check-in digital;
- suporte offline;
- app desktop ou web full-featured;
- múltiplos idiomas com localização completa;
- hierarquias avançadas de equipe;
- permissões customizáveis por ação;
- faturamento, cobrança ou assinatura paga no MVP.

## 6. Papéis e permissões

| Papel | Escopo de apartamentos | Reservas | Tarefas | Equipe e convites | Configurações |
| --- | --- | --- | --- | --- | --- |
| Host Admin | Todos os apartamentos que gerencia | Ver todas | Criar, editar, atribuir e acompanhar | Convida e gerencia equipe | Gerencia apartamentos, canais e iCal |
| Co-host | Apenas apartamentos atribuídos | Ver apenas as dos seus apartamentos | Acompanhar e atualizar tarefas operacionais dos seus apartamentos, sem poderes administrativos | Não convida e não gerencia equipe | Não gerencia configurações globais |
| Team | Apenas tarefas e contexto mínimo dos apartamentos vinculados | Leitura limitada ao necessário para execução | Marcar tarefa como feita ou não feita | Não convida e não gerencia equipe | Sem acesso administrativo |

### Princípios de permissão

- mínimo acesso necessário para cada papel;
- o modelo de acesso é centrado em apartamentos;
- permissões especiais ad hoc não entram no MVP;
- convite e administração de pessoas ficam centralizados no Host Admin.

## 7. Fluxos principais

### 1. Onboarding do Host Admin

1. Criar conta.
2. Cadastrar primeiro apartamento.
3. Adicionar um ou mais canais ao apartamento.
4. Colar URL(s) de iCal para importar reservas.
5. Ver agenda/lista operacional inicial.

### 2. Configuração multi-imóvel

1. Host Admin adiciona novos apartamentos.
2. Para cada apartamento, conecta um ou mais canais por iCal.
3. Define quais apartamentos pertencem a cada Co-host.
4. Passa a acompanhar tudo em visão consolidada.

### 3. Gestão diária da operação

1. Host Admin abre a lista do dia.
2. Filtra por apartamento, data ou status.
3. Identifica check-ins, check-outs e tarefas pendentes.
4. Cria ou ajusta tarefas operacionais quando necessário.
5. Acompanha conclusão sem sair do celular.

### 4. Fluxo do Co-host

1. Co-host entra no app.
2. Visualiza apenas apartamentos atribuídos.
3. Consulta reservas e tarefas ligadas a esses apartamentos.
4. Coordena execução local sem acesso a administração.

### 5. Fluxo do Team

1. Membro do Team entra no app.
2. Vê a tarefa pedida e o contexto mínimo do imóvel/data.
3. Marca como feita ou não feita.
4. Host Admin e Co-host acompanham o status atualizado.

## 8. Hipóteses e riscos de produto

### Hipóteses principais

- pequenos operadores valorizam mais clareza operacional do que profundidade de sistema no início;
- iCal é suficiente para o primeiro ciclo de validação do problema;
- uma experiência mobile-only reduz atrito para uso diário da operação;
- inglês aceitável não impede teste inicial no Brasil se o produto for simples;
- acesso por papel e por apartamento reduz ruído e melhora adoção do time;
- um plano gratuito é suficiente para gerar uso real e feedback inicial.

### Riscos principais

### Riscos de produto

- iCal pode ser percebido como limitado ou lento para operações mais exigentes;
- o valor pode parecer pequeno demais se a lista operacional não economizar tempo real;
- Team pode preferir continuar usando WhatsApp se o fluxo de atualização no app não for mais simples.

### Riscos de adoção

- Host Admin pode ter pouca paciência para onboarding manual de apartamentos e canais;
- Co-host pode precisar de ações extras que hoje estão fora do MVP;
- inglês pode reduzir conforto de uso em perfis menos digitais no Brasil.

### Riscos técnicos com impacto de produto

- inconsistências ou atrasos de sincronização de iCal podem gerar perda de confiança;
- permissões mal resolvidas podem expor apartamentos errados para Co-host ou Team;
- depender de internet pode ser problema em rotinas de campo com conexão fraca.

### Sinais de validação

- Host Admin retorna ao app diariamente;
- tarefas são marcadas dentro do app, e não apenas fora dele;
- novos apartamentos e membros são adicionados após a primeira semana;
- a operação da irmã do usuário passa a confiar no app como lista central do dia.

## 9. Roadmap por fases

### Fase 0. Validação assistida

Objetivo:
colocar o produto para rodar com 1 operação real e observar uso manualmente.

Entregas:

- onboarding básico;
- apartamentos;
- canais por apartamento;
- iCal;
- lista operacional do dia;
- tarefas simples;
- papéis e permissões mínimas.

Critério de avanço:
uso real recorrente por pelo menos uma operação ativa.

### Fase 1. MVP utilizável

Objetivo:
deixar a rotina principal confiável para uso semanal.

Entregas:

- melhorias de velocidade e clareza no fluxo do dia;
- filtros melhores;
- histórico básico de tarefas e reservas;
- notificações simples se forem essenciais para retenção;
- ajustes de idioma e textos para reduzir fricção no Brasil.

Critério de avanço:
retenção semanal, confiança no calendário e conclusão frequente de tarefas.

### Fase 2. Consolidação operacional

Objetivo:
expandir valor para operações com mais imóveis e mais pessoas.

Entregas:

- automações leves de tarefas recorrentes;
- mais contexto por reserva;
- auditoria simples de ações;
- melhorias de colaboração entre Host Admin e Co-host.

Critério de avanço:
time consegue operar mais imóveis sem aumentar desorganização.

### Fase 3. Expansão de integrações

Objetivo:
evoluir além do iCal se a validação justificar.

Entregas possíveis:

- integrações mais profundas com canais;
- recursos pagos;
- capacidades mais robustas de operação e gestão.

## 10. Backlog inicial de telas

### P0

- Tela de login / entrar por convite
- Tela de onboarding inicial do Host Admin
- Lista de apartamentos
- Cadastro/edição de apartamento
- Cadastro de canal com campo de iCal
- Visão consolidada de reservas por apartamento
- Lista operacional do dia
- Detalhe de reserva
- Detalhe de tarefa
- Tela de membros/equipe com convite feito apenas pelo Host Admin

### P1

- Filtros avançados por status, apartamento e período
- Histórico recente de tarefas concluídas/não concluídas
- Ajustes básicos de perfil
- Tela de estado de sincronização de iCal

### P2

- Notificações
- Ajuda/onboarding contextual
- Preferências de idioma

## 11. Histórias de usuário priorizadas

### P0

- Como Host Admin, quero cadastrar meus apartamentos para centralizar a operação em um só lugar.
- Como Host Admin, quero conectar múltiplos canais por apartamento via iCal para enxergar reservas consolidadas.
- Como Host Admin, quero ver todos os apartamentos que gerencio em uma lista operacional única para saber o que precisa acontecer hoje.
- Como Host Admin, quero criar e acompanhar tarefas por apartamento ou reserva para reduzir falhas operacionais.
- Como Host Admin, quero convidar Co-hosts e membros do Team para distribuir execução com segurança.
- Como Co-host, quero ver apenas os apartamentos atribuídos a mim para focar no que é minha responsabilidade.
- Como Co-host, quero consultar reservas e tarefas dos meus apartamentos para apoiar a operação local.
- Como membro do Team, quero ver a tarefa pedida com contexto mínimo para executar sem confusão.
- Como membro do Team, quero marcar se a tarefa foi feita ou não feita para dar retorno rápido ao restante da operação.

### P1

- Como Host Admin, quero filtrar a operação por data, apartamento e status para encontrar pendências rapidamente.
- Como Host Admin, quero saber se uma sincronização de iCal falhou para corrigir problemas antes que afetem a operação.
- Como Co-host, quero acompanhar o histórico recente de tarefas dos meus apartamentos para entender o que já foi resolvido.

### P2

- Como usuário no Brasil, quero textos mais localizados para reduzir atrito no uso diário.
- Como operação em crescimento, quero notificações simples para não depender só de checagem manual.

## 12. Decisões de produto para o MVP

- Mobile-only desde o início.
- Internet only no MVP.
- Brasil primeiro.
- Inglês aceitável no lançamento inicial.
- Gratuito para validação inicial.
- iCal como integração principal do MVP.
- Modelo de acesso simples, baseado em papel e apartamento.

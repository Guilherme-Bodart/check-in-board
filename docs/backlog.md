# Check-In Board — Backlog Futuro (`backlog.md`)

> **Propósito deste documento:**  
> Toda a fundação inicial e o escopo do MVP original (Auth, Proprietários, Apartamentos, Sync iCal, Calendário/Cronograma, Reservas Manuais, Tarefas, Equipe e Financeiro/Repasses) **já estão concluídos e funcionando** (veja o [Arquivo Mestre (`docs/project-master.md`)](file:///c:/Users/Inbazz2/Documents/GitHub/check-in-board/docs/project-master.md)).
>
> Este arquivo lista **apenas ideias, melhorias e expansões futuras** que **podem ou não acontecer** conforme a necessidade real da operação. Cada item já traz a recomendação de **Agente** e **Modelo** (conforme o [Workflow de Agentes (`docs/agent-workflow.md`)](file:///c:/Users/Inbazz2/Documents/GitHub/check-in-board/docs/agent-workflow.md)), priorizando o **Gemini 4 Hydrogen** para as entregas do dia a dia (cota diária) e reservando o **Gemini 4 Argon** para lógica crítica/arquitetural (cota semanal).

---

## Legenda de Horizonte e Modelos

- **Horizonte:**
  - `H1 (Curto Prazo / Refinamento)`: Polimento de fluxos existentes, performance e automação leve.
  - `H2 (Médio Prazo / Expansão)`: Novas capacidades de negócio, notificações ativas e relatórios avançados.
  - `H3 (Longo Prazo / Opcional)`: Integrações profundas com OTAs, portal do proprietário e faturamento SaaS.
- **Modelos Recomendados:**
  - **Gemini 4 Hydrogen (Medium / High / XHigh):** Modelo do **dia a dia** (cota renova diariamente) — ideal para CRUDs, telas, formulários, filtros e features padrão.
  - **Gemini 4 Argon (Medium / High):** Modelo **topo de linha / pesado** (cota semanal) — reservado para algoritmos críticos de sync iCal, concorrência, regras financeiras delicadas e arquitetura.
  - **Gemini 3.8 Flash:** Executor ultrarrápido — ideal para `i18n`, testes, lint, exportações simples e validação visual no Browser.

---

## 1. Sincronização iCal, Reservas & Calendário

- **`FUT-CAL-01` [H1] — Agendador Automático de Sync iCal em Background (`@Scheduled`):**
  - *O que é:* Hoje o sync iCal pode ser disparado manualmente pela UI/API; adicionar job periódico configurável no Spring Boot para sincronizar automaticamente todas as fontes ativas a cada X minutos com lock seguro contra concorrência.
  - *Agente / Modelo:* `Agente Backend` — **Gemini 4 Argon (High)** *(lógica crítica de concorrência/background)*
- **`FUT-CAL-02` [H1] — Endpoint Agregado do Operations Board (`GET /operations-board`):**
  - *O que é:* Substituir as múltiplas chamadas por apartamento quando o filtro `"Todos os apartamentos"` está ativo no `/dashboard` por um único endpoint consolidado no Spring.
  - *Agente / Modelo:* `Agente Backend` + `Agente Web` — **Gemini 4 Hydrogen (High)** *(evolução direta de endpoint e consumo no dia a dia)*
- **`FUT-CAL-03` [H2] — Regra de Janela de Confirmação para `missing_in_feed`:**
  - *O que é:* Evitar que uma falha momentânea do feed do Airbnb marque reservas como ausentes de imediato; confirmar remoção/cancelamento apenas após $N$ sincronizações consecutivas ou alertar o anfitrião para decisão manual.
  - *Agente / Modelo:* `Agente Backend` — **Gemini 4 Argon (High)** *(regra crítica de reconciliação de reservas)*
- **`FUT-CAL-04` [H2] — Bloqueio de Datas / Manutenção no Calendário:**
  - *O que é:* Permitir bloquear dias no Cronograma para manutenção ou uso do proprietário (sem contar como receita de hóspede, mas impedindo conflitos).
  - *Agente / Modelo:* `Agente Backend` + `Agente Web` — **Gemini 4 Hydrogen (High)**
- **`FUT-CAL-05` [H3] — Exportação de Feed iCal do Check-In Board (`.ics` de saída):**
  - *O que é:* Gerar um link `.ics` público assinado por apartamento para que reservas diretas/manuais criadas no Check-In Board bloqueiem automaticamente a agenda do Airbnb/Booking.
  - *Agente / Modelo:* `Agente Backend` — **Gemini 4 Argon (High)** *(geração RFC 5545 + segurança de token assinado)*

---

## 2. Operação de Campo, Tarefas & Checklists

- **`FUT-OPS-01` [H1] — Templates Automáticos de Tarefas por Reserva:**
  - *O que é:* Gerar automaticamente a tarefa de *Limpeza / Check-out* sempre que uma nova reserva confirmada entrar via iCal ou criação manual, evitando esquecimentos.
  - *Agente / Modelo:* `Agente Backend` — **Gemini 4 Hydrogen (XHigh)**
- **`FUT-OPS-02` [H2] — Checklists de Limpeza e Vistoria com Fotos:**
  - *O que é:* Permitir que o perfil `team` marque itens de um checklist por apartamento e anexe fotos de vistoria ao concluir a limpeza.
  - *Agente / Modelo:* `Agente Backend` + `Agente Web` / `Agente Mobile` — **Gemini 4 Hydrogen (High)**
- **`FUT-OPS-03` [H2] — Link Rápido / WhatsApp de Escala Diária para Equipe de Limpeza:**
  - *O que é:* Botão para gerar resumo formatado para WhatsApp com os check-outs e limpezas do dia ou da semana por responsável.
  - *Agente / Modelo:* `Agente Web` — **Gemini 3.8 Flash**

---

## 3. Financeiro, Proprietários & Prestação de Contas

- **`FUT-FIN-01` [H1] — Unificação Completa do `finance-mvp` dentro do `apps/web`:**
  - *O que é:* Trazer 100% da agilidade de criação rápida e exportação CSV detalhada do `apps/finance-mvp` para a experiência principal em `/financeiro`, permitindo aposentar o app separado quando desejado.
  - *Agente / Modelo:* `Agente Web` — **Gemini 4 Hydrogen (High)**
- **`FUT-FIN-02` [H1] — Taxa de Administração Configurável por Proprietário/Apartamento:**
  - *O que é:* Cadastrar o percentual de comissão da administradora (ex: 15% ou 20%) no cadastro do Proprietário/Apartamento para calcular automaticamente o valor líquido de repasse nos relatórios e fechamentos.
  - *Agente / Modelo:* `Agente Backend` (**Gemini 4 Argon High** nos cálculos em centavos) + `Agente Web` (**Gemini 4 Hydrogen High** nas telas/relatórios)
- **`FUT-FIN-03` [H2] — Despesas Recorrentes Mensais (Condomínio, Internet, Energia, IPTU):**
  - *O que é:* Configurar despesas fixas mensais por apartamento para geração automática na abertura de cada competência (`period_month`).
  - *Agente / Modelo:* `Agente Backend` + `Agente Web` — **Gemini 4 Hydrogen (High)**
- **`FUT-FIN-04` [H3] — Portal de Visualização do Proprietário (Read-Only):**
  - *O que é:* Visão simplificada onde o proprietário (`co_host` / cliente) acessa apenas o calendário de ocupação e os demonstrativos mensais de repasse dos seus imóveis.
  - *Agente / Modelo:* `Agente Web` + `Agente Backend` — **Gemini 4 Hydrogen (High)**

---

## 4. Equipe, Segurança & Notificações

- **`FUT-SEC-01` [H2] — Envio Real de E-mails Transacionais (Reset de Senha e Convites):**
  - *O que é:* Conectar provedor de e-mail (ex: Resend / AWS SES) no Spring Boot para envio de links de recuperação de senha e convites de equipe.
  - *Agente / Modelo:* `Agente Backend` — **Gemini 4 Hydrogen (Medium)**
- **`FUT-SEC-02` [H2] — Trilha de Auditoria (`audit_logs`) Visível para Host Admin:**
  - *O que é:* Registrar e exibir quem alterou preços de reserva, excluiu lançamentos financeiros ou mudou status de tarefas.
  - *Agente / Modelo:* `Agente Backend` + `Agente Web` — **Gemini 4 Hydrogen (High)**
- **`FUT-SEC-03` [H2] — Alertas Operacionais (Conflito de Reserva, Falha de Sync, Reserva Sem Preço):**
  - *O que é:* Central de notificações ou envio de alerta quando um feed iCal falhar repetidamente ou houver colisão de datas no mesmo imóvel.
  - *Agente / Modelo:* `Agente Backend` (**Gemini 4 Argon Medium**) + `Agente Web` (**Gemini 4 Hydrogen High**)

---

## 5. Qualidade, Design System & Experiência Mobile

- **`FUT-QA-01` [H1] — Consolidação Total de Dicionário `i18n` (`pt-BR`):**
  - *O que é:* Mover todas as strings ainda hardcoded nas features de calendário, financeiro e modais para módulos tipados em `apps/web/src/i18n/`.
  - *Agente / Modelo:* `Agente QA / Flash` — **Gemini 3.8 Flash**
- **`FUT-QA-02` [H1] — Suíte de Testes E2E / Smoke Visual Automatizado:**
  - *O que é:* Roteiro automatizado validando login, criação de reserva manual, visualização no cronograma mobile (375px) e desktop (1280px) e fechamento financeiro.
  - *Agente / Modelo:* `Agente QA / Browser` — **Gemini 3.8 Flash**
- **`FUT-MOB-01` [H3] — Alinhamento do `apps/mobile` (Expo) com os Novos Módulos do Spring:**
  - *O que é:* Caso o app nativo Expo volte a ser prioridade em paralelo ao Web Mobile-First, atualizar seus serviços para consumir os novos endpoints de reservas manuais e estadias do Spring.
  - *Agente / Modelo:* `Agente Mobile` — **Gemini 4 Hydrogen (High)**

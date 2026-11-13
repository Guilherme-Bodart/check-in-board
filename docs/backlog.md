# Check-In Board — Backlog Futuro (`backlog.md`)

> **Propósito deste documento:**  
> Toda a fundação inicial, o Design System *Carbon Enterprise*, a simplificação do **Web-Mobile (`WEB-MOB-01`)**, o **Auto-Sync de 1h com Central de Notificações Inteligente (`SYNC-NOTIF-01/02/03`)** e a **Visibilidade Financeira por Dono de Apartamento (`RBAC-OWN-01/02`)** **já foram concluídos** e registrados no [Arquivo Mestre (`docs/project-master.md`)](file:///c:/Users/Inbazz2/Documents/GitHub/check-in-board/docs/project-master.md).
>
> Este arquivo mantém apenas as **evoluções futuras opcionais** que podem ou não acontecer conforme o uso real.

---

## Evoluções Futuras Candidatas (`P2` — Opcionais)

- **`FUT-CAL-01` — Bloqueio de Datas / Uso do Proprietário no Calendário:**
  - *O que é:* Permitir bloquear datas no Cronograma para manutenção ou uso do próprio dono do imóvel (sem contabilizar como receita de hóspede, mas bloqueando conflitos).
  - *Agente / Modelo:* `Agente Backend` + `Agente Web` — **Gemini 4 Hydrogen (High)**
- **`FUT-CAL-02` — Endpoint Agregado do Operations Board (`GET /operations-board`):**
  - *O que é:* Consolidar a busca de `"Todos os apartamentos"` do `/dashboard` em uma única chamada HTTP no backend Spring.
  - *Agente / Modelo:* `Agente Backend` + `Agente Web` — **Gemini 4 Hydrogen (High)**
- **`FUT-FIN-01` — Taxa de Administração Informativa por Proprietário/Apartamento:**
  - *O que é:* Configurar percentual de comissão da administradora (ex: 15% ou 20%) no cadastro do Proprietário/Apartamento para cálculo automático no demonstrativo de repasse (100% informativo/gerencial).
  - *Agente / Modelo:* `Agente Backend` (**Gemini 4 Argon High**) + `Agente Web` (**Gemini 4 Hydrogen High**)
- **`FUT-FIN-02` — Despesas Recorrentes Mensais (Condomínio, Internet, Energia):**
  - *O que é:* Configurar despesas fixas mensais por imóvel para preenchimento rápido na abertura de cada mês.
  - *Agente / Modelo:* `Agente Backend` + `Agente Web` — **Gemini 4 Hydrogen (High)**
- **`FUT-SEC-01` — Envio de E-mails Transacionais (Recuperação de Senha e Convite de Proprietário):**
  - *O que é:* Conectar provedor de e-mail (ex: Resend / AWS SES) no Spring Boot para envio automático de reset de senha e acesso do proprietário convidado.
  - *Agente / Modelo:* `Agente Backend` — **Gemini 4 Hydrogen (Medium)**
- **`FUT-QA-01` — Consolidação Total de Dicionário `i18n` (`pt-BR`):**
  - *O que é:* Mover textos restantes das telas de calendário, notificações e financeiro para módulos tipados em `apps/web/src/i18n/pt-br.ts`.
  - *Agente / Modelo:* `Agente QA / Flash` — **Gemini 3.8 Flash**

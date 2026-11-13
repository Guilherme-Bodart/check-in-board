# Check-In Board — Backlog Futuro (`backlog.md`)

> **Regras de Produto Inegociáveis:**
> 1. **Sem processamento de pagamentos na plataforma:** Dinheiro no sistema é 100% demonstrativo/gerencial.
> 2. **Apenas 2 perfis reais de uso (`Admin-Admin` e `Admin-Proprietário`):** Sem perfil de limpeza/operacional logado. O `Admin-Admin` vê todos os imóveis e todo o financeiro; o `Admin-Proprietário` convidado vê **apenas seus próprios apartamentos e o financeiro deles**.
> 3. **Zero custo com notificações/jobs 24/7 em tempo real:** O sync automático de iCal roda apenas quando o usuário abre o sistema (com intervalo mínimo de **1 hora**). Notificações só nascem quando há **diferença real** (novas reservas, cancelamentos) ou **erros/falhas**, exibindo o detalhe em uma página de notificações dedicada.
> 4. **Foco em Web-Mobile Simples (Sem App Nativo agora):** A versão Web aberta no celular deve ser muito mais limpa e enxuta que o Desktop, mostrando apenas o essencial.

---

## Prioridade 1 (`P1` — Próximas Entregas Diretas)

### 1. Experiência Web-Mobile Simplificada (`apps/web`)
- **`WEB-MOB-01` — Enxugar e Simplificar as Telas no Celular (`< 768px`):**
  - *O que é:* Hoje o Web-Mobile tenta carregar a mesma quantidade de filtros, KPIs, botões secundários e blocos do Desktop. Simplificar a visão mobile para mostrar apenas o essencial e direto ao ponto (escondendo controles secundários, relatórios A4 e configurações densas que pertencem ao Desktop).
  - *Agente / Modelo:* `Agente Web` — **Gemini 4 Hydrogen (High)**

### 2. Sync iCal ao Entrar (Cooldown 1h) + Página de Notificações Inteligente
- **`SYNC-NOTIF-01` — Retorno de "Diff" no Sync iCal (`apps/backend-spring`):**
  - *O que é:* Ao sincronizar uma fonte iCal, calcular exatamente o que mudou em relação ao estado anterior (`newReservationsCount`, `cancelledReservationsCount`, e a lista resumida das reservas novas/canceladas) em vez de apenas atualizar silenciosamente.
  - *Agente / Modelo:* `Agente Backend` — **Gemini 4 Argon (High)** *(reconciliação de estado do parser/upsert)*
- **`SYNC-NOTIF-02` — Gatilho de Sync Automático no Acesso com Trava de 1 Hora (`apps/web` + `apps/backend-spring`):**
  - *O que é:* Quando o usuário entra no sistema, checar o timestamp da última sincronização automática (`lastSuccessAt` / `lastSyncAttemptAt`). Se passou mais de **1 hora**, disparar o sync das fontes ativas em segundo plano sem travar a tela.
  - *Agente / Modelo:* `Agente Web` + `Agente Backend` — **Gemini 4 Hydrogen (High)**
- **`SYNC-NOTIF-03` — Central / Página de Notificações (`/notificacoes`):**
  - *O que é:* Criar a página dedicada de notificações e o indicador (badge com contador) no topo/menu.
    - **Regra do Silêncio:** Se o sync iCal rodou e não houve nenhuma reserva nova, cancelada ou erro, **não cria notificação**.
    - **Quando há novidade ou falha:** Cria a notificação (ex: *"Sync Airbnb: 3 novas reservas e 1 cancelamento"* ou *"Falha ao sincronizar Apto 204"*). Ao clicar na notificação, expande os detalhes exatos das reservas que entraram/saíram ou o motivo do erro.
  - *Agente / Modelo:* `Agente Backend` + `Agente Web` — **Gemini 4 Hydrogen (High)**

### 3. Visibilidade Financeira e Operacional para `Admin-Proprietário` (`co_host`)
- **`RBAC-OWN-01` — Escopo Financeiro por Apartamento/Proprietário no Backend (`apps/backend-spring`):**
  - *O que é:* Hoje os endpoints financeiros (`/financial-entries`, `/financial-summary`, `/rental-stays`) são restritos apenas a `host_admin`. Liberar leitura financeira para o dono convidado (`co_host`), mas **filtrando estritamente pelos apartamentos aos quais ele tem vínculo**, garantindo que ele veja o dinheiro dos seus imóveis e nunca veja dados de outros proprietários.
  - *Agente / Modelo:* `Agente Backend` — **Gemini 4 Argon (High)** *(segurança e isolamento de dados financeiros)*
- **`RBAC-OWN-02` — Visão de Convidado Dono de Apartamento no Web (`apps/web`):**
  - *O que é:* Simplificar o cadastro de equipe/convite para focar em **Convidar Dono de Apartamento** (vinculando quais imóveis ele é dono) e ajustar a interface para que o proprietário convidado veja o financeiro e o calendário dos seus imóveis sem ver menus administrativos globais.
  - *Agente / Modelo:* `Agente Web` — **Gemini 4 Hydrogen (High)**

---

## Prioridade 2 (`P2` — Ideias Futuras Opcionais)

- **`FUT-CAL-01` — Bloqueio de Datas / Uso do Proprietário no Calendário:**
  - *O que é:* Permitir bloquear datas no Cronograma para manutenção ou uso do próprio dono do imóvel.
  - *Agente / Modelo:* `Agente Backend` + `Agente Web` — **Gemini 4 Hydrogen (High)**
- **`FUT-FIN-01` — Taxa de Administração Informativa por Proprietário/Apartamento:**
  - *O que é:* Configurar percentual da comissão da administradora (ex: 15% ou 20%) apenas para cálculo automático no demonstrativo de repasse.
  - *Agente / Modelo:* `Agente Backend` + `Agente Web` — **Gemini 4 Hydrogen (High)**
- **`FUT-FIN-02` — Despesas Recorrentes Mensais (Condomínio, Internet, Energia):**
  - *O que é:* Lançamento rápido de despesas fixas mensais por imóvel.
  - *Agente / Modelo:* `Agente Backend` + `Agente Web` — **Gemini 4 Hydrogen (High)**
- **`FUT-QA-01` — Consolidação Total de Dicionário `i18n` (`pt-BR`):**
  - *O que é:* Centralizar textos restantes das telas em `apps/web/src/i18n/pt-br.ts`.
  - *Agente / Modelo:* `Agente QA / Flash` — **Gemini 3.8 Flash**

# Check-in Board — Design System & UI Architecture (`DESIGN.md`)

**Identidade Visual:** *Warm Luxury Hospitality & Precision SaaS*  
**Referências de Engenharia de UI:** Airbnb Host, Linear, Vercel Geist, Stripe Dashboard, shadcn/ui.

Este documento é a **fonte única da verdade** para o design e implementação de interfaces do **Check-in Board** (Web & Mobile-First). Todas as telas, modais, tabelas e componentes devem obedecer estritamente às regras abaixo para garantir **zero textos quebrados, zero vazamento de containers (overflow) e máxima clareza operacional**.

---

## 1. Princípios Fundamentais de Engenharia Visual

### 1.1 Garantia de Zero Overflow (Anti-Break Layout Rules)
O erro mais grave em aplicações SaaS é o vazamento de textos, inputs ou botões para fora de seus cards/modais. Para impedir isso em 100% dos casos:
- **Proibido Larguras Fixas Rígidas em Flex/Grid:** Nunca use classes fixas como `w-56`, `w-60`, `w-72` em inputs ou selects dentro de modais ou cards. Use sempre `w-full min-w-0` controlado pelo grid pai.
- **Regra do `min-w-0`:** Todo elemento flexível (`flex-1`) ou célula de grid que contenha texto longo, `input` ou `select` deve possuir `min-w-0`. Sem `min-w-0`, o CSS Grid/Flexbox impede o encolhimento e estoura a borda do card.
- **Proibido Colidir Rótulos na Mesma Linha:** Em cabeçalhos de cards internos, nunca coloque um `Select` largo na esquerda e um texto longo (`Proprietário: Nome...`) na direita na mesma linha sem `flex-wrap`. Coloque o metadado como subtítulo ou em linha dedicada.
- **Inputs Nativos de Data e Hora (`type="date"` e `type="time"`):**
  - Um input `date` precisa de pelo menos `140px` de largura livre.
  - Um input `time` precisa de pelo menos `95px` de largura livre.
  - **Regra:** Nunca esprema 4 inputs (`date + time + date + time`) lado a lado dentro de uma sub-coluna estreita. Cada par (Check-in: Data + Hora) deve ocupar uma linha inteira em colunas estreitas ou uma coluna de pelo menos `260px`.

### 1.2 Divulgação Progressiva (Progressive Disclosure)
- **Regra:** Mostrar apenas o essencial à primeira vista; detalhes secundários ficam sob demanda (em abas ou ao clicar).
- **Nos Cards do Calendário / Tape Chart:**
  - Exibir apenas: Canal (1 badge curto), Nome do Hóspede (`truncate`) e Valor (ou alerta curto).
- **Nos Modais Complexos:**
  - Nunca exibir 2 colunas cheias de formulários espremidos ao mesmo tempo.
  - Dividir fluxos densos usando **Abas (`Tabs`)** claras (ex: Aba 1: *Reserva & Financeiro* | Aba 2: *Tarefas & Despesas Operacionais*). Isso mantém o modal limpo, legível, sem scroll horizontal e perfeito tanto no celular quanto no desktop.

### 1.3 Regra de Rótulos Limpos & Botões Únicos
- **Sem Duplicação de Símbolos:** Se o botão já possui o ícone `<Plus />`, o texto deve ser `"Nova Reserva"` ou `"Adicionar"` — **nunca** `"+ Nova Reserva"` (que gera `+ +`).
- **Ação Primária Única por Tela:** Cada página deve ter apenas **1 botão primário de criação** no cabeçalho principal (`PageHeader`). As barras de filtro (`Toolbar`) abaixo devem conter apenas busca e filtros, sem repetir o botão `+ Novo`.

---

## 2. Anatomia e Padrão de Modais (`Dialog`)

Todos os modais do sistema devem utilizar o componente base `Dialog` (`src/components/ui/dialog.tsx`) seguindo estas especificações:

### 2.1 Tamanhos Padronizados (Sem Conflito de Breakpoints)
- O `DialogContent` base **não deve usar prefixos de breakpoint (`sm:max-w-lg`)** que bloqueiem a sobrescrita via `tailwind-merge`.
- Escala de larguras máximas permitidas:
  - **Compacto (`max-w-md` / `448px`):** Confirmações de exclusão (`ConfirmDialog`), faturamento rápido (`BillingModal`).
  - **Padrão (`max-w-xl` / `576px` ou `max-w-2xl` / `672px`):** Criação/Edição de Reserva (`ReservationUnifiedModal`).
  - **Amplo (`max-w-4xl` / `896px`):** Central de Relatórios e Demonstrativos A4 (`CalendarReportsModal`).

### 2.2 Estrutura Tripartida Obrigatória (Header / Body / Footer)
Todo modal deve ser estruturado como `flex flex-col max-h-[90vh] overflow-hidden p-0`:
1. **Header Fixo (`shrink-0 border-b border-border px-5 py-4`):**
   - Ícone/Avatar à esquerda (`h-9 w-9 shrink-0`) + Título (`text-base font-bold`) + até 2 badges atômicos.
   - Botão de fechar (`X`) posicionado com segurança sem sobrepor botões de ação.
2. **Body Rolável (`flex-1 overflow-y-auto p-5 space-y-4 min-h-0`):**
   - Rolagem **exclusivamente vertical** (`overflow-x-hidden`).
   - Espaçamento interno respirável (`p-4 sm:p-6`).
3. **Footer Fixo (`shrink-0 border-t border-border bg-surface-muted/40 px-5 py-3.5`):**
   - Ações alinhadas à direita no desktop (`Cancel` secundário à esquerda, `Submit` primário à direita) e botões confortáveis no mobile.

### 2.3 Comportamento Mobile (Bottom Sheet)
- Em telas `< 640px` (`mobile`), todo modal ancora na borda inferior da tela (`inset-x-0 bottom-0 rounded-t-3xl max-h-[92vh]`), deslizando de baixo para cima (`slide-in-from-bottom`), permitindo operação com o polegar.

---

## 3. Tags, Badges e Pílulas Atômicas

- **Dimensões:** Altura máxima de `20px` a `22px` (`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider`).
- **Inquebráveis:** Sempre aplicar ` inline-flex items-center shrink-0 whitespace-nowrap rounded-full`.
- **Limite de Texto:** Máximo de 12 a 15 caracteres (ex: `Airbnb`, `Manual`, `Faturado`, `Pendente`, `Conflito`).
- **Proibido:** Colocar frases inteiras dentro de uma tag ou permitir que uma tag quebre em 2 linhas.

---

## 4. Arquitetura Responsiva (Mobile-First & Desktop)

### 4.1 Navegação Global
- **Desktop (`>= 1024px` / `lg`):**
  - Sidebar lateral fixa à esquerda (`w-[260px]`), limpa, com indicador de rota ativa e botão de sair no rodapé.
- **Mobile & Tablet (`< 1024px`):**
  - Sidebar de desktop **100% oculta (`hidden lg:flex`)**.
  - **Bottom Navigation Bar fixa (`h-16`)** na base da tela com 5 destinos rápidos:
    1. **Hoje** (`/dashboard`)
    2. **Calendário** (`/calendario`)
    3. **Imóveis** (`/apartamentos`)
    4. **Financeiro** (`/financeiro`)
    5. **Menu** (Abre gaveta inferior com *Clientes*, *Reservas*, *Configurações*, *Segurança* e *Sair*).
  - Todo o conteúdo da página possui `pb-24 lg:pb-8` para nunca ficar escondido atrás da barra inferior.

### 4.2 Grid de Indicadores (KPI Cards)
- **Mobile (`< 640px`):** Grade compacta `grid-cols-2 gap-3` com padding reduzido (`p-3.5`) e valores com `truncate`. Nunca empilhar 4 cards gigantes ocupando 2 telas inteiras de rolagem no celular.
- **Desktop (`>= 1024px`):** Grade ` lg:grid-cols-4 gap-4` com padding `p-5`.

### 4.3 Calendário (Mês em Grade & Tape Chart)
- **Header do Calendário:**
  - Título limpo à esquerda + Ações bem distribuídas à direita.
  - Em telas mobile, os filtros (Busca, Apartamento, Canal) e seletor de mês empilham de forma organizada com largura `w-full` para toque fácil.
- **Visualização no Mobile:**
  - Além da grade tradicional com scroll suave, no mobile as células e listas de reservas do mês são exibidas em cartões claros, sem textos espremidos.

### 4.4 Tabelas de Dados (`DataTable`)
- Sempre envolvidas por `overflow-x-auto rounded-xl border border-border` para permitir deslize horizontal suave em telas pequenas sem cortar colunas de valores ou botões de ação.

---

## 5. Paleta de Cores & Tokens Semânticos

| Token | Cor / Valor | Uso Principal |
| :--- | :--- | :--- |
| `--background` | `#F8F7F4` | Fundo geral da aplicação (Off-white quente e confortável) |
| `--surface` | `#FFFFFF` | Fundo de cards, modais, tabelas e barras de navegação |
| `--surface-muted` | `#F1EFEA` | Fundos secundários, cabeçalhos de tabela e estados inativos |
| `--border` | `#E5E0D8` | Bordas sutis de `1px` para divisão estrutural |
| `--primary` | `#E11D48` / `#D85A38` | Ações principais, botões de destaque e indicadores ativos |
| `--primary-soft` | `#FFE4E6` / `#FAF0E6` | Fundo suave para itens de menu ativos e badges |
| `--text-primary` | `#1C1917` | Títulos, nomes de hóspedes e valores principais |
| `--text-secondary`| `#57534E` | Subtítulos, descrições e rótulos de formulário |
| `--text-muted` | `#78716C` | Placeholders, metadados secundários e dicas |
| `--success` | `#059669` | Valores faturados, receitas e status concluído |
| `--warning` | `#D97706` | Reservas sem preço, nomes genéricos e alertas operacionais |
| `--danger` | `#DC2626` | Conflitos de overbooking, despesas e exclusões |

---

## 6. Checklist de Qualidade Antes de Qualquer Entrega
1. **Teste em 375px (Mobile) e 1280px (Desktop):** Nenhum input, botão ou texto pode vazar da caixa ou gerar barra de rolagem horizontal indesejada dentro de cards/modais.
2. **Modais Limpos:** O modal abre com largura adequada, sem sobreposição de cabeçalhos ou campos espremidos.
3. **Tags Únicas e Curtas:** Todas as badges possuem `whitespace-nowrap` e texto conciso.
4. **Zero Loading Infinito:** Listas ou contas vazias encerram o carregamento imediatamente e exibem `<EmptyState />` orientativo.

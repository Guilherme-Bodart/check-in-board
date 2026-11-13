# Check-in Board — Design System & UI Architecture (`DESIGN.md`)

**Identidade Visual:** *Carbon Enterprise — Clareza Produtiva & Precisão Operacional*  
**Referências de Engenharia de UI:** Stitch Project *Check-in Board Anfitrião* (`639271905691226277`), IBM Carbon, Linear, Vercel Geist, `shadcn/ui` + `@radix-ui`.

Este documento é a **fonte única da verdade** para o design e implementação de interfaces do **Check-in Board** (Web & Mobile-First). Todas as telas, modais, tabelas e componentes devem obedecer estritamente às regras abaixo para garantir **zero componentes improvisados 1 a 1, reação tátil imediata em cliques/hovers, zero textos quebrados e zero vazamento de containers (overflow)**.

---

## 1. Biblioteca Oficial de Componentes (`shadcn/ui` + `@radix-ui`) e Reação Interativa

### 1.1 Proibido Criar Controles HTML Crus 1 a 1 nas Telas (`features/**`)
Para evitar que cada página tenha botões e dropdowns diferentes ou sem estilo, **nenhum arquivo dentro de `src/features/**` deve estilizar controles básicos do zero**:
- **Dropdowns / Seletores (`<Select>`):**
  - **PROIBIDO usar `<select>` HTML nativo do navegador** em qualquer tela ou modal.
  - **OBRIGATÓRIO** usar `<Select>` de `src/components/ui/form-controls.tsx` (que converte `<option>` automaticamente para `@radix-ui/react-select` estilizado) ou as primitivas `Select, SelectTrigger, SelectContent, SelectItem` de `src/components/ui/select.tsx`.
- **Botões (`<Button>` e `<IconButton>`):**
  - Usar `Button` (`src/components/ui/button.tsx`, baseado em `class-variance-authority` e `@radix-ui/react-slot`) com variantes padronizadas (`primary`, `secondary`, `outline`, `ghost`, `danger`, `subtle`) e tamanhos (`xs`, `sm`, `md`, `lg`, `icon`), ou `IconButton` (`src/components/ui/icon-button.tsx`).
- **Inputs e Campos (`<Input>`, `<Textarea>`, `<Field>`):**
  - Usar sempre os componentes de `src/components/ui/form-controls.tsx`.
- **Modais, Abas e Confirmações:**
  - Usar exclusivamente `Dialog` (`src/components/ui/dialog.tsx`), `Tabs` (`src/components/ui/tabs.tsx`) e `ConfirmDialog` (`src/components/ui/confirm-dialog.tsx`).

### 1.2 Reação Visual Obrigatória (Cursor, Hover, Focus & Active)
No Tailwind CSS v4, elementos `<button>` não recebem `cursor: pointer` sem definição explícita. Por isso:
- **Cursor Pointer Global:** Todo elemento clicável (`button:not(:disabled)`, `[role="button"]`, `[role="tab"]`, `[role="option"]`, `a[href]`) deve exibir `cursor: pointer` (garantido globalmente em `src/app/globals.css` e nos componentes de `src/components/ui/*`). Quando `:disabled`, deve exibir `cursor: not-allowed` e opacidade reduzida.
- **Estado de Hover Nítido:** Todo botão e seletor deve mudar claramente no hover:
  - Botão `primary`: escurece de `#0F62FE` para `#0043CE` com elevação sutil de sombra (`hover:shadow-sm`).
  - Botão `secondary` / `outline` / `SelectTrigger`: a borda reage para `hover:border-primary/60` com fundo suave.
- **Feedback Tátil de Clique (`active`):** Botões possuem micro-compressão ao clique (`active:scale-[0.98]`), dando resposta imediata ao usuário no desktop e no toque mobile.

---

## 2. Princípios Fundamentais de Engenharia Visual

### 2.1 Garantia de Zero Overflow (Anti-Break Layout Rules)
O erro mais grave em aplicações SaaS é o vazamento de textos, inputs ou botões para fora de seus cards/modais. Para impedir isso em 100% dos casos:
- **Proibido Larguras Fixas Rígidas em Flex/Grid:** Nunca use classes fixas estreitas em inputs ou selects dentro de modais ou cards sem permitir expansão. Use `w-full min-w-0` controlado pelo grid pai.
- **Regra do `min-w-0`:** Todo elemento flexível (`flex-1`) ou célula de grid que contenha texto longo, `input` ou `select` deve possuir `min-w-0`. Sem `min-w-0`, o CSS Grid/Flexbox impede o encolhimento e estoura a borda do card.
- **Proibido Colidir Rótulos na Mesma Linha:** Em cabeçalhos de cards internos, nunca coloque um `Select` largo na esquerda e um texto longo (`Proprietário: Nome...`) na direita na mesma linha sem `flex-wrap`.
- **Inputs Nativos de Data e Hora (`type="date"` e `type="time"`):**
  - Um input `date` precisa de pelo menos `140px` de largura livre.
  - Um input `time` precisa de pelo menos `95px` de largura livre.
  - **Regra:** Nunca esprema 4 inputs (`date + time + date + time`) lado a lado dentro de uma sub-coluna estreita.

### 2.2 Divulgação Progressiva (Progressive Disclosure)
- **Regra:** Mostrar apenas o essencial à primeira vista; detalhes secundários ficam sob demanda (em abas ou ao clicar).
- **Nos Cards do Calendário / Tape Chart:**
  - Exibir apenas: Canal (1 badge curto), Nome do Hóspede (`truncate`) e Valor (ou alerta curto).
- **Nos Modais Complexos:**
  - Dividir fluxos densos usando **Abas (`Tabs`)** claras (ex: Aba 1: *Reserva & Financeiro* | Aba 2: *Tarefas & Despesas Operacionais*).

### 2.3 Regra de Rótulos Limpos & Botões Únicos
- **Sem Duplicação de Símbolos:** Se o botão já possui o ícone `<Plus />`, o texto deve ser `"Nova Reserva"` ou `"Adicionar"` — **nunca** `"+ Nova Reserva"` (que gera `+ +`).
- **Ação Primária Única por Tela:** Cada página deve ter apenas **1 botão primário de criação** no cabeçalho principal (`PageHeader`).

---

## 3. Anatomia e Padrão de Modais (`Dialog`)

Todos os modais do sistema devem utilizar o componente base `Dialog` (`src/components/ui/dialog.tsx`) seguindo estas especificações:

### 3.1 Tamanhos Padronizados (Sem Conflito de Breakpoints)
- O `DialogContent` base **não deve usar prefixos de breakpoint (`sm:max-w-lg`)** que bloqueiem a sobrescrita via `tailwind-merge`.
- Escala de larguras máximas permitidas:
  - **Compacto (`max-w-md` / `448px`):** Confirmações de exclusão (`ConfirmDialog`), faturamento rápido (`BillingModal`).
  - **Padrão (`max-w-xl` / `576px` ou `max-w-2xl` / `672px`):** Criação/Edição de Reserva (`ReservationUnifiedModal`).
  - **Amplo (`max-w-4xl` / `896px`):** Central de Relatórios e Demonstrativos A4 (`CalendarReportsModal`).

### 3.2 Estrutura Tripartida Obrigatória (Header / Body / Footer)
Todo modal deve ser estruturado como `flex flex-col max-h-[90vh] overflow-hidden p-0`:
1. **Header Fixo (`shrink-0 border-b border-border px-5 py-4`):**
   - Ícone/Avatar à esquerda (`h-9 w-9 shrink-0`) + Título (`text-base font-bold`) + até 2 badges atômicos.
2. **Body Rolável (`flex-1 overflow-y-auto p-5 space-y-4 min-h-0`):**
   - Rolagem **exclusivamente vertical** (`overflow-x-hidden`).
3. **Footer Fixo (`shrink-0 border-t border-border bg-surface-muted/40 px-5 py-3.5`):**
   - Ações alinhadas à direita no desktop (`Cancel` secundário à esquerda, `Submit` primário à direita).

### 3.3 Comportamento Mobile (Bottom Sheet) e Z-Index de Popovers
- Em telas `< 640px` (`mobile`), todo modal ancora na borda inferior da tela (`inset-x-0 bottom-0 rounded-t-3xl max-h-[92vh]`).
- Popovers e menus de `SelectContent` usam `z-[80]` para abrir sempre acima da camada do `Dialog` (`z-50`).

---

## 4. Tags, Badges e Pílulas Atômicas

- **Componente Oficial:** `Badge` (`src/components/ui/badge.tsx`).
- **Dimensões e Inquebrabilidade:** Sempre aplicar `inline-flex items-center shrink-0 whitespace-nowrap rounded-full`.
- **Limite de Texto:** Máximo de 12 a 15 caracteres (ex: `Airbnb`, `Manual`, `Faturado`, `Pendente`, `Conflito`).

---

## 5. Arquitetura Responsiva (Web-Mobile Enxuto & Desktop Completo)

### 5.0 Filosofia Web-Mobile: Menos Coisas, Mais Direto
- O usuário no celular (`< 768px`) **não quer ver uma versão espremida do Desktop**.
- **Regra do Web-Mobile:**
  - Mostrar apenas as informações e ações essenciais de consulta rápida (quem entra/sai hoje, calendário direto, resumo financeiro do mês e notificações).
  - Controles secundários, filtros avançados múltiplos, gráficos secundários e geradores de relatórios A4 para impressão devem ficar ocultos ou recolhidos no celular (`hidden md:flex` / `hidden md:block`), mantendo a tela mobile limpa, leve e rápida de operar com uma mão.
  - Se o usuário precisar de análise detalhada ou configuração pesada, ele usa a visão Desktop.

### 5.1 Navegação Global
- **Desktop (`>= 1024px` / `lg`):** Sidebar lateral fixa à esquerda (`w-[260px]`).
- **Mobile & Tablet (`< 1024px`):** Sidebar de desktop oculta (`hidden lg:flex`) e **Bottom Navigation Bar fixa (`h-16`)** na base da tela com 5 destinos rápidos (*Hoje*, *Calendário*, *Imóveis*, *Financeiro*, *Menu*).

### 5.2 Listagens Responsivas: Cards no Mobile (`md:hidden`) + Tabelas no Desktop (`hidden md:block`)
- **Mobile (< 768px):** Tabelas largas são substituídas por **Cards Estruturados (`md:hidden`)**.
- **Desktop (>= 768px):** Exibir `DataTable` limpa (`hidden md:block`) envolvida por `overflow-x-auto rounded-xl border border-border`.

---

## 6. Paleta de Cores & Tokens Semânticos (Carbon Enterprise — Stitch `639271905691226277`)

| Token | Cor / Valor | Uso Principal |
| :--- | :--- | :--- |
| `--cib-color-background` | `#F4F4F4` | Fundo geral da aplicação (Cinza neutro Carbon, contraste limpo com cards brancos) |
| `--cib-color-surface` | `#FFFFFF` | Fundo de cards principais, modais, tabelas e barras de navegação |
| `--cib-color-surface-muted` | `#F4F4F4` | Fundos secundários de cards internos, cabeçalhos de tabela e estados inativos |
| `--cib-color-border` | `#E0E0E0` | Bordas sutis e estruturais de `1px` |
| `--cib-color-primary` | `#0F62FE` | Azul Executivo (IBM Blue) para ações primárias, reserva selecionada e canal Airbnb |
| `--cib-color-primary-soft` | `#D0E2FF` | Fundo suave para itens ativos, coluna HOJE e badges primárias |
| `--cib-color-text-primary` | `#161616` | Títulos, nomes de hóspedes e valores principais (Carbon Gray 100) |
| `--cib-color-text-secondary`| `#525252` | Subtítulos, descrições e rótulos de formulário (Carbon Gray 70) |
| `--cib-color-text-muted` | `#6F6F6F` | Placeholders, ícones neutros e metadados secundários (Carbon Gray 60) |
| `--cib-color-success` | `#198038` | Verde Floresta para reservas Diretas/Manuais, valores faturados e status livre |
| `--cib-color-warning` | `#B45309` | Reservas sem preço, nomes genéricos e alertas operacionais |
| `--cib-color-danger` | `#DA1E28` | Conflitos de overbooking, despesas e exclusões |

---

## 7. Checklist de Qualidade Antes de Qualquer Entrega
1. **Zero `<select>` Nativo:** Todos os dropdowns usam Radix UI (`Select` de `ui/form-controls` ou `ui/select`).
2. **Botões com Reação:** Todo botão exibe `cursor-pointer`, reação clara de hover e compressão suave no clique.
3. **Teste em 375px (Mobile) e 1280px (Desktop):** Nenhum input, botão ou texto pode vazar da caixa.
4. **Zero Loading Infinito:** Listas ou contas vazias encerram o carregamento imediatamente e exibem `<EmptyState />` orientativo.

# Check-in Board — Design System & UI Guidelines
**Theme:** Warm Luxury Hospitality (Refined SaaS & Hospitality Excellence)

---

## 1. Princípios Fundamentais de Design

### 1.1 Divulgação Progressiva (Progressive Disclosure)
- **Regra:** Nunca sobrecarregar tabelas, cards ou barras com todas as informações de uma vez.
- **Na visualização principal (Grid / Lista / Tape Chart):** Mostrar apenas o essencial para identificação rápida:
  - Nome do Hóspede (ou Unidade)
  - Canal de Origem (1 tag atômica)
  - Horário ou Status Principal
- **Detalhes Profundos:** Valores financeiros, código de confirmação longo (#HM9482X), notas internas, número de telefone e checklist completo **SÓ APARECEM** ao clicar no item (abrindo gaveta lateral / Drawer ou Modal).

### 1.2 Regra do Rótulo Limpo & Sem Redundâncias
- **Anti-padrão Proibido:** Botão com ícone `+` e texto `+ Nova Reserva` (resultando no erro visual `+ + Nova Reserva`).
- **Padrão Correto:** Se o componente possui um glifo/ícone à esquerda, o rótulo de texto deve ser estritamente textual:
  - `<PlusIcon /> Nova Reserva` (Texto: "Nova Reserva")
  - `<TrashIcon /> Excluir` (Texto: "Excluir")
  - `<FilterIcon /> Filtrar` (Texto: "Filtrar")

### 1.3 Tags e Badges Atômicos (Pílulas Pequenas e Únicas)
- **Tamanho:** Altura fixa máxima entre `20px` e `24px` (`h-5` ou `h-6`).
- **Texto:** Ultracurto e direto (ex: `Airbnb`, `Direta`, `Booking`, `Ocupado`, `Livre`, `Faxina`).
- **Regra de Composição:** **Máximo 1 tag por barra compacta**. Nunca misturar código de reserva, valor monetário, quantidade de noites e ícones dentro de uma mesma tag minúscula. Tags nunca devem quebrar linha ou estourar a largura do contêiner.

### 1.4 Estrutura de Navegação Desktop (Sidebar Lateral Retrátil)
- **Anti-padrão Proibido:** Barra superior horizontal superlotada com 9 botões espremidos.
- **Padrão Correto:** Navegação Desktop via **Sidebar Lateral Esquerda (Menu Retrátil / Colapsável)**:
  - Estado padrão: Barra estreita (64px) com ícones elegantes (Logo no topo, Operações, Calendário, Imóveis, Financeiro, Relatórios, Configurações).
  - Estado hover/expandido: Expande suavemente revelando os textos dos itens de menu com transição fluida.
  - O topo da página fica livre e limpo, contendo apenas o Título da Página, o status de sincronização (Airbnb iCal) e o Perfil do Usuário.

### 1.5 Ocupação Completa da Viewport (Sem Vazio no Rodapé)
- **Anti-padrão Proibido:** Tabelas ou calendários que terminam no meio da tela com um vazio enorme embaixo.
- **Padrão Correto:** Layout `full-height` (`h-screen`, `flex-1`). O Tape Chart e as listas se expandem preenchendo harmoniosamente a tela vertical, com linhas confortáveis (altura mínima de 56px a 64px por unidade) e rolagem suave quando necessário.

---

## 2. Paleta de Cores & Tokens

### Cores Principais
- **Primary / Destaque Terracota:** `#D85A38` (Ações primárias, botões de conversão, estados ativos)
- **Primary Hover:** `#C24C2C`
- **Primary Soft / Fundo Ativo:** `#FAF0E6` (Tons de pêssego/terracota ultra suaves para seleção)

### Superfícies e Neutros
- **Background App:** `#F9F8F6` (Off-white quente e acolhedor, rejeitando o cinza de hospital frio)
- **Surface / Card:** `#FFFFFF` (Superfície limpa com borda sutil)
- **Border Sutil:** `#E8E3DC` (Bordas de 1px com contraste suave em telas Retina e OLED)
- **Text Primary (Ardósia Escura):** `#2A3036` (Alta legibilidade, sem usar preto 100%)
- **Text Secondary / Muted:** `#6B7280`

### Cores Semânticas de Canais & Status
- **Airbnb / Confirmado (Emerald):** Fundo `#E7F1EE`, Texto `#1B3B36`, Dot `#1B3B36`
- **Reserva Direta (Terracota):** Fundo `#FAF0E6`, Texto `#D85A38`
- **Booking.com (Navy):** Fundo `#EFF6FF`, Texto `#1E40AF`
- **Turnover / Troca (Amber):** Fundo `#FEF3C7`, Texto `#B45309`
- **Manutenção / Bloqueio (Slate/Purple):** Fundo `#F3F4F6`, Texto `#4B5563`
- **WhatsApp:** `#25D366` (Botão de contato direto)

---

## 3. Tipografia & Escala
- **Fonte Principal:** `Inter`, `SF Pro Display`, `-apple-system`, `sans-serif`
- **Tamanhos:**
  - Títulos de Página: `24px` a `28px` (Font-weight 600)
  - Subtítulos e Seções: `16px` a `18px` (Font-weight 600)
  - Texto Base (Body): `14px` (Font-weight 400 ou 500)
  - Tags / Badges / Labels: `11px` a `12px` (Font-weight 600, uppercase ou capitalize)
  - Fechadura Digital / Códigos: Tipografia monoespaçada `JetBrains Mono` ou `ui-monospace` em destaque (`18px` a `22px` font-bold)

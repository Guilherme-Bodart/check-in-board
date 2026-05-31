# Design System

## Objetivo

Criar um padrao visual e tecnico para o Check-In Board antes do codigo, permitindo que cores, botoes, espacamentos, tipografia e estados mudem em um lugar central sem precisar editar tela por tela.

O design deve parecer operacional, rapido de escanear e confiavel para uso diario. O app nao deve parecer uma landing page, rede social ou painel decorativo. A prioridade e clareza.

## Principios

- Mobile first: tudo nasce para iPhone e Android.
- Operacional: a tela principal deve responder "o que precisa acontecer agora?".
- Denso, mas calmo: mostrar bastante informacao sem parecer baguncado.
- Uma fonte da verdade: tokens de tema controlam cores, fontes, raios, espacamentos e sombras.
- Estados explicitos: loading, vazio, erro, sincronizando, atrasado, concluido e sem permissao devem ter design padrao.
- Acessibilidade desde o MVP: contraste bom, areas de toque confortaveis e textos legiveis.

## Direcao Visual

O Check-In Board deve ter cara de ferramenta de operação de hospedagem:

- limpo;
- confiavel;
- direto;
- com hierarquia forte de datas, apartamentos e status;
- com poucos efeitos visuais;
- com cores usadas para significado, nao decoracao.

## Tokens De Tema

Todos os estilos globais devem ficar em `apps/mobile/src/theme`.

Estrutura sugerida:

```text
apps/mobile/src/theme
  colors.ts
  spacing.ts
  radius.ts
  typography.ts
  shadows.ts
  semantic-colors.ts
  theme.ts
```

### Cores Primitivas

As cores primitivas sao a paleta base. Elas nao devem ser usadas diretamente na maioria dos componentes; componentes devem preferir tokens semanticos.

```ts
export const palette = {
  ink: {
    950: "#151515",
    800: "#2A2A2A",
    600: "#555555",
    400: "#8A8A8A",
    200: "#D7D7D7",
    100: "#ECECEC",
    50: "#F7F7F5",
  },
  olive: {
    700: "#3D4A2E",
    600: "#52633C",
    100: "#E6EBD9",
  },
  blue: {
    700: "#1F4D63",
    600: "#2D6D85",
    100: "#DCECF1",
  },
  amber: {
    700: "#8A5A12",
    500: "#C4871D",
    100: "#F5E6C8",
  },
  red: {
    700: "#8C2F2F",
    600: "#B33A3A",
    100: "#F4DADA",
  },
  green: {
    700: "#2D6040",
    600: "#3B7D53",
    100: "#DDEBDD",
  },
  white: "#FFFFFF",
}
```

### Cores Semanticas

Componentes devem usar estes tokens:

```ts
export const semanticColors = {
  background: palette.ink[50],
  surface: palette.white,
  surfaceMuted: palette.ink[100],
  border: palette.ink[200],
  textPrimary: palette.ink[950],
  textSecondary: palette.ink[600],
  textMuted: palette.ink[400],
  primary: palette.olive[600],
  primaryPressed: palette.olive[700],
  primarySoft: palette.olive[100],
  info: palette.blue[600],
  infoSoft: palette.blue[100],
  warning: palette.amber[500],
  warningSoft: palette.amber[100],
  danger: palette.red[600],
  dangerSoft: palette.red[100],
  success: palette.green[600],
  successSoft: palette.green[100],
}
```

### Status Operacionais

```ts
export const operationStatusColors = {
  checkInToday: "info",
  checkOutToday: "warning",
  inStay: "success",
  upcoming: "primary",
  overdue: "danger",
  completed: "success",
  failed: "danger",
  syncIssue: "warning",
}
```

## Tipografia

Fonte recomendada para o app:

- `Atkinson Hyperlegible` para leitura operacional clara;
- fallback: sistema nativo.

Escala:

```ts
export const typography = {
  titleLarge: { fontSize: 28, lineHeight: 34, fontWeight: "700" },
  titleMedium: { fontSize: 22, lineHeight: 28, fontWeight: "700" },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 21, fontWeight: "400" },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
}
```

Regras:

- nao usar tamanho de fonte baseado em largura de tela;
- nao usar letter spacing negativo;
- limitar textos longos com quebra clara ou truncamento intencional;
- datas e nomes de apartamentos devem ter prioridade visual.

## Espacamento

Usar escala fixa:

```ts
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
}
```

Regras:

- tela usa padding horizontal `16`;
- grupos relacionados usam gap `8` ou `12`;
- secoes usam separacao `24`;
- listas operacionais devem economizar altura sem apertar area de toque.

## Radius E Bordas

```ts
export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
}
```

Regras:

- cards e linhas operacionais usam ate `8`;
- `pill` apenas para badges e filtros pequenos;
- modais podem usar `12`;
- evitar cards dentro de cards.

## Componentes Base

Todos os componentes reutilizaveis devem viver em `apps/mobile/src/components`.

### Button

Variantes:

- `primary`
- `secondary`
- `ghost`
- `danger`
- `icon`

Estados:

- default
- pressed
- loading
- disabled

Regras:

- botoes usam tokens semanticos;
- icones via `lucide-react-native` quando existir;
- altura minima `44`;
- texto nao deve quebrar dentro de botoes principais.

### Text

Criar componente `AppText` com variantes de tipografia. Telas nao devem usar estilos soltos de texto quando uma variante existente resolve.

### Screen

Componente base com:

- safe area;
- background global;
- padding padrao;
- suporte a loading e erro quando fizer sentido.

### ListItem

Usado para apartamentos, reservas e tarefas.

Campos comuns:

- titulo;
- subtitulo;
- status badge;
- metadados curtos;
- acao principal quando aplicavel.

### Badge

Usado para status:

- `Check-in`
- `Check-out`
- `In stay`
- `Upcoming`
- `Pending`
- `Done`
- `Not done`
- `Sync issue`

### EmptyState

Deve ser curto e acionavel:

- titulo direto;
- texto auxiliar minimo;
- botao quando houver proxima acao.

### ErrorState

Deve ter:

- mensagem simples;
- botao de tentar novamente quando aplicavel;
- codigo tecnico apenas em telas internas ou debug.

## Telas Principais

### Today Board

Tela inicial do app.

Deve mostrar:

- data atual;
- filtros rapidos;
- contadores de check-ins, check-outs e tarefas pendentes;
- lista operacional agrupada por apartamento ou horario;
- indicador de última sincronização.

### Apartment Detail

Deve mostrar:

- reservas proximas;
- tarefas abertas;
- canais conectados;
- status de sync.

### Reservation Detail

Deve mostrar:

- apartamento;
- canal;
- periodo;
- status operacional;
- tarefas relacionadas.

### Task Detail

Deve mostrar:

- tarefa;
- apartamento;
- reserva relacionada quando houver;
- prazo;
- status;
- botao para marcar `Done` ou `Not done` quando permitido.

## Theming

Regra central: nenhuma tela deve importar uma cor hexadecimal direta.

Permitido:

```ts
import { theme } from "@/theme"
```

Nao permitido:

```ts
backgroundColor: "#FFFFFF"
```

Alterar a paleta deve acontecer em:

- `colors.ts` para cores primitivas;
- `semantic-colors.ts` para significado;
- componentes base para comportamento visual.

## Acessibilidade

- area minima de toque: `44x44`;
- contraste AA para textos importantes;
- labels claros em botoes de icone;
- feedback visual para loading e disabled;
- nao depender apenas de cor para status critico.

## Iconografia

Usar `lucide-react-native`.

Sugestoes:

- calendario: `CalendarDays`
- apartamento: `Building2`
- tarefa: `ClipboardCheck`
- equipe: `Users`
- sync: `RefreshCw`
- alerta: `TriangleAlert`
- concluido: `CircleCheck`
- pendente: `Clock`
- configuracao: `Settings`

## Boas Praticas De UI

- evitar telas explicativas longas dentro do app;
- priorizar a tarefa do usuário, não texto de marketing;
- sempre mostrar estados de carregamento;
- listas devem ter pull-to-refresh;
- data e status devem ser vistos sem abrir detalhe;
- ações destrutivas precisam de confirmação;
- esconder ações quando o papel não permite executá-las.

## Checklist Antes De Implementar UI

- O componente usa tokens de tema?
- A tela funciona em tela pequena?
- Existe estado vazio?
- Existe estado de erro?
- Existe estado de loading?
- As permissões removem ações proibidas?
- A informacao principal aparece sem rolagem excessiva?
- A cor comunica significado consistente?

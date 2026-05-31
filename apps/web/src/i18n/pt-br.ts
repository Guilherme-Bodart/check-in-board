export const ptBR = {
  metadata: {
    title: "Check-In Board",
    description: "Painel operacional para reservas, tarefas e sincronização iCal.",
  },
  common: {
    appName: "Check-In Board",
    loadingEnvironment: "Carregando ambiente...",
    signOut: "Sair",
  },
  shell: {
    sidebarLabel: "Navegação principal",
    operationalManagement: "Gestão operacional",
    fallbackEyebrow: "Check-In Board",
    fallbackTitle: "Operação",
    routes: {
      apartments: { eyebrow: "Gestão", title: "Meus apartamentos", navLabel: "Meus apartamentos" },
      calendar: { eyebrow: "Operação", title: "Calendário", navLabel: "Calendário" },
      clients: { eyebrow: "Gestão", title: "Clientes e proprietários", navLabel: "Clientes" },
      settings: { eyebrow: "Conta", title: "Configurações", navLabel: "Configurações" },
      dashboard: { eyebrow: "Operação", title: "Dashboard", navLabel: "Dashboard" },
      finance: { eyebrow: "Gestão", title: "Financeiro", navLabel: "Financeiro" },
      reservations: { eyebrow: "Operação", title: "Reservas", navLabel: "Reservas" },
    },
  },
  auth: {
    errors: {
      authFailed: "Falha ao autenticar.",
    },
  },
} as const;

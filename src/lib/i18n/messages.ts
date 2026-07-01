import type { AppLocale } from "@/lib/i18n/config";

export type I18nMessages = {
  common: {
    appName: string;
    save: string;
    saving: string;
    language: string;
  };
  languages: Record<AppLocale, { label: string; shortLabel: string; visual: string }>;
  navigation: {
    overview: string;
    agenda: string;
    deals: string;
    notes: string;
    contacts: string;
    companies: string;
    tickets: string;
    settings: string;
    crmNavigation: string;
    home: string;
  };
  shell: {
    workspace: string;
    enterpriseWorkspace: string;
    openNavigation: string;
    workspaceNavigation: string;
    switchModules: string;
    toggleSidebar: string;
    liveShell: string;
    searchPlaceholder: string;
    notifications: string;
    workspaceAdmin: string;
    productionBaseline: string;
    securityTitle: string;
    securityDescription: string;
    breadcrumbOverview: string;
  };
  dashboard: {
    badgeBaseline: string;
    badgeRls: string;
    heroTitle: string;
    heroDescription: string;
    reviewWorkspaceHealth: string;
    quickCaptureTitle: string;
    quickCaptureDescription: string;
    metrics: {
      totalContacts: string;
      companies: string;
      dealPipelineRevenue: string;
      supportTickets: string;
      contactsHint: string;
      companiesHint: string;
      revenueHint: string;
      ticketsHint: string;
      liveCount: string;
      liveSum: string;
      contactsTrend: string;
      companiesTrend: string;
      revenueTrend: string;
      ticketsTrend: string;
    };
    pipeline: {
      title: string;
      description: string;
      placeholderBadge: string;
      activeOpportunities: string;
      empty: string;
      stages: {
        qualification: string;
        discovery: string;
        proposal: string;
        negotiation: string;
      };
      placeholders: {
        closesOn: string;
      };
    };
    activities: {
      title: string;
      description: string;
      recordedBy: string;
      types: {
        company: string;
        contact: string;
        deal: string;
        ticket: string;
      };
      placeholder: {
        one: string;
        two: string;
        three: string;
        four: string;
      };
    };
    reportingRange: {
      placeholder: string;
      live: string;
    };
  };
  quickCapture: {
    titleLabel: string;
    titlePlaceholder: string;
    entityTypeLabel: string;
    entityTypes: {
      deal: string;
      contact: string;
      ticket: string;
      company: string;
    };
    initialMessage: string;
    submit: string;
    submitting: string;
    successPrefix: string;
    successSuffix: string;
    reviewError: string;
    validation: {
      titleMin: string;
      titleMax: string;
    };
  };
  settings: {
    badge: string;
    title: string;
    description: string;
    submenuAriaLabel: string;
    generalTab: string;
    generalTabDescription: string;
    calendarTab: string;
    calendarTabDescription: string;
    languageCardTitle: string;
    languageCardDescription: string;
    helperText: string;
    confirmation: string;
    detectBrazil: string;
    currentSelection: string;
    accessibilityHint: string;
  };
  modules: {
    cta: string;
    helper: string;
    deals: {
      title: string;
      badge: string;
      description: string;
    };
    contacts: {
      title: string;
      badge: string;
      description: string;
    };
    companies: {
      title: string;
      badge: string;
      description: string;
    };
    tickets: {
      title: string;
      badge: string;
      description: string;
    };
  };
  errors: {
    globalLabel: string;
    globalTitle: string;
    globalDescription: string;
    retry: string;
    backHome: string;
  };
};

export const messages: Record<AppLocale, I18nMessages> = {
  "en-US": {
    common: {
      appName: "OslerNotes CRM",
      save: "Save changes",
      saving: "Saving...",
      language: "Language",
    },
    languages: {
      "en-US": { label: "English (United States)", shortLabel: "English", visual: "EN" },
      "pt-BR": { label: "Português Brasileiro", shortLabel: "PT-BR", visual: "BR" },
    },
    navigation: {
      overview: "Overview",
      agenda: "Agenda",
      deals: "Deals",
      notes: "Notes",
      contacts: "Contacts",
      companies: "Companies",
      tickets: "Tickets",
      settings: "Settings",
      crmNavigation: "CRM navigation",
      home: "Home",
    },
    shell: {
      workspace: "Workspace",
      enterpriseWorkspace: "Enterprise workspace",
      openNavigation: "Open navigation",
      workspaceNavigation: "Workspace Navigation",
      switchModules: "Switch between CRM modules from the collapsible sidebar.",
      toggleSidebar: "Toggle sidebar",
      liveShell: "Live shell",
      searchPlaceholder: "Search accounts, people, or tickets",
      notifications: "Notifications",
      workspaceAdmin: "Workspace Admin",
      productionBaseline: "Production baseline",
      securityTitle: "RLS-ready foundation",
      securityDescription: "Workspace-first tables and scoped server reads.",
      breadcrumbOverview: "Overview",
    },
    dashboard: {
      badgeBaseline: "Enterprise-ready baseline",
      badgeRls: "RLS-minded architecture",
      heroTitle: "Operational clarity for every account, pipeline, and support motion.",
      heroDescription:
        "{workspaceName} starts with a secure Supabase-authenticated dashboard, direct server reads, and row-level security for shared and private CRM data.",
      reviewWorkspaceHealth: "Review workspace health",
      quickCaptureTitle: "Quick Capture",
      quickCaptureDescription: "Sample Server Action flow for secure form submission.",
      metrics: {
        totalContacts: "Total Contacts",
        companies: "Companies",
        dealPipelineRevenue: "Deal Pipeline Revenue",
        supportTickets: "Support Tickets",
        contactsHint: "Qualified contacts across active accounts",
        companiesHint: "Accounts currently associated with pipeline activity",
        revenueHint: "Weighted value across active opportunity stages",
        ticketsHint: "Open and pending tickets awaiting follow-through",
        liveCount: "Live workspace count",
        liveSum: "Live workspace sum",
        contactsTrend: "+8.2% vs last month",
        companiesTrend: "+14 net new accounts",
        revenueTrend: "+12.6% quarter to date",
        ticketsTrend: "-6 from last week",
      },
      pipeline: {
        title: "Deals Pipeline",
        description:
          "Kanban-style stage overview designed for future drag-and-drop workflows.",
        placeholderBadge: "Pipeline placeholder",
        activeOpportunities: "active opportunities",
        empty: "Live deals will appear here as soon as the shared Supabase tables receive records.",
        stages: {
          qualification: "Qualification",
          discovery: "Discovery",
          proposal: "Proposal",
          negotiation: "Negotiation",
        },
        placeholders: {
          closesOn: "Closes",
        },
      },
      activities: {
        title: "Recent Activities",
        description:
          "Workspace events prepared for future audit logging and team coordination.",
        recordedBy: "Recorded by",
        types: {
          company: "company",
          contact: "contact",
          deal: "deal",
          ticket: "ticket",
        },
        placeholder: {
          one: "Proposal packet sent for OslerNotes Enterprise Suite.",
          two: "New stakeholder added to Northwind Expansion.",
          three: "Priority support ticket moved to pending vendor review.",
          four: "Account health review scheduled for Granite Bio.",
        },
      },
      reportingRange: {
        placeholder: "Performance snapshot for this quarter",
        live: "Live CRM data from your current Supabase workspace",
      },
    },
    quickCapture: {
      titleLabel: "Quick capture title",
      titlePlaceholder: "Capture deal follow-up, ticket summary, or contact note",
      entityTypeLabel: "Entity type",
      entityTypes: {
        deal: "Deal",
        contact: "Contact",
        ticket: "Ticket",
        company: "Company",
      },
      initialMessage: "Capture a quick operational note without leaving the dashboard.",
      submit: "Submit placeholder",
      submitting: "Capturing...",
      successPrefix: "Queued a placeholder",
      successSuffix: "note for",
      reviewError: "Review the highlighted fields and try again.",
      validation: {
        titleMin: "Enter at least 3 characters.",
        titleMax: "Keep the title under 80 characters.",
      },
    },
    settings: {
      badge: "User preferences",
      title: "Profile and language settings",
      description:
        "Manage display preferences for the current browser session and keep the platform interface consistent across all pages.",
      submenuAriaLabel: "Settings sections",
      generalTab: "General",
      generalTabDescription: "Language, accessibility, and interface preferences for the current session.",
      calendarTab: "Calendar",
      calendarTabDescription:
        "Connect Google and Apple calendars, review status, and manage sync credentials.",
      languageCardTitle: "Display language",
      languageCardDescription:
        "Choose the language used by navigation, dashboards, forms, and placeholder modules.",
      helperText:
        "Selecting Português Brasileiro loads the dedicated pt-BR translation dictionary and updates the entire application on save.",
      confirmation: "Language settings saved successfully.",
      detectBrazil: "Brazilian visitors are pre-selected automatically when regional headers indicate Brazil.",
      currentSelection: "Current selection",
      accessibilityHint:
        "The selector uses a native control with screen-reader friendly labels and confirmation feedback.",
    },
    modules: {
      cta: "Extend this module",
      helper: "Route scaffolded and ready for RSC data and Server Actions.",
      deals: {
        title: "Deals Workspace",
        badge: "Pipeline route",
        description:
          "This route is scaffolded for deeper opportunity workflows, stage transitions, and server-rendered deal detail surfaces.",
      },
      contacts: {
        title: "Contacts",
        badge: "Contacts route",
        description:
          "This route is prepared for account-linked people records, scoped search, and future Server Action workflows for profile enrichment.",
      },
      companies: {
        title: "Companies",
        badge: "Accounts route",
        description:
          "This route is ready for account intelligence, firmographic snapshots, and company-centric health indicators rendered on the server.",
      },
      tickets: {
        title: "Support Tickets",
        badge: "Support route",
        description:
          "This route is prepared for SLA-aware ticket queues, ownership routing, and activity-linked support operations.",
      },
    },
    errors: {
      globalLabel: "Global error boundary",
      globalTitle: "OslerNotes CRM hit a critical rendering error.",
      globalDescription:
        "The application stopped before a route-level recovery boundary could take over. Retry once, then review the server logs and environment variables.",
      retry: "Retry render",
      backHome: "Go to dashboard",
    },
  },
  "pt-BR": {
    common: {
      appName: "OslerNotes CRM",
      save: "Salvar alterações",
      saving: "Salvando...",
      language: "Idioma",
    },
    languages: {
      "en-US": { label: "English (United States)", shortLabel: "English", visual: "EN" },
      "pt-BR": { label: "Português Brasileiro", shortLabel: "PT-BR", visual: "BR" },
    },
    navigation: {
      overview: "Visão geral",
      agenda: "Agenda",
      deals: "Negócios",
      notes: "Anotações",
      contacts: "Contatos",
      companies: "Empresas",
      tickets: "Chamados",
      settings: "Configurações",
      crmNavigation: "Navegação do CRM",
      home: "Início",
    },
    shell: {
      workspace: "Workspace",
      enterpriseWorkspace: "Workspace corporativo",
      openNavigation: "Abrir navegação",
      workspaceNavigation: "Navegação do workspace",
      switchModules: "Alterne entre os módulos do CRM pela barra lateral recolhível.",
      toggleSidebar: "Alternar barra lateral",
      liveShell: "Shell ativa",
      searchPlaceholder: "Buscar contas, pessoas ou chamados",
      notifications: "Notificações",
      workspaceAdmin: "Administrador do workspace",
      productionBaseline: "Base de produção",
      securityTitle: "Fundação pronta para RLS",
      securityDescription: "Tabelas orientadas por workspace e leituras com escopo.",
      breadcrumbOverview: "Visão geral",
    },
    dashboard: {
      badgeBaseline: "Base pronta para enterprise",
      badgeRls: "Arquitetura orientada a RLS",
      heroTitle: "Clareza operacional para cada conta, pipeline e operação de suporte.",
      heroDescription:
        "{workspaceName} começa com um dashboard autenticado via Supabase, leituras diretas no servidor e row-level security para dados compartilhados e privados.",
      reviewWorkspaceHealth: "Revisar saúde do workspace",
      quickCaptureTitle: "Registro rápido",
      quickCaptureDescription: "Exemplo de Server Action para envio seguro de formulários.",
      metrics: {
        totalContacts: "Total de contatos",
        companies: "Empresas",
        dealPipelineRevenue: "Receita do pipeline",
        supportTickets: "Chamados de suporte",
        contactsHint: "Contatos qualificados em contas ativas",
        companiesHint: "Contas atualmente associadas à atividade comercial",
        revenueHint: "Valor ponderado nas etapas ativas de oportunidade",
        ticketsHint: "Chamados abertos e pendentes aguardando continuidade",
        liveCount: "Contagem ativa do workspace",
        liveSum: "Soma ativa do workspace",
        contactsTrend: "+8,2% em relação ao mês passado",
        companiesTrend: "+14 novas contas líquidas",
        revenueTrend: "+12,6% no trimestre",
        ticketsTrend: "-6 em relação à última semana",
      },
      pipeline: {
        title: "Pipeline de negócios",
        description:
          "Visão por etapas em estilo Kanban preparada para fluxos futuros de arrastar e soltar.",
        placeholderBadge: "Placeholder do pipeline",
        activeOpportunities: "oportunidades ativas",
        empty: "Os negócios ao vivo aparecerão aqui assim que as tabelas compartilhadas do Supabase receberem registros.",
        stages: {
          qualification: "Qualificação",
          discovery: "Descoberta",
          proposal: "Proposta",
          negotiation: "Negociação",
        },
        placeholders: {
          closesOn: "Fecha em",
        },
      },
      activities: {
        title: "Atividades recentes",
        description:
          "Eventos do workspace preparados para auditoria futura e coordenação da equipe.",
        recordedBy: "Registrado por",
        types: {
          company: "empresa",
          contact: "contato",
          deal: "negócio",
          ticket: "chamado",
        },
        placeholder: {
          one: "Pacote de proposta enviado para OslerNotes Enterprise Suite.",
          two: "Novo stakeholder adicionado à expansão Northwind.",
          three: "Chamado prioritário movido para revisão pendente do fornecedor.",
          four: "Revisão de saúde da conta agendada para Granite Bio.",
        },
      },
      reportingRange: {
        placeholder: "Resumo de desempenho deste trimestre",
        live: "Dados do CRM carregados do seu workspace atual no Supabase",
      },
    },
    quickCapture: {
      titleLabel: "Título do registro rápido",
      titlePlaceholder: "Registre um follow-up, resumo de chamado ou nota de contato",
      entityTypeLabel: "Tipo de entidade",
      entityTypes: {
        deal: "Negócio",
        contact: "Contato",
        ticket: "Chamado",
        company: "Empresa",
      },
      initialMessage: "Registre uma nota operacional sem sair do dashboard.",
      submit: "Salvar placeholder",
      submitting: "Salvando...",
      successPrefix: "Placeholder de",
      successSuffix: "enfileirado para",
      reviewError: "Revise os campos destacados e tente novamente.",
      validation: {
        titleMin: "Informe pelo menos 3 caracteres.",
        titleMax: "Mantenha o título com no máximo 80 caracteres.",
      },
    },
    settings: {
      badge: "Preferências do usuário",
      title: "Configurações de perfil e idioma",
      description:
        "Gerencie preferências de exibição do navegador atual e mantenha a interface consistente em todas as páginas.",
      submenuAriaLabel: "Seções das configurações",
      generalTab: "Geral",
      generalTabDescription: "Idioma, acessibilidade e preferências visuais da sessão atual.",
      calendarTab: "Calendário",
      calendarTabDescription:
        "Conecte agendas Google e Apple, acompanhe o status e gerencie credenciais de sincronização.",
      languageCardTitle: "Idioma de exibição",
      languageCardDescription:
        "Escolha o idioma usado na navegação, dashboards, formulários e módulos placeholder.",
      helperText:
        "Ao selecionar Português Brasileiro, o sistema carrega automaticamente o dicionário dedicado de tradução pt-BR e atualiza toda a aplicação após salvar.",
      confirmation: "Configurações de idioma salvas com sucesso.",
      detectBrazil:
        "Visitantes identificados como Brasil por cabeçalhos regionais recebem Português Brasileiro como padrão inicial.",
      currentSelection: "Seleção atual",
      accessibilityHint:
        "O seletor usa controle nativo, rótulos claros e feedback compatível com leitores de tela.",
    },
    modules: {
      cta: "Expandir este módulo",
      helper: "Rota estruturada e pronta para dados via RSC e Server Actions.",
      deals: {
        title: "Workspace de negócios",
        badge: "Rota do pipeline",
        description:
          "Esta rota foi preparada para fluxos mais profundos de oportunidades, transições de etapas e superfícies de detalhe renderizadas no servidor.",
      },
      contacts: {
        title: "Contatos",
        badge: "Rota de contatos",
        description:
          "Esta rota está pronta para registros de pessoas ligados a contas, busca com escopo e futuros fluxos de enriquecimento via Server Actions.",
      },
      companies: {
        title: "Empresas",
        badge: "Rota de contas",
        description:
          "Esta rota está pronta para inteligência de contas, visão firmográfica e indicadores de saúde renderizados no servidor.",
      },
      tickets: {
        title: "Chamados de suporte",
        badge: "Rota de suporte",
        description:
          "Esta rota foi preparada para filas com SLA, roteamento por responsável e operações de suporte ligadas às atividades.",
      },
    },
    errors: {
      globalLabel: "Limite global de erro",
      globalTitle: "OslerNotes CRM encontrou um erro crítico de renderização.",
      globalDescription:
        "A aplicação foi interrompida antes que um fallback de rota pudesse assumir. Tente novamente e, se persistir, revise os logs do servidor e as variáveis de ambiente.",
      retry: "Tentar novamente",
      backHome: "Ir para o dashboard",
    },
  },
};

export function getMessages(locale: AppLocale) {
  return messages[locale];
}

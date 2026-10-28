import { systems } from "../../lib/autocheck";
import type {
  CheckupTemplate,
  Component,
  DiagnosticFlow,
  TechnicalSource,
  TechnicalSystem,
  TemplateApplicability,
} from "./models";
export const technicalSystems: TechnicalSystem[] = systems.map((name, i) => ({
  id: `system-${i}`,
  name,
}));
export const technicalSources: TechnicalSource[] = [
  {
    id: "source-demo",
    title: "Roteiro demonstrativo AutoCheck",
    reference:
      "Orientações genéricas de observação. Não substitui manual de reparação nem especifica tolerâncias de fabricante.",
    verified: false,
    demonstration: true,
  },
];
export const components: Component[] = [
  "Motor e transmissão",
  "Discos e pastilhas",
  "Amortecedores, buchas e articulações",
  "Bateria e iluminação",
  "Pneus e rodas",
  "Fluidos e filtros",
  "Fixações e mecanismos da blindagem",
].map((name, i) => ({
  id: `component-${i}`,
  systemId: `system-${i === 6 ? 2 : i}`,
  name,
  sourceIds: ["source-demo"],
}));
export const generalRule: TemplateApplicability = {
  makes: [],
  models: [],
  variants: [],
  engines: [],
  yearFrom: null,
  yearTo: null,
  requiresIdentification: false,
};
const names = [
  "Check-up Pré-Viagem",
  "Check-up Blindagem Completa",
  "Check-up de Freios",
  "Check-up de Suspensão e Direção",
  "Check-up de Motor e Injeção",
];
export const demoTemplates: CheckupTemplate[] = names.map((name, i) => {
  const indices = [
    [0, 1, 2, 3, 4, 5],
    [0, 1, 2, 3, 4, 5, 6],
    [1],
    [2],
    [0, 3, 5],
  ][i];
  const items = indices.map((n) => ({
    id: `demo-item-${i}-${n}`,
    componentId: `component-${n}`,
    system: systems[n === 6 ? 2 : n],
    title: `Verificar ${components[n].name.toLowerCase()}`,
    instruction:
      n === 6
        ? "Confirmar documentação da blindagem e avaliar visualmente mecanismos acessíveis. Sem desmontagem ou certificação balística."
        : "Observar condição, indícios de desgaste, ruídos ou vazamentos, conforme acesso seguro. Consultar documentação técnica específica antes de interpretar medições.",
    required: true,
    measurementRequired: false,
    evidenceRequired: false,
    sourceIds: ["source-demo"],
  }));
  const id = `demo-template-${i}`;
  const common = {
    name,
    description:
      "Modelo demonstrativo genérico; adequar ao veículo e aos procedimentos de segurança. Não contém parâmetros de fabricante.",
    category: i === 1 ? "Inspeção visual de blindagem" : "Preventiva",
    estimatedMinutes: indices.length * 10,
    demonstration: true,
    items,
    applicability: { ...generalRule },
  };
  return {
    id,
    ...common,
    status: "published",
    versions: [
      {
        id: `${id}-v1`,
        templateId: id,
        number: 1,
        ...common,
        systems: [...new Set(items.map((x) => x.system))],
        publishedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
});
export const suspensionFlow: DiagnosticFlow = {
  id: "demo-suspension",
  name: "Investigação de ruído na suspensão",
  version: 1,
  startNodeId: "symptom",
  demonstration: true,
  sourceIds: ["source-demo"],
  nodes: [
    {
      id: "symptom",
      type: "question",
      title: "O ruído foi reproduzido em condição segura?",
      detail:
        "Registre quando ocorre. Não execute teste de rodagem se houver indício de risco.",
      transitions: [
        { answer: "Sim", to: "inspect" },
        { answer: "Não", to: "inconclusive" },
      ],
    },
    {
      id: "inspect",
      type: "instruction",
      title: "Inspecione visualmente os componentes acessíveis",
      detail:
        "Com veículo imobilizado e apoiado conforme procedimento seguro, observe fixações, buchas e amortecedores. Não conclua defeito por ruído isolado.",
      transitions: [
        { answer: "Inspeção realizada", to: "measure" },
        { answer: "Sem acesso seguro", to: "inconclusive" },
      ],
    },
    {
      id: "measure",
      type: "measurement",
      title: "Registre observação ou medição disponível",
      detail:
        "Inclua unidade e método quando houver medição. Não há tolerância de fabricante cadastrada; o valor não será comparado automaticamente.",
      transitions: [{ answer: "*", to: "condition" }],
    },
    {
      id: "condition",
      type: "condition",
      title: "Há indício visual relacionado ao ruído?",
      detail:
        "Considere somente evidências observadas; uma correlação é hipótese, não diagnóstico confirmado.",
      transitions: [
        { answer: "Sim", to: "hypothesis" },
        { answer: "Não", to: "inconclusive" },
      ],
    },
    {
      id: "hypothesis",
      type: "end",
      title: "Hipótese a confirmar",
      detail: "A investigação encontrou indícios, mas não confirma a causa.",
      hypothesis:
        "Possível relação do ruído com fixações, buchas ou amortecedores.",
      confirmationTest:
        "Localizar o componente com evidência direta e comparar a condição ao procedimento técnico aplicável. Registrar método, resultado e fonte consultada antes de confirmar.",
      transitions: [],
    },
    {
      id: "inconclusive",
      type: "end",
      title: "Investigação inconclusiva",
      detail:
        "Não há evidência suficiente. Documente as limitações e programe avaliação complementar segura.",
      inconclusive: true,
      transitions: [],
    },
  ],
};

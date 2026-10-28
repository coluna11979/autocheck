import {
  emptyInspection,
  type Inspection as LegacyInspection,
} from "../../lib/autocheck";
import {
  CheckupTemplateSchema,
  FindingSchema,
  InspectionResultSchema,
  VehicleSchema,
  type CheckupTemplate,
  type CheckupTemplateVersion,
  type DiagnosticFlow,
  type DiagnosticSession,
  type Finding,
  type Inspection,
  type InspectionResult,
  type Store,
  type TemplateApplicability,
  type Vehicle,
} from "./models";
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export function registerVehicle(input: Vehicle, vehicles: Vehicle[]): Vehicle {
  const v = VehicleSchema.parse({
    ...input,
    plate: input.plate.replace(/[-\s]/g, ""),
    identification:
      input.variant.trim() &&
      input.engine.trim() &&
      input.fuel.trim() &&
      input.transmission.trim()
        ? "identified"
        : "pending",
  });
  if (vehicles.some((x) => x.id !== v.id && x.plate === v.plate))
    throw new Error("Já existe um veículo com esta placa.");
  return v;
}
export function applicability(
  vehicle: Vehicle,
  rule: TemplateApplicability,
): { allowed: boolean; reason: string } {
  if (
    (rule.requiresIdentification ||
      rule.variants.length ||
      rule.engines.length) &&
    vehicle.identification === "pending"
  )
    return {
      allowed: false,
      reason:
        "Identificação pendente: informe versão, motorização, combustível e transmissão.",
    };
  const equal = (a: string, b: string) =>
    a.toLocaleLowerCase("pt-BR") === b.toLocaleLowerCase("pt-BR");
  for (const [values, value] of [
    [rule.makes, vehicle.make],
    [rule.models, vehicle.model],
    [rule.variants, vehicle.variant],
    [rule.engines, vehicle.engine],
  ] as [string[], string][])
    if (values.length && !values.some((v) => equal(v, value)))
      return {
        allowed: false,
        reason: "Veículo fora da regra de aplicabilidade.",
      };
  if (
    (rule.yearFrom !== null && vehicle.year < rule.yearFrom) ||
    (rule.yearTo !== null && vehicle.year > rule.yearTo)
  )
    return { allowed: false, reason: "Ano fora da faixa aplicável." };
  return {
    allowed: true,
    reason:
      vehicle.identification === "pending"
        ? "Identificação pendente: somente verificações genéricas."
        : "Aplicabilidade verificada com os dados informados.",
  };
}
export function publishTemplate(template: CheckupTemplate): CheckupTemplate {
  const t = CheckupTemplateSchema.parse(template);
  if (t.status === "archived")
    throw new Error("Modelo arquivado. Duplique para continuar.");
  if (new Set(t.items.map((i) => i.id)).size !== t.items.length)
    throw new Error("Itens duplicados.");
  const version: CheckupTemplateVersion = {
    id: uid(),
    templateId: t.id,
    number: Math.max(0, ...t.versions.map((v) => v.number)) + 1,
    name: t.name,
    description: t.description,
    category: t.category,
    estimatedMinutes: t.estimatedMinutes,
    systems: [...new Set(t.items.map((i) => i.system))],
    items: structuredClone(t.items),
    applicability: structuredClone(t.applicability),
    publishedAt: now(),
    demonstration: t.demonstration,
  };
  return { ...t, status: "published", versions: [...t.versions, version] };
}
export function saveTemplateDraft(
  next: CheckupTemplate,
  previous?: CheckupTemplate,
): CheckupTemplate {
  if (previous?.status === "archived") throw new Error("Modelo arquivado.");
  return CheckupTemplateSchema.parse({
    ...next,
    status: "draft",
    versions: previous?.versions ?? [],
  });
}
export function duplicateTemplate(t: CheckupTemplate): CheckupTemplate {
  return {
    ...structuredClone(t),
    id: uid(),
    name: `${t.name} (cópia)`,
    status: "draft",
    demonstration: false,
    versions: [],
  };
}
export function startInspection(
  vehicle: Vehicle,
  template: CheckupTemplate,
): Inspection {
  if (template.status !== "published")
    throw new Error("Publique o modelo antes de iniciar.");
  const version = template.versions.at(-1);
  if (!version) throw new Error("Sem versão publicada.");
  const match = applicability(vehicle, version.applicability);
  if (!match.allowed) throw new Error(match.reason);
  return {
    id: uid(),
    vehicleId: vehicle.id,
    vehicleSnapshot: structuredClone(vehicle),
    templateSnapshot: structuredClone(version),
    results: version.items.map((item) => ({
      itemId: item.id,
      status: "unchecked",
      observation: "",
      measurement: "",
      evidence: "",
    })),
    limitations: "",
    status: "in-progress",
    createdAt: now(),
    completedAt: null,
  };
}
export function updateResult(
  inspection: Inspection,
  result: InspectionResult,
): Inspection {
  if (inspection.status === "completed")
    throw new Error("Inspeção encerrada é imutável.");
  const r = InspectionResultSchema.parse(result);
  if (!inspection.results.some((x) => x.itemId === r.itemId))
    throw new Error("Item não pertence à inspeção.");
  return {
    ...inspection,
    results: inspection.results.map((x) => (x.itemId === r.itemId ? r : x)),
  };
}
export function completeInspection(i: Inspection): Inspection {
  for (const item of i.templateSnapshot.items) {
    const r = i.results.find((x) => x.itemId === item.id);
    if (!r) throw new Error("Resultado ausente.");
    if (item.required && r.status === "unchecked")
      throw new Error(
        `Verifique ou justifique como não aplicável: ${item.title}`,
      );
    if (r.status === "not-applicable" && !r.observation.trim())
      throw new Error("Justifique os itens não aplicáveis.");
    if (
      r.status !== "not-applicable" &&
      r.status !== "unchecked" &&
      ((item.measurementRequired && !r.measurement.trim()) ||
        (item.evidenceRequired && !r.evidence.trim()))
    )
      throw new Error("Preencha as medições e evidências obrigatórias.");
  }
  return { ...i, status: "completed", completedAt: now() };
}
export function validateFlow(flow: DiagnosticFlow) {
  const ids = new Set(flow.nodes.map((n) => n.id));
  if (ids.size !== flow.nodes.length || !ids.has(flow.startNodeId))
    throw new Error("Nós inválidos.");
  for (const n of flow.nodes) {
    if (n.type !== "end" && !n.transitions.length)
      throw new Error("Nó sem saída.");
    if (
      new Set(n.transitions.map((t) => t.answer)).size !== n.transitions.length
    )
      throw new Error("Transição ambígua.");
    if (n.transitions.some((t) => !ids.has(t.to)))
      throw new Error("Transição sem destino.");
  }
  const visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw new Error("Fluxo contém ciclo.");
    if (visited.has(id)) return;
    visiting.add(id);
    flow.nodes
      .find((n) => n.id === id)!
      .transitions.forEach((t) => visit(t.to));
    visiting.delete(id);
    visited.add(id);
  }
  flow.nodes.forEach((n) => visit(n.id));
}
export function startDiagnostic(
  vehicleId: string,
  flow: DiagnosticFlow,
): DiagnosticSession {
  validateFlow(flow);
  return {
    id: uid(),
    vehicleId,
    flowSnapshot: structuredClone(flow),
    answers: [],
    currentNodeId: flow.startNodeId,
    status: "in-progress",
    limitations: "",
    createdAt: now(),
  };
}
export function answerDiagnostic(
  session: DiagnosticSession,
  value: string,
  evidence: string,
): DiagnosticSession {
  if (session.status !== "in-progress")
    throw new Error("Investigação encerrada.");
  validateFlow(session.flowSnapshot);
  if (session.answers.length >= 50)
    throw new Error("Limite de passos atingido.");
  const node = session.flowSnapshot.nodes.find(
    (n) => n.id === session.currentNodeId,
  );
  if (!node || node.type === "end") throw new Error("Sem pergunta ativa.");
  if (!value.trim()) throw new Error("Preencha a resposta.");
  const transition =
    node.transitions.find((t) => t.answer === value) ||
    node.transitions.find((t) => t.answer === "*");
  if (!transition) throw new Error("Resposta não prevista.");
  const target = session.flowSnapshot.nodes.find(
    (n) => n.id === transition.to,
  )!;
  return {
    ...session,
    answers: [
      ...session.answers,
      { nodeId: node.id, value, evidence, at: now() },
    ],
    currentNodeId: target.id,
    status:
      target.type === "end"
        ? target.inconclusive
          ? "inconclusive"
          : "concluded"
        : "in-progress",
  };
}
export function goBack(
  session: DiagnosticSession,
  index = session.answers.length - 1,
): DiagnosticSession {
  const answer = session.answers[index];
  if (!answer) throw new Error("Não há resposta para corrigir.");
  return {
    ...session,
    answers: session.answers.slice(0, index),
    currentNodeId: answer.nodeId,
    status: "in-progress",
  };
}
export function confirmFinding(input: Finding, confirmed: boolean): Finding {
  const finding = FindingSchema.parse(input);
  if (
    !confirmed ||
    !finding.evidence?.trim() ||
    !finding.sourceId ||
    !finding.origin ||
    finding.origin === "manual"
  )
    throw new Error(
      "Confirmação técnica, origem e evidência são obrigatórias.",
    );
  return { ...finding, confirmedAt: now() };
}
export function reportForVehicle(
  store: Store,
  current: LegacyInspection,
  vehicle: Vehicle,
): { store: Store; report: LegacyInspection } {
  const key = current.reportVehicleId ?? "legacy";
  const archived = {
    id: key,
    vehicleId: current.reportVehicleId ?? null,
    snapshot: structuredClone(current),
    updatedAt: now(),
  };
  const reports = [...store.reports.filter((r) => r.id !== key), archived];
  const existing = reports.find((r) => r.vehicleId === vehicle.id);
  const report: LegacyInspection = existing
    ? structuredClone(existing.snapshot)
    : {
        ...structuredClone(emptyInspection),
        reportVehicleId: vehicle.id,
        vehicle: {
          owner: vehicle.owner,
          plate: vehicle.plate,
          model: `${vehicle.make} ${vehicle.model} ${vehicle.variant}`.trim(),
          year: String(vehicle.year),
          mileage: String(vehicle.mileage),
        },
      };
  return { store: { ...store, reports }, report };
}

/** Report adapter: verify vehicle and source, not just the confirmation checkbox. */
export function integrateFinding(
  store: Store,
  report: LegacyInspection,
  input: Finding,
): LegacyInspection {
  const finding = FindingSchema.parse(input);
  if (
    !finding.confirmedAt ||
    !finding.evidence?.trim() ||
    !report.reportVehicleId
  )
    throw new Error("Abra o laudo correto e confirme tecnicamente o achado.");
  let sourceVehicleId: string | undefined;
  if (finding.origin === "diagnostic") {
    const session = store.sessions.find((s) => s.id === finding.sourceId);
    const node = session?.flowSnapshot.nodes.find(
      (n) => n.id === session.currentNodeId,
    );
    if (!session || session.status !== "concluded" || !node?.hypothesis)
      throw new Error(
        "A investigação não apresenta uma hipótese elegível para confirmação.",
      );
    sourceVehicleId = session.vehicleId;
  } else if (finding.origin === "preventive") {
    const inspection = store.inspections.find((i) =>
      i.results.some(
        (r) =>
          `${i.id}:${r.itemId}` === finding.sourceId &&
          (r.status === "attention" || r.status === "nonconform"),
      ),
    );
    sourceVehicleId = inspection?.vehicleId;
  }
  if (sourceVehicleId !== report.reportVehicleId)
    throw new Error("O achado não pertence ao veículo deste laudo.");
  if (report.findings.some((f) => f.sourceId === finding.sourceId))
    throw new Error(
      "Este item já foi enviado ao laudo. Revise o achado existente.",
    );
  return { ...report, findings: [...report.findings, finding] };
}

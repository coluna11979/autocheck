import { test } from "node:test";
import assert from "node:assert/strict";
import {
  components,
  demoTemplates,
  generalRule,
  suspensionFlow,
} from "../modules/builder/catalog";
import {
  BUILDER_KEY,
  emptyStore,
  LocalBuilderRepository,
  migrateStore,
} from "../modules/builder/repositories";
import {
  answerDiagnostic,
  applicability,
  completeInspection,
  confirmFinding,
  duplicateTemplate,
  goBack,
  publishTemplate,
  registerVehicle,
  reportForVehicle,
  saveTemplateDraft,
  startDiagnostic,
  startInspection,
  updateResult,
  validateFlow,
} from "../modules/builder/use-cases";
import {
  VehicleSchema,
  type Vehicle,
  type Finding,
} from "../modules/builder/models";
import {
  emptyInspection,
  parseInspection,
  STORAGE_KEY,
  checkupPrice,
  urgentTotal,
} from "../lib/autocheck";
const vehicle: Vehicle = {
  id: "vehicle-1",
  plate: "ABC1D23",
  make: "Marca manual",
  model: "Modelo manual",
  variant: "Versão manual",
  engine: "Motor informado",
  fuel: "Flex",
  transmission: "Manual",
  year: 2022,
  mileage: 45000,
  identification: "identified",
  owner: "Ana",
};
test("vehicle registration validates, normalizes plate and prevents duplicates", () => {
  assert.equal(
    registerVehicle({ ...vehicle, plate: "abc-1d23" }, []).plate,
    "ABC1D23",
  );
  assert.throws(() => registerVehicle({ ...vehicle, id: "other" }, [vehicle]));
  assert.throws(() => VehicleSchema.parse({ ...vehicle, mileage: -1 }));
  assert.equal(
    registerVehicle({ ...vehicle, variant: "" }, []).identification,
    "pending",
  );
});
test("pending identification blocks variant and engine specific recommendations only", () => {
  const pending = registerVehicle({ ...vehicle, variant: "" }, []);
  assert.equal(applicability(pending, generalRule).allowed, true);
  assert.equal(
    applicability(pending, { ...generalRule, requiresIdentification: true })
      .allowed,
    false,
  );
  assert.equal(
    applicability(pending, { ...generalRule, engines: [vehicle.engine] })
      .allowed,
    false,
  );
  assert.equal(
    applicability(vehicle, { ...generalRule, makes: ["Outra"] }).allowed,
    false,
  );
  assert.equal(
    applicability(vehicle, { ...generalRule, yearTo: 2020 }).allowed,
    false,
  );
});
test("all five demo templates have valid catalog references and generate exact items", () => {
  assert.equal(demoTemplates.length, 5);
  for (const t of demoTemplates) {
    const i = startInspection(vehicle, t);
    assert.equal(i.results.length, t.versions[0].items.length);
    assert.ok(i.results.every((r) => r.status === "unchecked"));
    assert.ok(
      t.items.every((item) =>
        components.some((c) => c.id === item.componentId),
      ),
    );
  }
});
test("template draft, duplicate, reordering and publishing preserve historical inspections", () => {
  const initial = structuredClone(demoTemplates[0]);
  const i = startInspection(vehicle, initial);
  const next = saveTemplateDraft(
    { ...initial, name: "Editado", items: [...initial.items].reverse() },
    initial,
  );
  assert.equal(next.status, "draft");
  assert.throws(() => startInspection(vehicle, next));
  const published = publishTemplate(next);
  assert.equal(published.versions.length, 2);
  assert.equal(published.versions[0].name, initial.name);
  assert.equal(i.templateSnapshot.name, initial.name);
  assert.equal(i.templateSnapshot.items[0].id, initial.items[0].id);
  assert.notEqual(
    published.versions[1].items[0].id,
    i.templateSnapshot.items[0].id,
  );
  published.items[0].title = "Modificado novamente";
  assert.notEqual(i.templateSnapshot.items[0].title, "Modificado novamente");
  const copy = duplicateTemplate(published);
  assert.notEqual(copy.id, initial.id);
  assert.equal(copy.versions.length, 0);
  assert.equal(copy.demonstration, false);
  assert.throws(() => publishTemplate({ ...initial, status: "archived" }));
});
test("inspection results, evidence requirements, not applicable and completion are distinct", () => {
  const t = structuredClone(demoTemplates[2]);
  t.versions[0].items[0].measurementRequired = true;
  t.versions[0].items[0].evidenceRequired = true;
  let i = startInspection(vehicle, t);
  assert.throws(() => completeInspection(i));
  i = updateResult(i, { ...i.results[0], status: "conform" });
  assert.throws(() => completeInspection(i));
  i = updateResult(i, { ...i.results[0], status: "not-applicable" });
  assert.throws(() => completeInspection(i));
  i = updateResult(i, {
    ...i.results[0],
    observation: "Configuração não aplicável verificada.",
  });
  const completed = completeInspection(i);
  assert.equal(completed.status, "completed");
  assert.throws(() =>
    updateResult(completed, { ...i.results[0], status: "conform" }),
  );
  assert.throws(() => updateResult(i, { ...i.results[0], itemId: "unknown" }));
});
test("repository persists partial results and never mutates legacy storage", () => {
  const map = new Map([[STORAGE_KEY, JSON.stringify(emptyInspection)]]);
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, v: string) => {
      map.set(key, v);
    },
  };
  const repo = new LocalBuilderRepository(storage);
  const before = map.get(STORAGE_KEY);
  const i = startInspection(vehicle, demoTemplates[0]);
  const state = {
    ...repo.load(),
    vehicles: [vehicle],
    inspections: [
      updateResult(i, {
        ...i.results[0],
        status: "attention",
        evidence: "Observação visual",
      }),
    ],
  };
  repo.save(state);
  assert.equal(repo.load().inspections[0].results[0].status, "attention");
  assert.equal(map.get(STORAGE_KEY), before);
  map.set(BUILDER_KEY, "invalid");
  assert.throws(() => repo.load());
  assert.equal(map.get(BUILDER_KEY), "invalid");
  assert.deepEqual(parseInspection(before!), emptyInspection);
});
test("incremental migration only accepts supported versions and does not reset records", () => {
  const old = { ...emptyStore(), schemaVersion: 1, vehicles: [vehicle] };
  assert.equal(migrateStore(old).vehicles[0].id, vehicle.id);
  assert.throws(() => migrateStore({ ...old, schemaVersion: 999 }));
});
test("diagnostic transitions, correction, terminal hypotheses and inconclusive outcomes", () => {
  let s = startDiagnostic(vehicle.id, suspensionFlow);
  s = answerDiagnostic(s, "Sim", "Ruído reproduzido");
  s = answerDiagnostic(s, "Inspeção realizada", "Observação segura");
  s = answerDiagnostic(s, "Observação sem tolerância cadastrada", "Descrição");
  s = answerDiagnostic(s, "Sim", "Indício observado");
  assert.equal(s.status, "concluded");
  assert.equal(s.currentNodeId, "hypothesis");
  assert.equal("findings" in s, false);
  const back = goBack(s, 0);
  assert.equal(back.answers.length, 0);
  assert.equal(back.currentNodeId, "symptom");
  const end = answerDiagnostic(back, "Não", "Não reproduzido");
  assert.equal(end.status, "inconclusive");
  assert.throws(() => answerDiagnostic(end, "Sim", ""));
  assert.throws(() =>
    answerDiagnostic(startDiagnostic(vehicle.id, suspensionFlow), "Talvez", ""),
  );
});
test("diagnostic engine rejects cycles and missing transition targets", () => {
  const flow = structuredClone(suspensionFlow);
  flow.nodes[0].transitions[0].to = "symptom";
  assert.throws(() => validateFlow(flow));
  flow.nodes[0].transitions[0].to = "absent";
  assert.throws(() => validateFlow(flow));
});
test("only explicit technical confirmation produces a compatible finding", () => {
  const f: Finding = {
    id: "finding-1",
    title: "Componente identificado",
    system: "Suspensão e direção",
    notes: "Procedimento técnico consultado",
    priority: "urgent",
    estimate: 100.5,
    origin: "diagnostic",
    sourceId: "session-1",
    evidence: "Teste realizado e evidência direta registrada",
  };
  assert.throws(() => confirmFinding(f, false));
  assert.throws(() => confirmFinding({ ...f, evidence: "" }, true));
  const confirmed = confirmFinding(f, true);
  assert.ok(confirmed.confirmedAt);
  const legacy = { ...emptyInspection, findings: [confirmed] };
  assert.equal(
    parseInspection(JSON.stringify(legacy)).findings[0].sourceId,
    "session-1",
  );
  assert.equal(urgentTotal(legacy.findings), 100.5);
  assert.equal(checkupPrice("sedan", "complete"), 299);
});
test("switching reports preserves original and isolates vehicle findings", () => {
  const original = {
    ...structuredClone(emptyInspection),
    vehicle: { ...emptyInspection.vehicle, model: "Veículo original" },
  };
  const first = reportForVehicle(emptyStore(), original, vehicle);
  assert.equal(
    first.store.reports[0].snapshot.vehicle.model,
    "Veículo original",
  );
  assert.equal(first.report.reportVehicleId, vehicle.id);
  const withFinding = {
    ...first.report,
    findings: [
      {
        id: "f",
        system: "Freios" as const,
        title: "Achado",
        notes: "",
        priority: "urgent" as const,
        estimate: 50,
      },
    ],
  };
  const second = reportForVehicle(first.store, withFinding, {
    ...vehicle,
    id: "vehicle-2",
    plate: "DEF4G56",
  });
  assert.equal(second.report.findings.length, 0);
  const back = reportForVehicle(second.store, second.report, vehicle);
  assert.equal(back.report.findings.length, 1);
  assert.equal(
    back.store.reports.find((r) => r.id === "legacy")?.snapshot.vehicle.model,
    "Veículo original",
  );
});

test("adapter rejects cross-vehicle, unconfirmed and duplicate report findings", async () => {
  const { integrateFinding } = await import("../modules/builder/use-cases");
  const inspection = startInspection(vehicle, demoTemplates[2]);
  const store = {
    ...emptyStore(),
    vehicles: [vehicle],
    inspections: [
      updateResult(inspection, {
        ...inspection.results[0],
        status: "attention",
      }),
    ],
  };
  const finding = confirmFinding(
    {
      id: "confirmed",
      system: "Freios",
      title: "Condição confirmada",
      notes: "",
      priority: "urgent",
      estimate: 50,
      origin: "preventive",
      sourceId: `${inspection.id}:${inspection.results[0].itemId}`,
      evidence: "Teste documentado e confirmação manual",
    },
    true,
  );
  assert.throws(() =>
    integrateFinding(
      store,
      { ...emptyInspection, reportVehicleId: "other" },
      finding,
    ),
  );
  assert.throws(() =>
    integrateFinding(
      store,
      { ...emptyInspection, reportVehicleId: vehicle.id },
      { ...finding, confirmedAt: undefined },
    ),
  );
  const report = integrateFinding(
    store,
    { ...emptyInspection, reportVehicleId: vehicle.id },
    finding,
  );
  assert.equal(report.findings.length, 1);
  assert.throws(() => integrateFinding(store, report, finding));
});
test("storage quota failure does not pretend to save or touch the legacy key", () => {
  const keys: string[] = [];
  const repo = new LocalBuilderRepository({
    getItem: () => null,
    setItem: (key) => {
      keys.push(key);
      throw new Error("quota");
    },
  });
  assert.throws(() => repo.save(emptyStore()));
  assert.deepEqual(keys, [BUILDER_KEY]);
});

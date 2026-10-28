import { StoreSchema, type Store } from "./models";
import { validateFlow } from "./use-cases";
export const BUILDER_KEY = "autocheck.builder.v2";
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
/** Unit of work: all domain repositories commit together to avoid orphaned records. */
export interface BuilderRepository {
  load(): Store;
  save(store: Store): void;
}
export const emptyStore = (): Store => ({
  schemaVersion: 2,
  vehicles: [],
  templates: [],
  inspections: [],
  sessions: [],
  reports: [],
});
function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length)
    throw new Error(`Duplicidade em ${label}.`);
}
export function validateStore(value: unknown): Store {
  const store = StoreSchema.parse(value);
  for (const key of [
    "vehicles",
    "templates",
    "inspections",
    "sessions",
    "reports",
  ] as const)
    unique(
      store[key].map((x) => x.id),
      key,
    );
  unique(
    store.vehicles.map((v) => v.plate),
    "placas",
  );
  const vehicles = new Set(store.vehicles.map((v) => v.id));
  for (const t of store.templates) {
    unique(
      t.items.map((i) => i.id),
      "itens",
    );
    unique(
      t.versions.map((v) => String(v.number)),
      "números de versão",
    );
    unique(
      t.versions.map((v) => v.id),
      "versões",
    );
    for (const v of t.versions)
      if (v.templateId !== t.id)
        throw new Error("Versão pertence a outro template.");
  }
  for (const i of store.inspections) {
    if (!vehicles.has(i.vehicleId) || i.vehicleId !== i.vehicleSnapshot.id)
      throw new Error("Veículo da inspeção ausente.");
    unique(
      i.results.map((r) => r.itemId),
      "resultados",
    );
    if (
      i.results.length !== i.templateSnapshot.items.length ||
      i.results.some(
        (r) => !i.templateSnapshot.items.some((item) => item.id === r.itemId),
      )
    )
      throw new Error("Resultados incompatíveis com roteiro.");
  }
  for (const s of store.sessions) {
    if (!vehicles.has(s.vehicleId))
      throw new Error("Veículo da investigação ausente.");
    validateFlow(s.flowSnapshot);
    if (
      !s.flowSnapshot.nodes.some((n) => n.id === s.currentNodeId) ||
      s.answers.some(
        (a) => !s.flowSnapshot.nodes.some((n) => n.id === a.nodeId),
      )
    )
      throw new Error("Histórico investigativo inválido.");
  }
  for (const r of store.reports)
    if (
      r.vehicleId !== null &&
      (!vehicles.has(r.vehicleId) || r.vehicleId !== r.snapshot.reportVehicleId)
    )
      throw new Error("Vínculo de laudo inválido.");
  return store;
}
export function migrateStore(value: unknown): Store {
  // Only this module's earlier version is migrated. The MVP key is never touched.
  if (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    value.schemaVersion === 1
  )
    return validateStore({
      ...value,
      schemaVersion: 2,
      reports: "reports" in value ? value.reports : [],
    });
  return validateStore(value);
}
export class LocalBuilderRepository implements BuilderRepository {
  constructor(private storage: StoragePort) {}
  load() {
    const raw = this.storage.getItem(BUILDER_KEY);
    return raw === null ? emptyStore() : migrateStore(JSON.parse(raw));
  }
  save(store: Store) {
    this.storage.setItem(BUILDER_KEY, JSON.stringify(validateStore(store)));
  }
}

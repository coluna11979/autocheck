export const systems = [
  "Motor e transmissão",
  "Freios",
  "Suspensão e direção",
  "Elétrica e bateria",
  "Pneus e rodas",
  "Fluidos e filtros",
] as const;
export type System = (typeof systems)[number];
export type Priority = "urgent" | "soon" | "later";
export type Category = "compact" | "sedan" | "suv";
export type Plan = "essential" | "complete" | "premium";
export interface Vehicle {
  owner: string;
  model: string;
  plate: string;
  year: string;
  mileage: string;
}
export interface Finding {
  id: string;
  system: System;
  title: string;
  notes: string;
  priority: Priority;
  estimate: number;
}
export interface Inspection {
  vehicle: Vehicle;
  category: Category;
  plan: Plan;
  findings: Finding[];
  inspected: System[];
}
export const priorities: Record<
  Priority,
  { label: string; period: string; color: string }
> = {
  urgent: { label: "Urgente", period: "Agora", color: "red" },
  soon: { label: "Preventivo", period: "Em 3 meses", color: "amber" },
  later: { label: "Acompanhar", period: "Em 6–12 meses", color: "blue" },
};
export const categories: Record<Category, string> = {
  compact: "Compacto / hatch",
  sedan: "Sedã / médio",
  suv: "SUV / picape",
};
export const plans: Record<
  Plan,
  { label: string; price: number; description: string }
> = {
  essential: {
    label: "Essencial",
    price: 149,
    description: "Inspeção visual dos 6 sistemas",
  },
  complete: {
    label: "Completo",
    price: 249,
    description: "Inspeção + diagnóstico eletrônico",
  },
  premium: {
    label: "Premium",
    price: 349,
    description: "Diagnóstico + avaliação detalhada",
  },
};
export function checkupPrice(category: Category, plan: Plan) {
  return Math.round(
    plans[plan].price * { compact: 1, sedan: 1.2, suv: 1.5 }[category],
  );
}
export function urgentTotal(findings: Finding[]) {
  return findings
    .filter((f) => f.priority === "urgent")
    .reduce((sum, f) => sum + f.estimate, 0);
}
export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
export const emptyInspection: Inspection = {
  vehicle: { owner: "", model: "", plate: "", year: "", mileage: "" },
  category: "compact",
  plan: "complete",
  findings: [],
  inspected: [],
};
export const STORAGE_KEY = "autocheck.inspection.v1";
export function parseInspection(raw: string): Inspection {
  const data = JSON.parse(raw);
  if (
    !data ||
    !data.vehicle ||
    !Object.values(data.vehicle).every((v) => typeof v === "string") ||
    !["owner", "model", "plate", "year", "mileage"].every(
      (k) => typeof data.vehicle[k] === "string",
    ) ||
    !Object.hasOwn(categories, data.category) ||
    !Object.hasOwn(plans, data.plan) ||
    !Array.isArray(data.findings) ||
    !Array.isArray(data.inspected)
  )
    throw new Error("Dados inválidos");
  if (
    !data.inspected.every((s: System) => systems.includes(s)) ||
    !data.findings.every(
      (f: Finding) =>
        f &&
        typeof f.id === "string" &&
        systems.includes(f.system) &&
        typeof f.title === "string" &&
        typeof f.notes === "string" &&
        Object.hasOwn(priorities, f.priority) &&
        Number.isFinite(f.estimate) &&
        f.estimate >= 0,
    )
  )
    throw new Error("Achados inválidos");
  return data as Inspection;
}

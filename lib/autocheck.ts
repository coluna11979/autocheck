import { z } from "zod";
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
  origin?: "manual" | "preventive" | "diagnostic";
  sourceId?: string;
  evidence?: string;
  confirmedAt?: string;
}
export interface Inspection {
  vehicle: Vehicle;
  category: Category;
  plan: Plan;
  findings: Finding[];
  inspected: System[];
  reportVehicleId?: string;
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
const legacyFindingSchema = z
  .object({
    id: z.string(),
    system: z.enum(systems),
    title: z.string(),
    notes: z.string(),
    priority: z.enum(["urgent", "soon", "later"]),
    estimate: z.number().finite().nonnegative(),
    origin: z.enum(["manual", "preventive", "diagnostic"]).optional(),
    sourceId: z.string().optional(),
    evidence: z.string().optional(),
    confirmedAt: z.string().datetime().optional(),
  })
  .passthrough();
const legacyStorageSchema = z
  .object({
    vehicle: z
      .object({
        owner: z.string(),
        model: z.string(),
        plate: z.string(),
        year: z.string(),
        mileage: z.string(),
      })
      .passthrough(),
    category: z.enum(["compact", "sedan", "suv"]),
    plan: z.enum(["essential", "complete", "premium"]),
    findings: z.array(legacyFindingSchema),
    inspected: z.array(z.enum(systems)),
    reportVehicleId: z.string().min(1).optional(),
  })
  .passthrough();
export function parseInspection(raw: string): Inspection {
  return legacyStorageSchema.parse(JSON.parse(raw));
}

import { z } from "zod";
import { systems } from "../../lib/autocheck";
const id = z.string().trim().min(1).max(120);
const text = z.string().trim().min(1).max(200);
const note = z.string().max(5000);
export const VehicleMakeSchema = z.object({ id, name: text });
export const VehicleModelSchema = z.object({ id, makeId: id, name: text });
export const VehicleVariantSchema = z.object({
  id,
  modelId: id,
  name: text,
  engine: text,
  fuel: text,
  transmission: text,
});
export const VehicleSchema = z.object({
  id,
  plate: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/,
      "Informe placa brasileira com 7 caracteres, sem hífen",
    ),
  make: text,
  model: text,
  variant: z.string().trim().max(200),
  engine: z.string().trim().max(200),
  fuel: z.string().trim().max(100),
  transmission: z.string().trim().max(100),
  year: z.number().int().min(1900).max(2100),
  mileage: z.number().finite().nonnegative().max(9999999),
  identification: z.enum(["pending", "identified"]),
  owner: z.string().max(200),
});
export const TechnicalSystemSchema = z.object({ id, name: z.enum(systems) });
export const TechnicalSourceSchema = z.object({
  id,
  title: text,
  reference: note,
  verified: z.boolean(),
  demonstration: z.boolean(),
});
export const ComponentSchema = z.object({
  id,
  systemId: id,
  name: text,
  sourceIds: z.array(id),
});
export const TemplateApplicabilitySchema = z
  .object({
    makes: z.array(text),
    models: z.array(text),
    variants: z.array(text),
    engines: z.array(text),
    yearFrom: z.number().int().min(1900).max(2100).nullable(),
    yearTo: z.number().int().min(1900).max(2100).nullable(),
    requiresIdentification: z.boolean(),
  })
  .refine(
    (r) => r.yearFrom === null || r.yearTo === null || r.yearFrom <= r.yearTo,
    "Faixa de anos inválida",
  );
export const ComponentApplicabilitySchema = z.object({
  id,
  componentId: id,
  rule: TemplateApplicabilitySchema,
});
export const CheckupTemplateItemSchema = z.object({
  id,
  componentId: id,
  system: z.enum(systems),
  title: text,
  instruction: note,
  required: z.boolean(),
  measurementRequired: z.boolean(),
  evidenceRequired: z.boolean(),
  sourceIds: z.array(id),
});
export const CheckupTemplateVersionSchema = z.object({
  id,
  templateId: id,
  number: z.number().int().positive(),
  name: text,
  description: note,
  category: text,
  estimatedMinutes: z.number().int().positive().max(1440),
  systems: z.array(z.enum(systems)).min(1),
  items: z.array(CheckupTemplateItemSchema).min(1),
  applicability: TemplateApplicabilitySchema,
  publishedAt: z.string().datetime(),
  demonstration: z.boolean(),
});
export const CheckupTemplateSchema = z.object({
  id,
  name: text,
  description: note,
  category: text,
  estimatedMinutes: z.number().int().positive().max(1440),
  status: z.enum(["draft", "published", "archived"]),
  demonstration: z.boolean(),
  items: z.array(CheckupTemplateItemSchema).min(1),
  applicability: TemplateApplicabilitySchema,
  versions: z.array(CheckupTemplateVersionSchema),
});
export const DiagnosticTransitionSchema = z.object({
  answer: z.string(),
  to: id,
});
export const DiagnosticNodeSchema = z.object({
  id,
  type: z.enum(["question", "instruction", "measurement", "condition", "end"]),
  title: text,
  detail: note,
  transitions: z.array(DiagnosticTransitionSchema),
  hypothesis: note.optional(),
  confirmationTest: note.optional(),
  inconclusive: z.boolean().optional(),
});
export const DiagnosticFlowSchema = z.object({
  id,
  name: text,
  version: z.number().int().positive(),
  startNodeId: id,
  nodes: z.array(DiagnosticNodeSchema).min(1),
  demonstration: z.boolean(),
  sourceIds: z.array(id),
});
export const InspectionResultSchema = z.object({
  itemId: id,
  status: z.enum([
    "conform",
    "attention",
    "nonconform",
    "not-applicable",
    "unchecked",
  ]),
  observation: note,
  measurement: z.string().max(500),
  evidence: note,
});
export const InspectionSchema = z.object({
  id,
  vehicleId: id,
  vehicleSnapshot: VehicleSchema,
  templateSnapshot: CheckupTemplateVersionSchema,
  results: z.array(InspectionResultSchema),
  limitations: note,
  status: z.enum(["in-progress", "completed"]),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});
export const DiagnosticAnswerSchema = z.object({
  nodeId: id,
  value: z.string().max(5000),
  evidence: note,
  at: z.string().datetime(),
});
export const DiagnosticSessionSchema = z.object({
  id,
  vehicleId: id,
  flowSnapshot: DiagnosticFlowSchema,
  answers: z.array(DiagnosticAnswerSchema),
  currentNodeId: id,
  status: z.enum(["in-progress", "concluded", "inconclusive"]),
  limitations: note,
  createdAt: z.string().datetime(),
});
export const FindingSchema = z.object({
  id,
  system: z.enum(systems),
  title: text,
  notes: note,
  priority: z.enum(["urgent", "soon", "later"]),
  estimate: z.number().finite().nonnegative().max(10000000),
  origin: z.enum(["manual", "preventive", "diagnostic"]).optional(),
  sourceId: id.optional(),
  evidence: note.optional(),
  confirmedAt: z.string().datetime().optional(),
});
export const LegacyInspectionSchema = z.object({
  vehicle: z.object({
    owner: z.string(),
    model: z.string(),
    plate: z.string(),
    year: z.string(),
    mileage: z.string(),
  }),
  category: z.enum(["compact", "sedan", "suv"]),
  plan: z.enum(["essential", "complete", "premium"]),
  findings: z.array(FindingSchema),
  inspected: z.array(z.enum(systems)),
  reportVehicleId: id.optional(),
});
export const ReportSchema = z.object({
  id,
  vehicleId: id.nullable(),
  snapshot: LegacyInspectionSchema,
  updatedAt: z.string().datetime(),
});
export const StoreSchema = z.object({
  schemaVersion: z.literal(2),
  vehicles: z.array(VehicleSchema),
  templates: z.array(CheckupTemplateSchema),
  inspections: z.array(InspectionSchema),
  sessions: z.array(DiagnosticSessionSchema),
  reports: z.array(ReportSchema),
});
export type VehicleMake = z.infer<typeof VehicleMakeSchema>;
export type VehicleModel = z.infer<typeof VehicleModelSchema>;
export type VehicleVariant = z.infer<typeof VehicleVariantSchema>;
export type Vehicle = z.infer<typeof VehicleSchema>;
export type TechnicalSystem = z.infer<typeof TechnicalSystemSchema>;
export type Component = z.infer<typeof ComponentSchema>;
export type ComponentApplicability = z.infer<
  typeof ComponentApplicabilitySchema
>;
export type TechnicalSource = z.infer<typeof TechnicalSourceSchema>;
export type TemplateApplicability = z.infer<typeof TemplateApplicabilitySchema>;
export type CheckupTemplateItem = z.infer<typeof CheckupTemplateItemSchema>;
export type CheckupTemplateVersion = z.infer<
  typeof CheckupTemplateVersionSchema
>;
export type CheckupTemplate = z.infer<typeof CheckupTemplateSchema>;
export type DiagnosticTransition = z.infer<typeof DiagnosticTransitionSchema>;
export type DiagnosticNode = z.infer<typeof DiagnosticNodeSchema>;
export type DiagnosticFlow = z.infer<typeof DiagnosticFlowSchema>;
export type Inspection = z.infer<typeof InspectionSchema>;
export type InspectionResult = z.infer<typeof InspectionResultSchema>;
export type DiagnosticSession = z.infer<typeof DiagnosticSessionSchema>;
export type DiagnosticAnswer = z.infer<typeof DiagnosticAnswerSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type Store = z.infer<typeof StoreSchema>;
export interface VehicleDataProvider {
  lookupByPlate(plate: string): Promise<Partial<Vehicle> | null>;
}

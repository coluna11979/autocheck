"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import { Notes, Select, Field } from "./fields";
import Confirmation from "./confirmation";
import {
  applicability,
  completeInspection,
  startInspection,
  updateResult,
} from "../../modules/builder/use-cases";
import type {
  CheckupTemplate,
  Finding,
  Inspection,
  InspectionResult,
  Vehicle,
} from "../../modules/builder/models";
const statuses = [
  { value: "unchecked", label: "Não verificado" },
  { value: "conform", label: "Conforme" },
  { value: "attention", label: "Atenção" },
  { value: "nonconform", label: "Não conforme" },
  { value: "not-applicable", label: "Não aplicável" },
];
export default function Preventive({
  vehicles,
  templates,
  inspections,
  onSave,
  onReport,
  onConfirm,
  reportVehicleId,
}: {
  vehicles: Vehicle[];
  templates: CheckupTemplate[];
  inspections: Inspection[];
  onSave: (i: Inspection) => void;
  onReport: (v: Vehicle) => void;
  onConfirm: (f: Finding) => void;
  reportVehicleId?: string;
}) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? ""),
    [templateId, setTemplateId] = useState(""),
    [active, setActive] = useState(""),
    [error, setError] = useState("");
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const template = templates.find((t) => t.id === templateId);
  const inspection = inspections.find((i) => i.id === active);
  const bound =
    inspection && vehicles.find((v) => v.id === inspection.vehicleId);
  const attempt = (fn: () => void) => {
    try {
      fn();
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  };
  const changeResult = (r: InspectionResult) => {
    if (inspection) attempt(() => onSave(updateResult(inspection, r)));
  };
  return (
    <div className="builder-stack">
      <section className="panel">
        <h2>Nova inspeção preventiva</h2>
        <p className="muted">
          Escolha um veículo e um modelo publicado. Todo progresso é salvo a
          cada alteração.
        </p>
        <div className="builder-fields">
          <Select
            label="Veículo da inspeção"
            value={vehicleId}
            onChange={setVehicleId}
            options={[
              { value: "", label: "Selecione um veículo" },
              ...vehicles.map((v) => ({
                value: v.id,
                label: `${v.plate} · ${v.make} ${v.model}`,
              })),
            ]}
          />
          <Select
            label="Check-up publicado"
            value={templateId}
            onChange={setTemplateId}
            options={[
              { value: "", label: "Selecione um check-up" },
              ...templates
                .filter((t) => t.status === "published")
                .map((t) => ({
                  value: t.id,
                  label: `${t.name} · v${t.versions.at(-1)?.number}${t.demonstration ? " · Demo" : ""}`,
                })),
            ]}
          />
        </div>
        {vehicle && template && (
          <p className="muted">
            {
              applicability(vehicle, template.versions.at(-1)!.applicability)
                .reason
            }
          </p>
        )}
        <Button
          disabled={!vehicle || !template}
          onClick={() =>
            attempt(() => {
              const i = startInspection(vehicle!, template!);
              onSave(i);
              setActive(i.id);
            })
          }
        >
          Gerar roteiro de inspeção
        </Button>
        {error && (
          <p role="alert" className="builder-error">
            {error}
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Inspeções salvas</h2>
        {!inspections.length && (
          <p className="builder-empty">
            Nenhuma inspeção. Cadastre um veículo e publique um modelo para
            começar.
          </p>
        )}
        <div className="builder-cards">
          {inspections.map((i) => (
            <button
              className={`builder-card builder-select-card ${active === i.id ? "selected" : ""}`}
              key={i.id}
              onClick={() => {
                setActive(i.id);
                setError("");
              }}
            >
              <strong>
                {i.vehicleSnapshot.plate} · {i.templateSnapshot.name}
              </strong>
              <p className="muted">
                v{i.templateSnapshot.number} ·{" "}
                {i.status === "completed" ? "Encerrada" : "Em andamento"} ·{" "}
                {i.results.filter((r) => r.status !== "unchecked").length}/
                {i.results.length} itens
              </p>
            </button>
          ))}
        </div>
      </section>
      {inspection && (
        <section className="panel">
          <div className="builder-section-heading">
            <div>
              <h2>{inspection.templateSnapshot.name}</h2>
              <p className="muted">
                {inspection.vehicleSnapshot.plate} · versão{" "}
                {inspection.templateSnapshot.number} ·{" "}
                {inspection.templateSnapshot.demonstration
                  ? "Roteiro demonstrativo"
                  : "Roteiro próprio"}
              </p>
            </div>
            {bound && (
              <Button variant="outline" onClick={() => onReport(bound)}>
                Abrir laudo deste veículo
              </Button>
            )}
          </div>
          <div className="progress-label">
            <span>
              Itens com resultado registrado (não significa conformidade)
            </span>
            <b>
              {
                inspection.results.filter((r) => r.status !== "unchecked")
                  .length
              }
              /{inspection.results.length}
            </b>
          </div>
          <div className="progress-track">
            <div
              style={{
                width: `${(inspection.results.filter((r) => r.status !== "unchecked").length / inspection.results.length) * 100}%`,
              }}
            />
          </div>
          {inspection.templateSnapshot.systems.map((system) => (
            <section className="builder-system" key={system}>
              <h3>{system}</h3>
              {inspection.templateSnapshot.items
                .filter((item) => item.system === system)
                .map((item) => {
                  const result = inspection.results.find(
                    (r) => r.itemId === item.id,
                  )!;
                  return (
                    <article className="builder-card" key={item.id}>
                      <h3>
                        {item.title}{" "}
                        {item.required && (
                          <span className="builder-tag">Obrigatório</span>
                        )}
                      </h3>
                      <p className="muted">{item.instruction}</p>
                      <fieldset disabled={inspection.status === "completed"}>
                        <Select
                          label={`Resultado: ${item.title}`}
                          value={result.status}
                          onChange={(v) =>
                            changeResult({
                              ...result,
                              status: v as InspectionResult["status"],
                            })
                          }
                          options={statuses}
                        />
                        <Notes
                          label={`Observações: ${item.title}`}
                          value={result.observation}
                          onChange={(v) =>
                            changeResult({ ...result, observation: v })
                          }
                        />
                        <Field
                          label={`Medição e unidade${item.measurementRequired ? " (obrigatória)" : ""}: ${item.title}`}
                          value={result.measurement}
                          onChange={(v) =>
                            changeResult({ ...result, measurement: v })
                          }
                        />
                        <Notes
                          label={`Evidência descritiva${item.evidenceRequired ? " (obrigatória)" : ""}: ${item.title}`}
                          value={result.evidence}
                          onChange={(v) =>
                            changeResult({ ...result, evidence: v })
                          }
                        />
                      </fieldset>
                      {(result.status === "attention" ||
                        result.status === "nonconform") && (
                        <Confirmation
                          sourceId={`${inspection.id}:${item.id}`}
                          origin="preventive"
                          initialTitle={item.title}
                          initialEvidence={result.evidence}
                          system={item.system}
                          onConfirm={onConfirm}
                          disabled={reportVehicleId !== inspection.vehicleId}
                        />
                      )}
                    </article>
                  );
                })}
            </section>
          ))}
          <fieldset disabled={inspection.status === "completed"}>
            <Notes
              label="Limitações da inspeção"
              value={inspection.limitations}
              onChange={(v) =>
                attempt(() => onSave({ ...inspection, limitations: v }))
              }
            />
          </fieldset>
          <p className="muted">
            Não verificado não é conforme. Itens obrigatórios precisam de
            resultado; não aplicáveis exigem justificativa. Ao encerrar, os
            resultados se tornam imutáveis.
          </p>
          <Button
            disabled={inspection.status === "completed"}
            onClick={() =>
              attempt(() => onSave(completeInspection(inspection)))
            }
          >
            Encerrar inspeção
          </Button>
          {error && (
            <p role="alert" className="builder-error">
              {error}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

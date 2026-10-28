"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import { Field } from "./fields";
import type { Vehicle } from "../../modules/builder/models";
import { registerVehicle, uid } from "../../modules/builder/use-cases";
const blank = (): Vehicle => ({
  id: uid(),
  plate: "",
  make: "",
  model: "",
  variant: "",
  engine: "",
  fuel: "",
  transmission: "",
  year: new Date().getFullYear(),
  mileage: 0,
  identification: "pending",
  owner: "",
});
export default function VehicleRegistry({
  vehicles,
  onSave,
  onReport,
}: {
  vehicles: Vehicle[];
  onSave: (v: Vehicle) => void;
  onReport: (v: Vehicle) => void;
}) {
  const [draft, setDraft] = useState<Vehicle>(blank);
  const [error, setError] = useState("");
  const set = (key: keyof Vehicle, value: string) =>
    setDraft({
      ...draft,
      [key]: key === "year" || key === "mileage" ? Number(value) : value,
    });
  return (
    <div className="builder-two">
      <section className="panel">
        <h2>Cadastro de veículos</h2>
        <p className="muted">
          Identificação manual. Nenhuma consulta externa é executada.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              onSave(registerVehicle(draft, vehicles));
              setDraft(blank());
              setError("");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Dados inválidos.");
            }
          }}
        >
          <div className="builder-fields">
            {(
              [
                ["plate", "Placa", true],
                ["owner", "Proprietário", false],
                ["make", "Marca", true],
                ["model", "Modelo", true],
                ["variant", "Versão", false],
                ["engine", "Motorização", false],
                ["fuel", "Combustível", false],
                ["transmission", "Transmissão", false],
                ["year", "Ano", true],
                ["mileage", "Quilometragem", true],
              ] as const
            ).map(([key, label, required]) => (
              <Field
                key={key}
                label={label}
                value={draft[key]}
                onChange={(v) => set(key, v)}
                required={required}
                type={key === "year" || key === "mileage" ? "number" : "text"}
                min={key === "year" ? 1900 : 0}
                max={key === "year" ? 2100 : 9999999}
              />
            ))}
          </div>
          <p className="muted">
            Sem versão, motor, combustível ou transmissão, o veículo permanece
            com identificação pendente. Roteiros específicos ficam bloqueados.
          </p>
          {error && (
            <p role="alert" className="builder-error">
              {error}
            </p>
          )}
          <div className="builder-actions">
            <Button type="submit">Salvar veículo</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft(blank());
                setError("");
              }}
            >
              Novo cadastro
            </Button>
          </div>
        </form>
      </section>
      <section className="panel">
        <h2>
          Veículos cadastrados{" "}
          <span className="builder-count">{vehicles.length}</span>
        </h2>
        {!vehicles.length && (
          <p className="builder-empty">
            Nenhum veículo cadastrado. O painel original continua disponível.
          </p>
        )}
        {vehicles.map((v) => (
          <article className="builder-card" key={v.id}>
            <h3>
              {v.plate} · {v.make} {v.model}
            </h3>
            <p className="muted">
              {v.variant || "Versão pendente"} · {v.year} ·{" "}
              {v.mileage.toLocaleString("pt-BR")} km
            </p>
            <span
              className={`builder-tag ${v.identification === "pending" ? "warning" : ""}`}
            >
              {v.identification === "pending"
                ? "Identificação pendente"
                : "Identificado manualmente"}
            </span>
            <div className="builder-actions">
              <Button
                variant="outline"
                onClick={() => setDraft(structuredClone(v))}
              >
                Editar veículo
              </Button>
              <Button onClick={() => onReport(v)}>Abrir laudo</Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

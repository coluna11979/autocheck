"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import { Field, Notes, Select, Toggle } from "./fields";
import { systems, type Priority, type System } from "../../lib/autocheck";
import { confirmFinding, uid } from "../../modules/builder/use-cases";
import type { Finding } from "../../modules/builder/models";
export default function Confirmation({
  sourceId,
  origin,
  initialTitle,
  initialEvidence,
  system = "Suspensão e direção",
  onConfirm,
  disabled,
}: {
  sourceId: string;
  origin: "preventive" | "diagnostic";
  initialTitle: string;
  initialEvidence: string;
  system?: System;
  onConfirm: (f: Finding) => void;
  disabled: boolean;
}) {
  const [title, setTitle] = useState(initialTitle),
    [evidence, setEvidence] = useState(initialEvidence),
    [notes, setNotes] = useState(""),
    [estimate, setEstimate] = useState(""),
    [priority, setPriority] = useState<Priority>("urgent"),
    [checked, setChecked] = useState(false),
    [selectedSystem, setSystem] = useState<System>(system),
    [error, setError] = useState("");
  return (
    <details className="builder-confirm">
      <summary>Registrar achado tecnicamente confirmado</summary>
      <p className="muted">
        Hipóteses não são defeitos confirmados. Registre o teste de confirmação
        realizado, resultado e fonte consultada. O prazo é definido pelo
        técnico.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            onConfirm(
              confirmFinding(
                {
                  id: uid(),
                  system: selectedSystem,
                  title,
                  notes,
                  priority,
                  estimate: Number(estimate),
                  origin,
                  sourceId,
                  evidence,
                },
                checked,
              ),
            );
            setChecked(false);
            setError("Achado confirmado e enviado ao laudo.");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Dados inválidos.");
          }
        }}
      >
        <Field
          label="Título do achado confirmado"
          value={title}
          required
          onChange={setTitle}
        />
        <Select
          label="Sistema do achado"
          value={selectedSystem}
          onChange={(v) => setSystem(v as System)}
          options={systems.map((s) => ({ value: s, label: s }))}
        />
        <Notes
          label="Teste, evidência e fonte de confirmação"
          value={evidence}
          onChange={setEvidence}
        />
        <Notes label="Recomendação técnica" value={notes} onChange={setNotes} />
        <div className="builder-fields">
          <Select
            label="Criticidade do achado"
            value={priority}
            onChange={(v) => setPriority(v as Priority)}
            options={[
              { value: "urgent", label: "Imediato / Urgente" },
              { value: "soon", label: "Próximos 3 meses" },
              { value: "later", label: "Monitorar em 6–12 meses" },
            ]}
          />
          <Field
            label="Estimativa do achado (R$)"
            type="number"
            min={0}
            max={10000000}
            value={estimate}
            onChange={setEstimate}
            required
          />
        </div>
        <Toggle
          label="Confirmo tecnicamente este achado após teste e análise da evidência"
          checked={checked}
          onChange={setChecked}
        />
        <Button
          disabled={disabled || !checked || !evidence.trim()}
          type="submit"
        >
          Confirmar e enviar ao laudo
        </Button>
        {disabled && (
          <p className="muted">
            Abra primeiro o laudo deste veículo para evitar misturar
            diagnósticos.
          </p>
        )}
        {error && (
          <p role="status" className="muted">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}

"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import { Field, Notes, Select } from "./fields";
import Confirmation from "./confirmation";
import { suspensionFlow } from "../../modules/builder/catalog";
import {
  answerDiagnostic,
  goBack,
  startDiagnostic,
} from "../../modules/builder/use-cases";
import type {
  DiagnosticSession,
  Finding,
  Vehicle,
} from "../../modules/builder/models";
export default function Diagnostic({
  vehicles,
  sessions,
  onSave,
  onReport,
  onConfirm,
  reportVehicleId,
}: {
  vehicles: Vehicle[];
  sessions: DiagnosticSession[];
  onSave: (s: DiagnosticSession) => void;
  onReport: (v: Vehicle) => void;
  onConfirm: (f: Finding) => void;
  reportVehicleId?: string;
}) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? ""),
    [active, setActive] = useState(""),
    [value, setValue] = useState(""),
    [evidence, setEvidence] = useState(""),
    [error, setError] = useState("");
  const session = sessions.find((s) => s.id === active);
  const node = session?.flowSnapshot.nodes.find(
    (n) => n.id === session.currentNodeId,
  );
  const vehicle = vehicles.find((v) => v.id === session?.vehicleId);
  const attempt = (fn: () => void) => {
    try {
      fn();
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    }
  };
  const answer = (v: string) =>
    attempt(() => {
      onSave(answerDiagnostic(session!, v, evidence));
      setValue("");
      setEvidence("");
    });
  return (
    <div className="builder-stack">
      <section className="panel">
        <h2>Diagnóstico guiado por sintomas</h2>
        <p className="muted">
          Roteiro determinístico demonstrativo: ruído na suspensão. Produz
          hipóteses e testes de confirmação, nunca diagnóstico automático.
        </p>
        <Select
          label="Veículo da investigação"
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
        <Button
          disabled={!vehicles.some((v) => v.id === vehicleId)}
          onClick={() =>
            attempt(() => {
              const s = startDiagnostic(vehicleId, suspensionFlow);
              onSave(s);
              setActive(s.id);
              setValue("");
              setEvidence("");
            })
          }
        >
          Iniciar investigação de ruído
        </Button>
        <div className="builder-cards">
          {sessions.map((s) => (
            <button
              key={s.id}
              className={`builder-card builder-select-card ${s.id === active ? "selected" : ""}`}
              onClick={() => {
                setActive(s.id);
                setValue("");
                setEvidence("");
              }}
            >
              <strong>
                {vehicles.find((v) => v.id === s.vehicleId)?.plate} · Ruído na
                suspensão
              </strong>
              <p className="muted">
                {s.answers.length} respostas ·{" "}
                {s.status === "in-progress"
                  ? "Em andamento"
                  : s.status === "inconclusive"
                    ? "Inconclusiva"
                    : "Hipótese a confirmar"}
              </p>
            </button>
          ))}
        </div>
        {!sessions.length && (
          <p className="builder-empty">
            Inicie uma investigação para registrar o caminho técnico.
          </p>
        )}
      </section>
      {session && node && (
        <section className="panel">
          <div className="builder-section-heading">
            <span className="builder-tag">
              DEMONSTRATIVO ·{" "}
              {node.type === "end"
                ? "Encerramento investigativo"
                : `Passo ${session.answers.length + 1}`}
            </span>
            {vehicle && (
              <Button variant="outline" onClick={() => onReport(vehicle)}>
                Abrir laudo deste veículo
              </Button>
            )}
          </div>
          <h2>{node.title}</h2>
          <p className="muted">{node.detail}</p>
          {node.type !== "end" && (
            <>
              <Notes
                label="Evidência deste passo"
                value={evidence}
                onChange={setEvidence}
              />
              {node.type === "measurement" ? (
                <>
                  <Field
                    label="Observação ou medição (com unidade e método)"
                    value={value}
                    onChange={setValue}
                  />
                  <Button onClick={() => answer(value)}>
                    Registrar e continuar
                  </Button>
                </>
              ) : (
                <div className="builder-actions">
                  {node.transitions.map((t) => (
                    <Button key={t.answer} onClick={() => answer(t.answer)}>
                      {t.answer}
                    </Button>
                  ))}
                </div>
              )}
              <Button
                variant="ghost"
                onClick={() =>
                  attempt(() =>
                    onSave({
                      ...session,
                      status: "inconclusive",
                      currentNodeId: "inconclusive",
                    }),
                  )
                }
              >
                Encerrar como inconclusivo
              </Button>
            </>
          )}
          {node.hypothesis && (
            <div className="builder-card">
              <span className="builder-tag warning">
                HIPÓTESE · NÃO CONFIRMADA
              </span>
              <p>{node.hypothesis}</p>
              <h3>Teste de confirmação recomendado</h3>
              <p className="muted">{node.confirmationTest}</p>
              <Confirmation
                key={session.id}
                sourceId={session.id}
                origin="diagnostic"
                initialTitle=""
                initialEvidence=""
                onConfirm={onConfirm}
                disabled={reportVehicleId !== session.vehicleId}
              />
            </div>
          )}
          <Notes
            label="Limitações da investigação"
            value={session.limitations}
            onChange={(v) =>
              attempt(() => onSave({ ...session, limitations: v }))
            }
          />
          <h3 className="builder-subtitle">Caminho percorrido</h3>
          {!session.answers.length && (
            <p className="muted">Nenhuma resposta ainda.</p>
          )}
          <ol className="builder-history">
            {session.answers.map((a, i) => (
              <li key={`${a.nodeId}-${i}`}>
                <strong>
                  {
                    session.flowSnapshot.nodes.find((n) => n.id === a.nodeId)
                      ?.title
                  }
                </strong>
                <p>{a.value}</p>
                {a.evidence && <p className="muted">Evidência: {a.evidence}</p>}
                <Button
                  variant="outline"
                  onClick={() =>
                    attempt(() => {
                      onSave(goBack(session, i));
                      setValue(a.value);
                      setEvidence(a.evidence);
                    })
                  }
                >
                  Corrigir a partir daqui
                </Button>
              </li>
            ))}
          </ol>
          <p className="muted">
            Corrigir uma resposta descarta apenas o caminho posterior, que será
            reavaliado. Achados já confirmados exigem revisão manual no laudo.
          </p>
          <Button
            variant="outline"
            disabled={!session.answers.length}
            onClick={() =>
              attempt(() => {
                onSave(goBack(session));
                setValue("");
                setEvidence("");
              })
            }
          >
            Voltar um passo
          </Button>
        </section>
      )}
      {error && (
        <p role="alert" className="builder-error">
          {error}
        </p>
      )}
    </div>
  );
}

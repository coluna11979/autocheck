"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "../ui/button";
import VehicleRegistry from "./vehicle-registry";
import TemplateLibrary from "./template-library";
import Preventive from "./preventive";
import Diagnostic from "./diagnostic";
import { demoTemplates } from "../../modules/builder/catalog";
import {
  emptyStore,
  LocalBuilderRepository,
} from "../../modules/builder/repositories";
import {
  StoreSchema,
  type Finding,
  type Store,
  type Vehicle,
} from "../../modules/builder/models";
import {
  integrateFinding,
  reportForVehicle,
} from "../../modules/builder/use-cases";
import type { Inspection as LegacyInspection } from "../../lib/autocheck";
export type Screen =
  "panel" | "vehicles" | "templates" | "preventive" | "diagnostic" | "report";
export const screens: { id: Screen; label: string }[] = [
  { id: "panel", label: "Painel do Técnico" },
  { id: "vehicles", label: "Veículos" },
  { id: "templates", label: "Biblioteca de Check-ups" },
  { id: "preventive", label: "Nova Inspeção" },
  { id: "diagnostic", label: "Diagnóstico Guiado" },
  { id: "report", label: "Relatório" },
];
export default function BuilderWorkspace({
  screen,
  legacy,
  onOpen,
  onConfirm,
  onNavigate,
}: {
  screen: Screen;
  legacy: LegacyInspection;
  onOpen: (r: LegacyInspection) => void;
  onConfirm: (f: Finding) => void;
  onNavigate: (s: Screen) => void;
}) {
  const [store, setStore] = useState<Store>(emptyStore);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const loaded = new LocalBuilderRepository(localStorage).load();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the namespaced repository once after SSR.
      setStore(loaded);
      setReady(true);
    } catch {
      setError(
        "Não foi possível ler os dados do Builder. Nenhuma chave foi alterada. O painel original continua acessível. Exporte os dados pelo navegador para investigar antes de corrigir o armazenamento.",
      );
    }
  }, []);
  function commit(next: Store) {
    const valid = StoreSchema.parse(next);
    new LocalBuilderRepository(localStorage).save(valid);
    setStore(valid);
    setNotice("Alterações salvas neste navegador.");
  }
  function attempt(fn: () => void) {
    try {
      fn();
      setError("");
    } catch (err) {
      setError(
        err instanceof z.ZodError
          ? err.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join(" · ")
          : err instanceof Error
            ? err.message
            : "Não foi possível salvar. Os dados anteriores foram preservados.",
      );
    }
  }
  function openReport(v: Vehicle) {
    const result = reportForVehicle(store, legacy, v);
    commit(result.store);
    onOpen(result.report);
    setNotice(`Laudo de ${v.plate} selecionado. Laudo anterior preservado.`);
  }
  function confirmed(f: Finding) {
    integrateFinding(store, legacy, f);
    onConfirm(f);
    setNotice("Achado confirmado disponível no relatório.");
  }
  // Domain screens stay mounted at the workspace level, preserving repository state when navigating.
  return (
    <div className="builder-workspace">
      <div className="builder-nav" aria-label="Módulos AutoCheck">
        {screens.map((s) => (
          <Button
            key={s.id}
            variant={screen === s.id ? "default" : "outline"}
            onClick={() => onNavigate(s.id)}
          >
            {s.label}
          </Button>
        ))}
      </div>
      {error && (
        <div className="notice" role="alert">
          {error}
        </div>
      )}
      {notice && screen !== "panel" && screen !== "report" && (
        <p role="status" className="builder-save">
          {notice}
        </p>
      )}
      {!ready && screen !== "panel" && screen !== "report" && !error && (
        <p className="muted">Carregando repositório local…</p>
      )}
      {ready && (
        <>
          <div hidden={screen !== "vehicles"}>
            <VehicleRegistry
              vehicles={store.vehicles}
              onSave={(v) => {
                commit({
                  ...store,
                  vehicles: [...store.vehicles.filter((x) => x.id !== v.id), v],
                });
              }}
              onReport={(v) => attempt(() => openReport(v))}
            />
          </div>
          <div hidden={screen !== "templates"}>
            <TemplateLibrary
              templates={store.templates}
              onSave={(t) => {
                commit({
                  ...store,
                  templates: [
                    ...store.templates.filter((x) => x.id !== t.id),
                    t,
                  ],
                });
              }}
              onSeed={() =>
                attempt(() => {
                  const added = demoTemplates.filter(
                    (t) => !store.templates.some((x) => x.id === t.id),
                  );
                  commit({
                    ...store,
                    templates: [...store.templates, ...structuredClone(added)],
                  });
                })
              }
            />
          </div>
          <div hidden={screen !== "preventive"}>
            <Preventive
              vehicles={store.vehicles}
              templates={store.templates}
              inspections={store.inspections}
              reportVehicleId={legacy.reportVehicleId}
              onSave={(i) =>
                commit({
                  ...store,
                  inspections: [
                    ...store.inspections.filter((x) => x.id !== i.id),
                    i,
                  ],
                })
              }
              onReport={(v) => attempt(() => openReport(v))}
              onConfirm={confirmed}
            />
          </div>
          <div hidden={screen !== "diagnostic"}>
            <Diagnostic
              vehicles={store.vehicles}
              sessions={store.sessions}
              reportVehicleId={legacy.reportVehicleId}
              onSave={(s) =>
                commit({
                  ...store,
                  sessions: [...store.sessions.filter((x) => x.id !== s.id), s],
                })
              }
              onReport={(v) => attempt(() => openReport(v))}
              onConfirm={confirmed}
            />
          </div>
          {(screen === "panel" || screen === "report") &&
            store.reports.some((r) => r.id === "legacy") && (
              <div className="builder-legacy">
                <p className="muted">
                  Laudos separados por veículo. O laudo original foi preservado.
                </p>
                <Button
                  variant="outline"
                  disabled={!legacy.reportVehicleId}
                  onClick={() =>
                    attempt(() => {
                      const archived = store.reports.find(
                        (r) => r.id === "legacy",
                      )!;
                      const next = {
                        ...store,
                        reports: [
                          ...store.reports.filter(
                            (r) =>
                              r.id !== (legacy.reportVehicleId ?? "legacy"),
                          ),
                          {
                            id: legacy.reportVehicleId ?? "legacy",
                            vehicleId: legacy.reportVehicleId ?? null,
                            snapshot: structuredClone(legacy),
                            updatedAt: new Date().toISOString(),
                          },
                        ],
                      };
                      commit(next);
                      onOpen(archived.snapshot);
                    })
                  }
                >
                  Abrir laudo original
                </Button>
              </div>
            )}
        </>
      )}
    </div>
  );
}

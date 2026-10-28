"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import { Field, Notes, Select, Toggle, RuleList } from "./fields";
import {
  components,
  generalRule,
  technicalSources,
  technicalSystems,
} from "../../modules/builder/catalog";
import type {
  CheckupTemplate,
  CheckupTemplateItem,
} from "../../modules/builder/models";
import {
  duplicateTemplate,
  publishTemplate,
  saveTemplateDraft,
  uid,
} from "../../modules/builder/use-cases";
const newItem = (): CheckupTemplateItem => ({
  id: uid(),
  componentId: components[0].id,
  system: technicalSystems[0].name,
  title: "",
  instruction: "",
  required: true,
  measurementRequired: false,
  evidenceRequired: false,
  sourceIds: [],
});
const blank = (): CheckupTemplate => ({
  id: uid(),
  name: "",
  description: "",
  category: "Preventiva",
  estimatedMinutes: 30,
  status: "draft",
  demonstration: false,
  items: [newItem()],
  applicability: structuredClone(generalRule),
  versions: [],
});
export default function TemplateLibrary({
  templates,
  onSave,
  onSeed,
}: {
  templates: CheckupTemplate[];
  onSave: (v: CheckupTemplate) => void;
  onSeed: () => void;
}) {
  const [draft, setDraft] = useState<CheckupTemplate | null>(null);
  const [error, setError] = useState("");
  const attempt = (fn: () => void) => {
    try {
      fn();
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dados inválidos.");
    }
  };
  const save = (publish: boolean) => {
    if (!draft) return;
    attempt(() => {
      const previous = templates.find((t) => t.id === draft.id);
      let t = saveTemplateDraft(draft, previous);
      if (publish) t = publishTemplate(t);
      onSave(t);
      setDraft(null);
    });
  };
  const patchItem = (index: number, patch: Partial<CheckupTemplateItem>) => {
    if (draft)
      setDraft({
        ...draft,
        items: draft.items.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      });
  };
  const move = (index: number, delta: number) => {
    if (!draft) return;
    const items = [...draft.items];
    [items[index], items[index + delta]] = [items[index + delta], items[index]];
    setDraft({ ...draft, items });
  };
  return (
    <div className="builder-stack">
      <section className="panel">
        <div className="builder-section-heading">
          <div>
            <h2>Biblioteca de Check-ups</h2>
            <p className="muted">
              Publicações são imutáveis. Editar cria um rascunho para a próxima
              versão.
            </p>
          </div>
          <div className="builder-actions">
            <Button variant="outline" onClick={onSeed}>
              Adicionar demonstrativos
            </Button>
            <Button
              onClick={() => {
                setDraft(blank());
                setError("");
              }}
            >
              Criar modelo
            </Button>
          </div>
        </div>
        <div className="builder-cards">
          {templates.map((t) => (
            <article className="builder-card" key={t.id}>
              <span className="builder-tag">
                {t.demonstration ? "DEMONSTRATIVO · " : ""}
                {t.status === "draft"
                  ? "Rascunho"
                  : t.status === "archived"
                    ? "Arquivado"
                    : "Publicado"}{" "}
                · v{t.versions.at(-1)?.number ?? 0}
              </span>
              <h3>{t.name}</h3>
              <p className="muted">{t.description}</p>
              <p className="muted">
                {t.items.length} itens · {t.estimatedMinutes} min · {t.category}
              </p>
              <small className="muted">ID: {t.id}</small>
              <div className="builder-actions">
                <Button
                  variant="outline"
                  disabled={t.status === "archived"}
                  onClick={() => {
                    setDraft(structuredClone(t));
                    setError("");
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraft(duplicateTemplate(t));
                    setError("");
                  }}
                >
                  Duplicar
                </Button>
                <Button
                  variant="ghost"
                  disabled={t.status === "archived"}
                  onClick={() =>
                    attempt(() => onSave({ ...t, status: "archived" }))
                  }
                >
                  Arquivar
                </Button>
              </div>
              <details>
                <summary>Histórico publicado</summary>
                {t.versions.map((v) => (
                  <p className="muted" key={v.id}>
                    v{v.number} · {v.name} · {v.items.length} itens ·{" "}
                    {new Date(v.publishedAt).toLocaleDateString("pt-BR")}
                  </p>
                ))}
              </details>
            </article>
          ))}
        </div>
        {!templates.length && (
          <p className="builder-empty">
            Crie um modelo ou adicione os cinco demonstrativos, identificados
            separadamente dos seus modelos reais.
          </p>
        )}
      </section>
      {error && !draft && (
        <p role="alert" className="builder-error">
          {error}
        </p>
      )}
      {draft && (
        <section className="panel" id="template-editor">
          <h2>
            {draft.versions.length ? "Editar próxima versão" : "Novo modelo"}
          </h2>
          <p className="muted">
            Salvar rascunho retira o modelo da seleção de novas inspeções até
            sua publicação. Inspeções anteriores preservam sua cópia.
          </p>
          <div className="builder-fields">
            <Field
              label="Nome do check-up"
              value={draft.name}
              required
              onChange={(v) => setDraft({ ...draft, name: v })}
            />
            <Field
              label="Categoria de serviço"
              value={draft.category}
              onChange={(v) => setDraft({ ...draft, category: v })}
            />
            <Field
              label="Tempo estimado (minutos)"
              value={draft.estimatedMinutes}
              type="number"
              min={1}
              max={1440}
              onChange={(v) =>
                setDraft({ ...draft, estimatedMinutes: Number(v) })
              }
            />
          </div>
          <Notes
            label="Descrição"
            value={draft.description}
            onChange={(v) => setDraft({ ...draft, description: v })}
          />
          <h3 className="builder-subtitle">Aplicabilidade</h3>
          <p className="muted">
            Campos vazios permitem qualquer valor. Separe alternativas por
            vírgula. Regras por versão ou motor exigem identificação completa.
          </p>
          <div className="builder-fields">
            {(["makes", "models", "variants", "engines"] as const).map(
              (key, i) => (
                <RuleList
                  key={key}
                  label={
                    [
                      "Marcas aplicáveis",
                      "Modelos aplicáveis",
                      "Versões aplicáveis",
                      "Motorizações aplicáveis",
                    ][i]
                  }
                  values={draft.applicability[key]}
                  onCommit={(v) =>
                    setDraft({
                      ...draft,
                      applicability: { ...draft.applicability, [key]: v },
                    })
                  }
                />
              ),
            )}
            <Field
              label="Ano inicial"
              type="number"
              value={draft.applicability.yearFrom ?? ""}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  applicability: {
                    ...draft.applicability,
                    yearFrom: v ? Number(v) : null,
                  },
                })
              }
            />
            <Field
              label="Ano final"
              type="number"
              value={draft.applicability.yearTo ?? ""}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  applicability: {
                    ...draft.applicability,
                    yearTo: v ? Number(v) : null,
                  },
                })
              }
            />
          </div>
          <Toggle
            label="Exigir identificação completa"
            checked={draft.applicability.requiresIdentification}
            onChange={(v) =>
              setDraft({
                ...draft,
                applicability: {
                  ...draft.applicability,
                  requiresIdentification: v,
                },
              })
            }
          />
          <h3 className="builder-subtitle">
            Itens técnicos · na ordem de execução
          </h3>
          {draft.items.map((item, index) => (
            <div className="builder-card" key={item.id}>
              <div className="builder-section-heading">
                <strong>Item {index + 1}</strong>
                <div className="builder-actions">
                  <Button
                    variant="outline"
                    disabled={!index}
                    onClick={() => move(index, -1)}
                    aria-label={`Subir item ${index + 1}`}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="outline"
                    disabled={index === draft.items.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Descer item ${index + 1}`}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={draft.items.length === 1}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        items: draft.items.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Remover item
                  </Button>
                </div>
              </div>
              <Select
                label={`Componente do item ${index + 1}`}
                value={item.componentId}
                options={components.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                onChange={(v) => {
                  const c = components.find((c) => c.id === v)!;
                  patchItem(index, {
                    componentId: v,
                    system: technicalSystems.find((s) => s.id === c.systemId)!
                      .name,
                  });
                }}
              />
              <Field
                label={`Título do item ${index + 1}`}
                value={item.title}
                onChange={(v) => patchItem(index, { title: v })}
              />
              <Notes
                label={`Procedimento do item ${index + 1}`}
                value={item.instruction}
                onChange={(v) => patchItem(index, { instruction: v })}
              />
              <div className="builder-actions">
                <Toggle
                  label="Resultado obrigatório"
                  checked={item.required}
                  onChange={(v) => patchItem(index, { required: v })}
                />
                <Toggle
                  label="Medição obrigatória"
                  checked={item.measurementRequired}
                  onChange={(v) => patchItem(index, { measurementRequired: v })}
                />
                <Toggle
                  label="Evidência obrigatória"
                  checked={item.evidenceRequired}
                  onChange={(v) => patchItem(index, { evidenceRequired: v })}
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setDraft({ ...draft, items: [...draft.items, newItem()] })
            }
          >
            Adicionar item técnico
          </Button>
          {error && (
            <p className="builder-error" role="alert">
              {error}
            </p>
          )}
          <div className="builder-actions">
            <Button onClick={() => save(false)}>Salvar rascunho</Button>
            <Button onClick={() => save(true)}>Publicar nova versão</Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancelar edição
            </Button>
          </div>
        </section>
      )}
      <section className="panel">
        <details>
          <summary>
            Catálogo técnico inicial · sistemas, componentes e fontes
          </summary>
          <p className="muted">
            Catálogo genérico sem tolerâncias de fabricante. Componentes são
            selecionáveis nos modelos.
          </p>
          {technicalSystems.map((s) => (
            <div className="builder-card" key={s.id}>
              <h3>{s.name}</h3>
              <p className="muted">
                {components
                  .filter((c) => c.systemId === s.id)
                  .map((c) => c.name)
                  .join(" · ")}
              </p>
            </div>
          ))}
          {technicalSources.map((s) => (
            <p className="muted" key={s.id}>
              {s.title} · {s.reference}
            </p>
          ))}
        </details>
      </section>
    </div>
  );
}

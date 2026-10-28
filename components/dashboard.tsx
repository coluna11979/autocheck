"use client";
import { useEffect, useState } from "react";
import BuilderWorkspace, {
  screens,
  type Screen,
} from "@/components/builder/workspace";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  CarFront,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileText,
  Gauge,
  LayoutDashboard,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  categories,
  checkupPrice,
  emptyInspection,
  money,
  parseInspection,
  plans,
  priorities,
  STORAGE_KEY,
  systems,
  urgentTotal,
  type Category,
  type Finding,
  type Inspection,
  type Plan,
  type Priority,
  type System,
} from "@/lib/autocheck";
export default function Dashboard() {
  const [data, setData] = useState<Inspection>(emptyInspection);
  const [loaded, setLoaded] = useState(false);
  const [storageSafe, setStorageSafe] = useState(true);
  const [notice, setNotice] = useState("");
  const [system, setSystem] = useState<System>(systems[0]);
  const [priority, setPriority] = useState<Priority>("urgent");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [estimate, setEstimate] = useState("");
  const [tab, setTab] = useState("inspection");
  const [screen, setScreen] = useState<Screen>("panel");
  const navigate = (next: Screen) => {
    setScreen(next);
    if (next === "report")
      requestAnimationFrame(() =>
        document.getElementById("report")?.scrollIntoView(),
      );
  };
  // Hydrate browser-only storage after SSR; one guarded render prevents overwriting saved data.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time hydration from browser storage after SSR.
      if (raw) setData(parseInspection(raw));
    } catch {
      setStorageSafe(false);
      setNotice(
        "Não foi possível carregar os dados locais. O conteúdo anterior foi preservado; novas alterações ficarão apenas nesta sessão.",
      );
    }
    setLoaded(true);
  }, []);
  // Surface write failures to the user instead of claiming persistence succeeded.
  useEffect(() => {
    if (loaded && storageSafe) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Report external storage write failure.
        setStorageSafe(false);
        setNotice(
          "Armazenamento indisponível. As alterações estão apenas nesta sessão; exporte uma cópia.",
        );
      }
    }
  }, [data, loaded, storageSafe]);
  const update = (patch: Partial<Inspection>) =>
    setData((old) => ({ ...old, ...patch }));
  const urgent = data.findings.filter((f) => f.priority === "urgent").length;
  const price = checkupPrice(data.category, data.plan);
  function addFinding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cost = Number(estimate);
    if (!title.trim() || !Number.isFinite(cost) || cost < 0) return;
    const finding: Finding = {
      id: crypto.randomUUID(),
      system,
      title: title.trim(),
      notes: notes.trim(),
      estimate: cost,
      priority,
    };
    setData((old) => ({ ...old, findings: [...old.findings, finding] }));
    setTitle("");
    setNotes("");
    setEstimate("");
    setNotice("Achado registrado. O relatório foi atualizado.");
  }
  function exportReport() {
    const payload = {
      app: "AutoCheck",
      simulated: true,
      generatedAt: new Date().toISOString(),
      ...data,
      checkupPrice: price,
      urgentEstimate: urgentTotal(data.findings),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `autocheck-${data.vehicle.plate || "relatorio"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice(
      "Exportação simulada concluída: uma cópia JSON do relatório foi baixada.",
    );
  }
  if (!loaded)
    return (
      <main className="loading">
        <Activity size={28} /> Preparando sua estação de trabalho…
      </main>
    );
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-mark">
            <Activity size={23} />
          </span>
          auto<span>check</span>
          <i />
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Navegação principal">
          {screens.map((item, index) => {
            const Icon = [
              LayoutDashboard,
              CarFront,
              ClipboardCheck,
              Wrench,
              Activity,
              FileText,
            ][index];
            return (
              <a
                key={item.id}
                href={item.id === "report" ? "#report" : "#overview"}
                className={screen === item.id ? "nav-active" : ""}
                onClick={() => navigate(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="secure-box">
            <ShieldCheck size={23} />
            <strong>Diagnóstico com confiança</strong>
            <p>
              Cada detalhe importa.
              <br />
              Cada cuidado faz a diferença.
            </p>
          </div>
          <div className="profile">
            <div className="avatar">TC</div>
            <div>
              <strong>Técnico AutoCheck</strong>
              <span>Estação de diagnóstico</span>
            </div>
            <CircleHelp size={16} />
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            Workspace <ChevronRight size={14} /> <b>Inspeção veicular</b>
          </span>
          <span className="status-dot">
            {storageSafe ? "Salvamento local ativo" : "Somente nesta sessão"}
          </span>
        </header>
        <main id="overview">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> SEU PRÓXIMO DIAGNÓSTICO COMEÇA AQUI
              </div>
              <h1>
                Cuidado em cada detalhe<span>.</span>
              </h1>
              <p>
                Inspecione, priorize e transforme diagnósticos em tranquilidade.
              </p>
            </div>
            <div className="session-badge">
              <ShieldCheck size={17} /> Ambiente do técnico
            </div>
          </div>
          <BuilderWorkspace
            screen={screen}
            onNavigate={navigate}
            legacy={data}
            onOpen={(report) => {
              setData(report);
              setNotice("Laudo selecionado. Consulte a aba Relatório.");
            }}
            onConfirm={(finding) =>
              setData((old) => ({
                ...old,
                findings: [...old.findings, finding],
              }))
            }
          />
          <div hidden={screen !== "panel" && screen !== "report"}>
            <div className="stats-grid">
              <Stat
                icon={<CarFront />}
                label="VEÍCULO EM INSPEÇÃO"
                value={data.vehicle.model || "Aguardando veículo"}
                detail={data.vehicle.plate || "Preencha a identificação abaixo"}
              />
              <Stat
                icon={<ClipboardCheck />}
                label="SISTEMAS VERIFICADOS"
                value={`${data.inspected.length} de 6`}
                detail="Uma visão completa do veículo"
              />
              <Stat
                icon={<Activity />}
                label="PONTOS DE ATENÇÃO"
                value={String(data.findings.length).padStart(2, "0")}
                detail={`${urgent} ${urgent === 1 ? "item requer" : "itens requerem"} atenção imediata`}
              />
              <Stat
                icon={<Wrench />}
                label="ESTIMATIVA URGENTE"
                value={money(urgentTotal(data.findings))}
                detail="Valor estimado dos reparos prioritários"
                accent
              />
            </div>
            {notice && (
              <div className="notice" role="status">
                {notice}
                <button aria-label="Fechar aviso" onClick={() => setNotice("")}>
                  ×
                </button>
              </div>
            )}
            <div className="content-grid">
              <div className="editor">
                <section className="panel" id="vehicle">
                  <PanelHeading
                    number="01"
                    title="Identificação do veículo"
                    subtitle="O primeiro passo para um diagnóstico preciso."
                  />
                  <div className="vehicle-fields">
                    <Field label="Nome do proprietário" className="wide">
                      <input
                        placeholder="Ex.: João Silva"
                        value={data.vehicle.owner}
                        maxLength={100}
                        onChange={(e) =>
                          update({
                            vehicle: { ...data.vehicle, owner: e.target.value },
                          })
                        }
                      />
                    </Field>
                    <Field label="Veículo / modelo" className="wide">
                      <input
                        placeholder="Ex.: Volkswagen Polo 1.0 TSI"
                        value={data.vehicle.model}
                        maxLength={100}
                        onChange={(e) =>
                          update({
                            vehicle: { ...data.vehicle, model: e.target.value },
                          })
                        }
                      />
                    </Field>
                    <Field label="Placa">
                      <input
                        placeholder="ABC1D23"
                        maxLength={8}
                        value={data.vehicle.plate}
                        onChange={(e) =>
                          update({
                            vehicle: {
                              ...data.vehicle,
                              plate: e.target.value.toUpperCase(),
                            },
                          })
                        }
                      />
                    </Field>
                    <Field label="Ano">
                      <input
                        type="number"
                        min="1900"
                        max="2100"
                        placeholder="2022"
                        value={data.vehicle.year}
                        onChange={(e) =>
                          update({
                            vehicle: { ...data.vehicle, year: e.target.value },
                          })
                        }
                      />
                    </Field>
                    <Field label="Quilometragem">
                      <div className="input-unit">
                        <input
                          type="number"
                          min="0"
                          placeholder="45.000"
                          value={data.vehicle.mileage}
                          onChange={(e) =>
                            update({
                              vehicle: {
                                ...data.vehicle,
                                mileage: e.target.value,
                              },
                            })
                          }
                        />
                        <span>km</span>
                      </div>
                    </Field>
                  </div>
                </section>
                <section className="panel">
                  <PanelHeading
                    number="02"
                    title="Check-up na medida certa"
                    subtitle="Selecione a categoria e o nível de cuidado."
                  />
                  <Field label="Categoria do veículo">
                    <select
                      value={data.category}
                      onChange={(e) =>
                        update({ category: e.target.value as Category })
                      }
                    >
                      {Object.entries(categories).map(([key, label]) => (
                        <option value={key} key={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="plans">
                    {Object.entries(plans).map(([key, plan]) => (
                      <button
                        key={key}
                        className={`plan ${data.plan === key ? "selected" : ""}`}
                        aria-pressed={data.plan === key}
                        onClick={() => update({ plan: key as Plan })}
                      >
                        <div>
                          <span>{plan.label}</span>
                          <span className="radio">
                            {data.plan === key && <Check size={11} />}
                          </span>
                        </div>
                        <strong>
                          {money(checkupPrice(data.category, key as Plan))}
                        </strong>
                        <p>{plan.description}</p>
                        {key === "complete" && <small>MAIS ESCOLHIDO</small>}
                      </button>
                    ))}
                  </div>
                  <div className="price-footer">
                    <span>
                      <ShieldCheck size={15} /> Valor do serviço de inspeção
                    </span>
                    <strong>{money(price)}</strong>
                  </div>
                </section>
                <section className="panel" id="inspection">
                  <PanelHeading
                    number="03"
                    title="Inspeção técnica"
                    subtitle="Seis sistemas. Nenhum detalhe para trás."
                  />
                  <div className="tabs">
                    <button
                      className={tab === "inspection" ? "active" : ""}
                      onClick={() => setTab("inspection")}
                    >
                      Registrar achado
                    </button>
                    <button
                      className={tab === "list" ? "active" : ""}
                      onClick={() => setTab("list")}
                    >
                      Achados registrados <span>{data.findings.length}</span>
                    </button>
                  </div>
                  {tab === "inspection" ? (
                    <>
                      <div className="system-grid">
                        {systems.map((s, i) => (
                          <button
                            key={s}
                            className={system === s ? "active" : ""}
                            onClick={() => setSystem(s)}
                          >
                            <span>{String(i + 1).padStart(2, "0")}</span>
                            {s}
                            {data.inspected.includes(s) && (
                              <CheckCheck size={14} />
                            )}
                          </button>
                        ))}
                      </div>
                      <label className="inspected-toggle">
                        <input
                          type="checkbox"
                          checked={data.inspected.includes(system)}
                          onChange={(e) =>
                            update({
                              inspected: e.target.checked
                                ? [...data.inspected, system]
                                : data.inspected.filter((s) => s !== system),
                            })
                          }
                        />{" "}
                        Marcar {system.toLowerCase()} como verificado
                      </label>
                      <form onSubmit={addFinding}>
                        <Field label="O que foi identificado?">
                          <input
                            required
                            maxLength={160}
                            placeholder="Ex.: Desgaste nas pastilhas de freio dianteiras"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                          />
                        </Field>
                        <Field label="Observações técnicas">
                          <textarea
                            rows={3}
                            maxLength={2000}
                            placeholder="Descreva a condição e a recomendação de manutenção…"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </Field>
                        <div className="form-row">
                          <Field label="Prioridade">
                            <select
                              aria-label="Prioridade"
                              value={priority}
                              onChange={(e) =>
                                setPriority(e.target.value as Priority)
                              }
                            >
                              {Object.entries(priorities).map(([key, p]) => (
                                <option key={key} value={key}>
                                  {p.label} · {p.period}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Estimativa do reparo (R$)">
                            <input
                              type="number"
                              required
                              min="0"
                              max="10000000"
                              step="0.01"
                              placeholder="0,00"
                              value={estimate}
                              onChange={(e) => setEstimate(e.target.value)}
                            />
                          </Field>
                        </div>
                        <div className="form-footer">
                          <span>O relatório é atualizado automaticamente.</span>
                          <Button type="submit">
                            <Plus size={16} /> Adicionar achado
                          </Button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="findings-list">
                      {data.findings.length === 0 ? (
                        <Empty />
                      ) : (
                        data.findings.map((f) => (
                          <div className="finding-row" key={f.id}>
                            <span
                              className={`priority-dot ${priorities[f.priority].color}`}
                            />
                            <div>
                              <strong>{f.title}</strong>
                              <small>
                                {f.system} · {priorities[f.priority].period}
                              </small>
                              {f.notes && <p>{f.notes}</p>}
                              {f.origin && (
                                <p>
                                  Origem:{" "}
                                  {f.origin === "diagnostic"
                                    ? "Diagnóstico guiado"
                                    : "Inspeção preventiva"}{" "}
                                  · {f.sourceId}
                                  <br />
                                  Evidência: {f.evidence}
                                </p>
                              )}
                              <b>{money(f.estimate)}</b>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Excluir achado: ${f.title}`}
                              onClick={() => {
                                update({
                                  findings: data.findings.filter(
                                    (item) => item.id !== f.id,
                                  ),
                                });
                                setNotice(
                                  "Achado excluído. Relatório atualizado.",
                                );
                              }}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </section>
              </div>
              <aside className="report-column" id="report">
                <section className="panel report">
                  <div className="report-heading">
                    <span className="report-icon">
                      <FileText size={21} />
                    </span>
                    <span className="live">
                      <span /> AO VIVO
                    </span>
                  </div>
                  <h2>Clareza para decidir.</h2>
                  <p className="muted">
                    O diagnóstico do veículo, em um só lugar.
                  </p>
                  <div className="report-vehicle">
                    <CarFront size={30} />
                    <div>
                      <strong>
                        {data.vehicle.model || "Seu veículo aqui"}
                      </strong>
                      <span>
                        {data.vehicle.plate || "Placa não informada"}
                        {data.vehicle.year && ` · ${data.vehicle.year}`}
                      </span>
                    </div>
                  </div>
                  <div className="report-meta">
                    <span>
                      Proprietário{" "}
                      <b>{data.vehicle.owner || "Não informado"}</b>
                    </span>
                    <span>
                      Quilometragem{" "}
                      <b>
                        {data.vehicle.mileage
                          ? `${Number(data.vehicle.mileage).toLocaleString("pt-BR")} km`
                          : "Não informada"}
                      </b>
                    </span>
                    <span>
                      Plano selecionado <b>{plans[data.plan].label}</b>
                    </span>
                  </div>
                  <div className="progress-label">
                    <span>Progresso da inspeção</span>
                    <b>{Math.round((data.inspected.length / 6) * 100)}%</b>
                  </div>
                  <div className="progress-track">
                    <div
                      style={{ width: `${(data.inspected.length / 6) * 100}%` }}
                    />
                  </div>
                  <div className="report-divider" />
                  <h3>Plano de manutenção</h3>
                  <p className="muted small">
                    O cuidado certo, no momento certo.
                  </p>
                  <div className="timeline">
                    {(Object.keys(priorities) as Priority[]).map((p) => {
                      const items = data.findings.filter(
                        (f) => f.priority === p,
                      );
                      return (
                        <div
                          className={`timeline-item ${priorities[p].color}`}
                          key={p}
                        >
                          <div className="timeline-dot" />
                          <div className="timeline-title">
                            <strong>{priorities[p].period}</strong>
                            <span>
                              {items.length}{" "}
                              {items.length === 1 ? "item" : "itens"}
                            </span>
                          </div>
                          <small>{priorities[p].label}</small>
                          {items.length ? (
                            items.map((f) => (
                              <div className="timeline-finding" key={f.id}>
                                <span>{f.title}</span>
                                {f.origin && (
                                  <small>
                                    Origem:{" "}
                                    {f.origin === "diagnostic"
                                      ? "Diagnóstico guiado"
                                      : "Inspeção preventiva"}{" "}
                                    · Evidência: {f.evidence}
                                  </small>
                                )}
                                <b>{money(f.estimate)}</b>
                              </div>
                            ))
                          ) : (
                            <p className="timeline-empty">
                              Nenhum achado registrado
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="urgent-total">
                    <span>Estimativa de reparos urgentes</span>
                    <strong>{money(urgentTotal(data.findings))}</strong>
                    <small>
                      Valores estimados, sujeitos à avaliação e aprovação.
                    </small>
                  </div>
                  <div className="service-total">
                    <span>Check-up {plans[data.plan].label}</span>
                    <b>{money(price)}</b>
                  </div>
                  <Button className="w-full" onClick={exportReport}>
                    <ArrowDownToLine size={17} /> Exportar relatório{" "}
                    <ArrowRight size={16} />
                  </Button>
                  <p className="export-note">
                    Exportação demonstrativa em JSON · sem envio externo
                  </p>
                </section>
                <div className="tip">
                  <Sparkles size={20} />
                  <div>
                    <strong>Mais prevenção. Menos surpresas.</strong>
                    <p>
                      Uma inspeção hoje é mais segurança em cada quilômetro
                      amanhã.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
          <footer>
            <span className="footer-brand">
              <Activity size={15} /> autocheck
            </span>
            <span>Feito para quem cuida de quem dirige.</span>
            <span>Seus dados ficam neste navegador.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function PanelHeading({
  number,
  title,
  subtitle,
}: {
  number: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="panel-heading">
      <span>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className={`stat ${accent ? "accent" : ""}`}>
      <div className="stat-label">
        {label}
        {icon}
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}
function Empty() {
  return (
    <div className="empty">
      <Gauge size={30} />
      <strong>Um olhar atento faz a diferença.</strong>
      <p>Registre o primeiro achado na inspeção técnica.</p>
    </div>
  );
}

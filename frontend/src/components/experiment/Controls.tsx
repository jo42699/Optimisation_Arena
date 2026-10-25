"use client";

import { ChevronRight, Play, Settings2 } from "lucide-react";
import { useState } from "react";
import { equationHtml } from "@/lib/equation";
import { functionImageMap } from "@/lib/functionImages";
import { titleCase } from "@/lib/formatters";
import { useExperiment } from "@/context/ExperimentContext";
import type { AlgorithmMetadata } from "@/types/experiment";

function FunctionThumb({ id, name, selected = false }: { id: string; name: string; selected?: boolean }) {
  return <img src={functionImageMap[id] || "/images/functions/sphere.svg"} alt={`${name} landscape placeholder`} className={selected ? "selected-function-preview__image" : "function-card__image"}/>;
}

export function ProblemCard() {
  const { functions, selectedFunction, selectFunction, metadataStatus, error } = useExperiment();
  const current = functions.find((item) => item.identifier === selectedFunction);
  if (metadataStatus === "loading") return <section className="card p-4 text-sm muted">Loading mathematical problems…</section>;
  if (metadataStatus === "error") return <section className="card p-4 text-sm text-rose-300">{error || "Could not connect to the backend."}</section>;
  return <section className="card p-4">
    <h2 className="mb-3 text-[15px] font-semibold">1. Choose a mathematical problem</h2>
    <label className="sr-only" htmlFor="function-select">Mathematical function</label>
    <select id="function-select" className="input mb-1" value={selectedFunction} onChange={(event) => selectFunction(event.target.value)}>{functions.map((item) => <option key={item.identifier} value={item.identifier}>{item.name} Function</option>)}</select>
    {current && <>
      <div className="selected-function-preview">
        <FunctionThumb id={current.identifier} name={current.name} selected/>
        <div className="min-w-0"><h3 className="text-[14px] font-semibold">{current.name} Function</h3><div className="mt-2 max-w-full overflow-hidden text-[15px] text-blue-100" dangerouslySetInnerHTML={{ __html: equationHtml(current.equation_latex) }}/><p className="mt-2 text-[12px] leading-[1.5] muted">{current.description}</p></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]"><div className="rounded-md border border-border-panel bg-input-bg p-2"><span className="block text-[11px] muted">Global minimum</span><span className="mt-1 block">{current.global_minima.length > 1 ? `${current.global_minima.length} known minima` : `(${current.global_minima[0]?.position.join(", ")})`}</span></div><div className="rounded-md border border-border-panel bg-input-bg p-2"><span className="block text-[11px] muted">Search bounds</span><span className="mt-1 block break-words">x,y ∈ [{current.bounds.x[0]}, {current.bounds.x[1]}]</span></div></div>
      <div className="mt-3 space-y-2">{functions.filter((item) => item.identifier !== selectedFunction).map((item) => <button key={item.identifier} onClick={() => selectFunction(item.identifier)} className="function-card w-full text-left"><FunctionThumb id={item.identifier} name={item.name}/><span className="min-w-0"><span className="block text-[13px] font-semibold">{item.name} Function</span><span className="mt-1 block overflow-hidden text-[12px] text-blue-200" dangerouslySetInnerHTML={{ __html: equationHtml(item.equation_latex) }}/></span><ChevronRight className="text-blue-300" size={16}/></button>)}</div>
    </>}
  </section>;
}

function ParameterEditor({ algorithm }: { algorithm: AlgorithmMetadata }) {
  const { form, updateForm } = useExperiment();
  const params = form?.parameters[algorithm.identifier] || {};
  return <div className="mt-3 grid grid-cols-2 gap-2">{Object.entries(algorithm.parameters).map(([key, definition]) => <label key={key} className="text-[11px] muted"><span className="mb-1 flex items-center justify-between"><span>{titleCase(key)}</span><span>{definition.min}–{definition.max}</span></span><input className="input h-[34px] py-1.5 text-xs" type="number" step="any" min={definition.min} max={definition.max} value={params[key] ?? definition.default} onChange={(event) => { const value = Number(event.target.value); if (!Number.isFinite(value) || !form) return; updateForm({ parameters: { ...form.parameters, [algorithm.identifier]: { ...params, [key]: value } } }); }}/></label>)}</div>;
}

export function AlgorithmCard() {
  const { algorithms, selectedAlgorithms, toggleAlgorithm } = useExperiment();
  const [open, setOpen] = useState<string | null>(null);
  return <section className="card p-4"><h2 className="mb-3 text-[15px] font-semibold">2. Select algorithms to compare</h2><div className="space-y-2">{algorithms.map((algorithm) => { const selected = selectedAlgorithms.includes(algorithm.identifier); return <div key={algorithm.identifier} className={`rounded-md border px-3 py-2 ${selected ? "border-border-active bg-[#0a2040] shadow-active" : "border-border-panel bg-panel-raised"}`}><div className="flex min-h-[24px] items-center gap-3"><input id={`algorithm-${algorithm.identifier}`} type="checkbox" checked={selected} onChange={() => toggleAlgorithm(algorithm.identifier)} className="h-4 w-4 accent-electric"/><label htmlFor={`algorithm-${algorithm.identifier}`} className="flex-1 cursor-pointer text-[13px] font-semibold">{algorithm.name}</label><button type="button" aria-label={`Configure ${algorithm.name}`} onClick={() => setOpen(open === algorithm.identifier ? null : algorithm.identifier)} className="text-blue-200 hover:text-white"><Settings2 size={16}/></button></div>{selected && open === algorithm.identifier && <ParameterEditor algorithm={algorithm}/>}<p className="mt-1 pl-7 text-[11px] leading-[1.4] muted">{algorithm.description}</p></div>; })}</div></section>;
}

export function ExperimentForm() {
  const { form, selectedAlgorithms, status, submit, updateForm } = useExperiment();
  if (!form) return null;
  const setNumber = (key: "iterations" | "seed" | "resolution" | "repeatedTrials", value: number) => { if (Number.isFinite(value)) updateForm({ [key]: value }); };
  return <section className="card p-4"><h2 className="mb-3 text-[15px] font-semibold">3. Configure experiment</h2><div className="grid grid-cols-2 gap-3"><label className="label">Iterations<input className="input mt-1" type="number" min={1} max={10000} value={form.iterations} onChange={(e) => setNumber("iterations", Number(e.target.value))}/></label><label className="label">Random seed<input className="input mt-1" type="number" value={form.seed} onChange={(e) => setNumber("seed", Number(e.target.value))}/></label></div><details className="mt-3 rounded-md border border-border-panel bg-panel-raised p-3"><summary className="cursor-pointer text-[12px] text-blue-100">Advanced settings (optional)</summary><div className="mt-3 grid grid-cols-2 gap-3"><label className="label">Landscape resolution<input className="input mt-1" type="number" min={10} max={150} value={form.resolution} onChange={(e) => setNumber("resolution", Number(e.target.value))}/></label><label className="label">Repeated trials<input className="input mt-1" type="number" min={1} max={50} value={form.repeatedTrials} onChange={(e) => setNumber("repeatedTrials", Number(e.target.value))}/></label><label className="label">Ranking metric<select className="input mt-1" value={form.rankingMetric} onChange={(e) => updateForm({ rankingMetric: e.target.value as typeof form.rankingMetric })}><option value="best_score">Best score</option><option value="runtime">Runtime</option><option value="balanced">Balanced</option></select></label><label className="label">Starting point<div className="mt-1 grid grid-cols-2 gap-1"><input aria-label="Starting x" className="input" type="number" step="any" placeholder="auto" value={form.startingPoint?.[0] ?? ""} onChange={(e) => updateForm({ startingPoint: [Number(e.target.value), form.startingPoint?.[1] ?? 0] })}/><input aria-label="Starting y" className="input" type="number" step="any" placeholder="auto" value={form.startingPoint?.[1] ?? ""} onChange={(e) => updateForm({ startingPoint: [form.startingPoint?.[0] ?? 0, Number(e.target.value)] })}/></div></label></div></details><button disabled={status === "loading" || selectedAlgorithms.length === 0} onClick={() => void submit()} className="mt-4 flex h-[48px] w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-accent-blue to-accent-indigo px-4 text-[14px] font-semibold text-white shadow-active transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"><Play size={17} fill="currentColor"/>{status === "loading" ? "Running experiment…" : selectedAlgorithms.length ? "Run Experiment" : "Select an algorithm"}</button></section>;
}

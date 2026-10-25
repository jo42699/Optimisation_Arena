"use client";

import { BrainCircuit, GitBranch, LoaderCircle, Play, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { useExperiment } from "@/context/ExperimentContext";
import type { ModelEvaluation } from "@/types/experiment";

const algorithmLabels: Record<string, string> = {
  gradient_descent: "Gradient Descent",
  simulated_annealing: "Simulated Annealing",
  genetic_algorithm: "Genetic Algorithm",
};

export function IntelligentSelector() {
  const { functions, selectedFunction, form, status, modelStatus, modelRequestStatus, prediction, predictionStatus, predictionError, predictAlgorithm, trainModel, report, runComparison } = useExperiment();
  const problem = functions.find((item) => item.identifier === selectedFunction);
  const [dimensions, setDimensions] = useState(problem?.dimension ?? 2);
  const [budget, setBudget] = useState(form?.iterations ?? 500);
  const [showPath, setShowPath] = useState(true);
  const busy = predictionStatus === "loading";
  const evaluation = (prediction?.model_evaluation || modelStatus?.metadata?.evaluation) as ModelEvaluation | undefined;
  const performanceMetrics: { label: string; value: unknown }[] = [
    { label: "Held-out accuracy", value: evaluation?.held_out_accuracy },
    { label: "Balanced accuracy", value: evaluation?.held_out_balanced_accuracy },
    { label: "Baseline", value: evaluation?.baseline_accuracy },
    { label: "Training groups", value: modelStatus?.metadata?.distinct_configuration_count },
  ];
  const reportBudget = report?.config.max_evaluations ?? report?.config.iterations;
  const reportMatches = Boolean(report && report.config.function === selectedFunction && reportBudget === budget);
  const observedWinner = reportMatches ? report?.comparison.winner?.algorithm : null;
  const predictionOutcome = prediction && observedWinner ? prediction.recommended_algorithm === observedWinner ? "Prediction matched the measured winner." : "Prediction did not match the measured winner." : null;

  const onPredict = () => {
    if (!problem || !Number.isInteger(dimensions) || dimensions < 1 || !Number.isInteger(budget) || budget < 100) return;
    void predictAlgorithm(dimensions, budget);
  };

  return <section className="card selector-panel p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><BrainCircuit className="text-cyan" size={20}/><h2 className="text-[17px] font-bold">Intelligent Algorithm Selector</h2></div><p className="mt-1 max-w-3xl text-[12px] leading-5 muted">Historical measured experiments → decision-tree recommendation → experimental verification. Predictions are only available for configurations represented by the trained model.</p></div>
      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${modelStatus?.status === "trained" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-amber-400/40 bg-amber-400/10 text-amber-200"}`}>{modelRequestStatus === "loading" ? "Checking model…" : modelStatus?.status === "trained" ? "Model trained" : modelStatus?.status || "Model unavailable"}</span>
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(240px,.8fr)_minmax(320px,1.2fr)_minmax(260px,1fr)]">
      <div className="rounded-lg border border-border-panel bg-input-bg p-3">
        <h3 className="text-[13px] font-semibold text-blue-100">Prediction inputs</h3>
        <label className="label mt-3 block">Benchmark function<select className="input mt-1" value={selectedFunction} onChange={(event) => { const next = functions.find((item) => item.identifier === event.target.value); if (next) setDimensions(next.dimension); }} disabled><option value={selectedFunction}>{problem?.name || selectedFunction || "Select a function"}</option></select></label>
        <div className="mt-3 grid grid-cols-2 gap-2"><label className="label">Dimensions<input className="input mt-1" type="number" min={1} max={1000} value={dimensions} onChange={(event) => setDimensions(Number(event.target.value))}/></label><label className="label">Evaluation budget<input className="input mt-1" type="number" min={100} max={500000} value={budget} onChange={(event) => setBudget(Number(event.target.value))}/></label></div>
        <p className="mt-2 text-[11px] leading-4 muted">The existing benchmark engine is 2D and uses a minimum comparable budget of 100 evaluations.</p>
        <button type="button" onClick={onPredict} disabled={busy || !problem} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-accent-blue to-accent-indigo text-[13px] font-semibold text-white shadow-active hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle className="animate-spin" size={16}/> : <Sparkles size={16}/>} {busy ? "Working…" : "Predict Best Algorithm"}</button>
        <button type="button" onClick={() => void runComparison(budget)} disabled={busy || status === "loading" || !problem || !form} className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-panel-raised text-[12px] font-semibold text-blue-100 hover:border-accent-blue disabled:cursor-not-allowed disabled:opacity-50"><Play size={14}/> Run Comparison</button>
      </div>

      <div className="rounded-lg border border-border-panel bg-panel-raised p-3">
        <div className="flex items-center justify-between gap-2"><h3 className="text-[13px] font-semibold text-blue-100">Recommendation</h3>{prediction && <span className="text-[10px] muted">{prediction.input.function} · {prediction.input.dimensions}D · budget {prediction.input.budget}</span>}</div>
        {prediction ? <><div className="mt-3 rounded-md border border-accent-blue/50 bg-accent-blue/10 p-3"><span className="block text-[10px] uppercase tracking-[.16em] text-cyan">Model prediction</span><strong className="mt-1 block text-[18px] text-white">{prediction.recommended_display_name || algorithmLabels[prediction.recommended_algorithm] || prediction.recommended_algorithm}</strong><span className="mt-1 block text-[11px] muted">{prediction.model_version || "Persisted model version unavailable"}</span></div><div className="mt-3 space-y-2">{Object.entries(prediction.model_scores).map(([algorithm, score]) => <div key={algorithm}><div className="flex justify-between text-[11px]"><span>{algorithmLabels[algorithm] || algorithm}</span><span className="text-blue-100">{(score * 100).toFixed(1)}% leaf frequency</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#10233c]"><div className="h-full rounded-full bg-accent-blue" style={{ width: `${Math.max(0, Math.min(100, score * 100))}%` }}/></div></div>)}</div>{predictionOutcome && <p className={`mt-3 rounded-md border px-3 py-2 text-[12px] ${predictionOutcome.startsWith("Prediction matched") ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-amber-400/40 bg-amber-400/10 text-amber-200"}`}>{predictionOutcome}</p>}</> : <div className="flex min-h-[156px] items-center justify-center text-center text-[12px] muted">Run a prediction to see the actual fitted tree&apos;s recommendation.</div>}
      </div>

      <div className="rounded-lg border border-border-panel bg-panel-raised p-3">
        <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setShowPath((value) => !value)}><span className="flex items-center gap-2 text-[13px] font-semibold text-blue-100"><GitBranch size={16} className="text-cyan"/>Why this algorithm?</span><span className="text-[11px] muted">{showPath ? "Hide" : "Show"}</span></button>
        {showPath && prediction?.decision_path?.available ? <div className="mt-3 space-y-2">{prediction.decision_path.conditions.map((condition, index) => <div key={`${condition.condition}-${index}`} className="rounded-md border border-border-subtle bg-input-bg px-2.5 py-2 text-[11px]"><span className="block text-[10px] uppercase tracking-wider muted">Tree split {index + 1}</span><span className="text-blue-100">{condition.condition}</span><span className="mt-0.5 block muted">Observed {condition.observed_value.toFixed(3)}</span></div>)}<div className="rounded-md border border-emerald-400/30 bg-emerald-400/5 px-2.5 py-2 text-[11px]"><span className="block text-[10px] uppercase tracking-wider muted">Reached leaf {prediction.decision_path.leaf_node}</span><span className="text-emerald-100">{prediction.decision_path.leaf_sample_count} grouped training configuration(s)</span><span className="mt-1 block muted">Class distribution is from this fitted tree leaf; it is not a calibrated success probability.</span></div></div> : <p className="mt-3 text-[12px] leading-5 muted">No tree decision path is available until a trained model returns a prediction.</p>}
      </div>
    </div>

    {(predictionError || (modelStatus?.limitations?.length ?? 0) > 0) && <div className="mt-3 rounded-md border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-[11px] leading-5 text-amber-100">{predictionError || modelStatus?.limitations.join(" ")}</div>}
    <details className="mt-3 rounded-md border border-border-panel bg-input-bg p-3"><summary className="flex cursor-pointer items-center justify-between text-[12px] font-semibold text-blue-100"><span>Model Performance</span><span className="font-normal muted">held-out evaluation only</span></summary><div className="mt-3 grid gap-3 sm:grid-cols-4">{performanceMetrics.map(({ label, value }) => <div key={label} className="rounded-md border border-border-subtle bg-panel-raised p-2"><span className="block text-[10px] muted">{label}</span><strong className="mt-1 block text-[14px]">{typeof value === "number" ? label === "Training groups" ? value : `${(value * 100).toFixed(1)}%` : "Not measured"}</strong></div>)}</div><p className="mt-3 text-[11px] leading-5 muted">{evaluation?.limitations?.join(" ") || "Metrics are shown only when the held-out partition contains enough distinct winner classes."}</p>{modelStatus?.status !== "trained" && <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void trainModel(false)} disabled={busy} className="inline-flex items-center gap-2 rounded-md border border-border-strong px-3 py-2 text-[11px] text-blue-100 hover:border-accent-blue disabled:opacity-50"><RefreshCw size={13}/> Train existing history</button><button type="button" onClick={() => void trainModel(true)} disabled={busy} className="inline-flex items-center gap-2 rounded-md border border-amber-400/40 px-3 py-2 text-[11px] text-amber-100 hover:bg-amber-400/10 disabled:opacity-50"><RefreshCw size={13}/> Collect real runs &amp; train</button></div>}</details>
  </section>;
}

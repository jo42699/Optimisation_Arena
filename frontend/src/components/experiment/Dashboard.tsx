"use client";

import { AlertTriangle, LoaderCircle, Sparkles } from "lucide-react";
import { useExperiment } from "@/context/ExperimentContext";
import { ProblemCard, AlgorithmCard, ExperimentForm } from "@/components/experiment/Controls";
import { Sidebar } from "@/components/experiment/Sidebar";
import { AnimationControls } from "@/components/visualizations/AnimationControls";
import { PlotPanel } from "@/components/visualizations/PlotPanel";
import { ConvergencePanel } from "@/components/results/ConvergencePanel";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { InsightsPanel } from "@/components/insights/InsightsPanel";

export function Dashboard() {
  const { report, status, error, view, showPaths, showStarts, showOptima, frame, resetAnimation } = useExperiment();
  return <div className="space-y-4">
    {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/50 bg-rose-950/30 p-3 text-sm text-rose-200"><AlertTriangle className="mt-0.5 shrink-0" size={17}/><span>{error}</span></div>}
    {status === "loading" && <div className="flex items-center gap-2 rounded-lg border border-cyan/30 bg-cyan/5 p-3 text-sm text-cyan"><LoaderCircle className="animate-spin" size={17}/>Running a bounded numerical experiment. The complete report will appear when it returns.</div>}
    <div className="dashboard-layout">
      <div className="min-w-0 space-y-4"><ProblemCard/><AlgorithmCard/><ExperimentForm/></div>
      <div className="min-w-0 space-y-3">{report ? <><PlotPanel report={report} view={view} frame={frame} showPaths={showPaths} showStarts={showStarts} showOptima={showOptima} onReset={resetAnimation}/><div className="card overflow-hidden"><AnimationControls/></div><div className="hidden rounded-md border border-border-panel bg-input-bg p-3 text-xs muted lg:block">Experiment {report.experiment_id} · {report.results.length} algorithms · {report.config.total_runtime_ms.toFixed(0)} ms total runtime</div></> : <EmptyVisualisation/>}</div>
      <Sidebar/>
    </div>
    {report && <div className="analytics-grid"><ConvergencePanel/><ResultsPanel/><InsightsPanel/></div>}
  </div>;
}

function EmptyVisualisation() { return <section className="visualization-panel"><div className="flex items-center justify-between border-b border-border-panel px-4 py-3"><div><h2 className="text-[18px] font-bold">Search Landscape &amp; Algorithm Paths</h2><p className="text-[13px] muted">Run an experiment to load the measured surface</p></div><Sparkles className="text-electric" size={20}/></div><div className="empty-plot flex min-h-[520px] items-center justify-center p-8 text-center"><div><div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-electric/40 bg-electric/10 text-2xl text-cyan">∿</div><h3 className="text-lg font-semibold">Ready for a numerical experiment</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 muted">Select a function, choose algorithms and run the experiment. The real Plotly surface and recorded paths will appear here.</p></div></div></section>; }

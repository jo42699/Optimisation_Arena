"use client";
import dynamic from "next/dynamic";
import type { Data, Layout } from "plotly.js";
import { useExperiment } from "@/context/ExperimentContext";
import { ALGORITHM_COLORS } from "@/lib/adapters";
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
export function ConvergencePanel() {
  const { report } = useExperiment();
  if (!report) return <section className="card p-5"><h2 className="font-semibold">Convergence comparison</h2><p className="mt-4 text-sm muted">Actual best-so-far histories will appear here.</p></section>;
  const data: Data[] = report.convergence.series.map((series) => ({ type: "scatter", mode: "lines+markers", name: series.display_name, x: series.function_evaluations, y: series.best_so_far, line: { color: ALGORITHM_COLORS[series.algorithm] || "#a6bde4", width: 2 }, marker: { size: 4 }, hovertemplate: `${series.display_name}<br>evaluations=%{x}<br>best=%{y:.5g}<extra></extra>` } as unknown as Data));
  const hasNonPositive = report.convergence.series.some((series) => series.best_so_far.some((value) => value <= 0));
  const layout = { height: 330, paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)", font: { color: "#c6d8f3" }, margin: { l: 55, r: 15, t: 15, b: 45 }, xaxis: { title: { text: "Function evaluations" }, gridcolor: "#17385e" }, yaxis: { title: { text: "Best objective value" }, gridcolor: "#17385e", type: hasNonPositive ? "linear" : "log" }, legend: { bgcolor: "rgba(5,19,37,.8)" } } as unknown as Partial<Layout>;
  return <section className="card overflow-hidden"><div className="border-b border-line px-4 py-3"><h2 className="font-semibold">Convergence comparison</h2><p className="mt-1 text-xs muted">Best-so-far values plotted against actual function evaluations.</p></div><Plot data={data} layout={layout} config={{ responsive: true, displaylogo: false }} style={{ width: "100%" }} useResizeHandler/></section>;
}

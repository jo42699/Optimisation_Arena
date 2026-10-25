"use client";

import dynamic from "next/dynamic";
import type { Config, Data, Layout } from "plotly.js";
import { Download, Maximize2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ALGORITHM_COLORS, alignedTrajectory, interpolatedPoint, interpolateNumber, pathThroughFrame } from "@/lib/adapters";
import type { Report, ViewType } from "@/types/experiment";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
const config: Partial<Config> = { responsive: true, displaylogo: false };
const layoutBase: Partial<Layout> = { autosize: true, paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)", font: { color: "#c6d8f3", family: "Arial" }, margin: { l: 55, r: 15, t: 10, b: 45 }, legend: { bgcolor: "rgba(5,19,37,.82)", bordercolor: "#17385e", borderwidth: 1 } };

function algorithmName(report: Report, algorithm: string): string { return report.results.find((result) => result.algorithm === algorithm)?.display_name || algorithm; }

function path2d(report: Report, frame: number, showPaths: boolean, showStarts: boolean, showOptima: boolean): Data[] {
  const traces: Data[] = [];
  for (const [algorithm, trajectory] of Object.entries(report.animation.algorithms)) {
    if (!alignedTrajectory(trajectory)) continue;
    const color = ALGORITHM_COLORS[algorithm] || "#b6c7e4";
    const current = interpolatedPoint(trajectory.path, frame);
    if (showPaths) {
      const trail = pathThroughFrame(trajectory.path, frame);
      traces.push({ type: "scatter", mode: "lines", name: algorithmName(report, algorithm), x: trail.map((point) => point[0]), y: trail.map((point) => point[1]), line: { color, width: 3 } } as unknown as Data);
      traces.push({ type: "scatter", mode: "markers", name: `${algorithmName(report, algorithm)} current`, x: [current[0]], y: [current[1]], marker: { color, size: 9, line: { color: "#ffffff", width: 1 } }, showlegend: false } as unknown as Data);
    }
    if (showStarts && trajectory.path.length) traces.push({ type: "scatter", mode: "markers", name: "Start", x: [trajectory.path[0][0]], y: [trajectory.path[0][1]], marker: { color, size: 8, symbol: "circle-open" }, showlegend: false } as unknown as Data);
  }
  if (showOptima) traces.push({ type: "scatter", mode: "markers", name: "Known global minima", x: report.landscape.known_optima.map((minimum) => minimum.position[0]), y: report.landscape.known_optima.map((minimum) => minimum.position[1]), marker: { color: "#ff4667", size: 10, symbol: "star" } } as unknown as Data);
  return traces;
}

function path3d(report: Report, frame: number, showPaths: boolean, showStarts: boolean): Data[] {
  const traces: Data[] = [];
  for (const [algorithm, trajectory] of Object.entries(report.animation.algorithms)) {
    if (!alignedTrajectory(trajectory)) continue;
    const color = ALGORITHM_COLORS[algorithm] || "#b6c7e4";
    const displayName = algorithmName(report, algorithm);
    const current = interpolatedPoint(trajectory.path, frame);
    const currentScore = interpolateNumber(trajectory.scores, frame);
    if (showPaths) {
      const trail = pathThroughFrame(trajectory.path, frame);
      const completedCount = Math.min(trajectory.scores.length, Math.floor(frame) + 1);
      const trailScores = trajectory.scores.slice(0, completedCount);
      if (trail.length > completedCount) trailScores.push(currentScore);
      traces.push({ type: "scatter3d", mode: "lines", name: displayName, x: trail.map((point) => point[0]), y: trail.map((point) => point[1]), z: trailScores, line: { color, width: 5 } } as unknown as Data);
      traces.push({ type: "scatter3d", mode: "markers", name: `${displayName} current`, x: [current[0]], y: [current[1]], z: [currentScore], marker: { color, size: 6, line: { color: "#ffffff", width: 1 } }, showlegend: false } as unknown as Data);
    }
    if (showStarts && trajectory.path.length) traces.push({ type: "scatter3d", mode: "markers", name: "Start", x: [trajectory.path[0][0]], y: [trajectory.path[0][1]], z: [trajectory.scores[0]], marker: { color, size: 5, symbol: "circle-open" }, showlegend: false } as unknown as Data);
  }
  return traces;
}

export function PlotPanel({ report, view, frame, showPaths, showStarts, showOptima, onReset }: { report: Report; view: ViewType; frame: number; showPaths: boolean; showStarts: boolean; showOptima: boolean; onReset: () => void }) {
  const [activeView, setActiveView] = useState<ViewType>(view);
  useEffect(() => setActiveView(view), [view]);
  const { surface } = report.landscape;
  const traces = useMemo(() => {
    if (activeView === "surface") return [{ type: "surface", x: surface.x, y: surface.y, z: surface.z, colorscale: "Viridis", colorbar: { title: { text: "f(x,y)" } } } as unknown as Data, ...path3d(report, frame, showPaths, showStarts), ...(showOptima ? [{ type: "scatter3d", mode: "markers", name: "Known global minima", x: report.landscape.known_optima.map((minimum) => minimum.position[0]), y: report.landscape.known_optima.map((minimum) => minimum.position[1]), z: report.landscape.known_optima.map((minimum) => minimum.objective_value), marker: { color: "#ff4667", size: 7, symbol: "diamond" } } as unknown as Data] : [])];
    if (activeView === "contour") return [{ type: "contour", x: surface.x, y: surface.y, z: surface.z, colorscale: "Viridis", contours: { coloring: "heatmap" } } as unknown as Data, ...path2d(report, frame, showPaths, showStarts, showOptima)];
    if (activeView === "heatmap") return [{ type: "heatmap", x: surface.x, y: surface.y, z: surface.z, colorscale: "Viridis" } as unknown as Data, ...path2d(report, frame, showPaths, showStarts, showOptima)];
    return path2d(report, frame, showPaths, showStarts, showOptima);
  }, [activeView, surface, report, frame, showPaths, showStarts, showOptima]);
  const maxFrame = Math.max(0, ...Object.values(report.animation.algorithms).map((trajectory) => trajectory.path.length - 1));
  const layout = { ...layoutBase, height: 460, scene: { xaxis: { title: { text: "x" }, gridcolor: "#1d4067" }, yaxis: { title: { text: "y" }, gridcolor: "#1d4067" }, zaxis: { title: { text: "f(x,y)" }, gridcolor: "#1d4067" }, bgcolor: "rgba(0,0,0,0)" }, xaxis: { title: { text: "x" }, gridcolor: "#1d4067" }, yaxis: { title: { text: "y" }, gridcolor: "#1d4067" } } as unknown as Partial<Layout>;
  const download = () => { const plot = document.querySelector(".js-plotly-plot") as (HTMLElement & { downloadImage?: (format: string) => void }) | null; plot?.downloadImage?.("png"); };
  return <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 pt-2"><div className="flex overflow-x-auto" role="tablist" aria-label="Visualisation type">{([["surface", "3D Surface"], ["contour", "Contour Plot (2D)"], ["paths", "Algorithm Paths Only"], ["heatmap", "Heatmap"]] as [ViewType, string][]).map(([id, label]) => <button key={id} role="tab" aria-selected={activeView === id} onClick={() => setActiveView(id)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm ${activeView === id ? "border-electric text-white" : "border-transparent text-blue-200 hover:text-white"}`}>{label}</button>)}</div><button aria-label="Expand chart" className="rounded border border-line p-2 text-blue-200"><Maximize2 size={16}/></button></div><div className="flex items-center justify-between px-4 pt-4"><div><h2 className="font-semibold">Search landscape &amp; algorithm paths</h2><p className="text-sm muted">{report.problem.name} · {activeView === "paths" ? "XY trajectory projection" : "Recorded backend grid"}</p></div><span className="rounded-full border border-line px-2 py-1 text-[11px] text-blue-200">Frame {Math.min(Math.floor(frame) + 1, maxFrame + 1)} / {maxFrame + 1}</span></div><div className="min-h-[460px] px-1"><Plot data={traces} layout={layout} config={config} style={{ width: "100%", height: "460px" }} useResizeHandler /></div><div className="flex flex-wrap gap-2 border-t border-line px-4 py-3"><button onClick={onReset} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-blue-100"><RotateCcw size={14}/>Reset view</button><button onClick={download} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-blue-100"><Download size={14}/>Download plot</button></div></section>;
}

"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useExperiment } from "@/context/ExperimentContext";
import { interpolateNumber } from "@/lib/adapters";
import { formatNumber } from "@/lib/formatters";

export function AnimationControls() {
  const { report, frame, playing, speed, dispatch, resetAnimation } = useExperiment();
  const maxFrame = useMemo(() => report ? Math.max(0, ...Object.values(report.animation.algorithms).map((trajectory) => trajectory.path.length - 1)) : 0, [report]);
  const frameRef = useRef(frame);

  useEffect(() => { frameRef.current = frame; }, [frame]);

  useEffect(() => {
    if (!playing || maxFrame < 1) return;
    let animationFrame = 0;
    let previousTime = 0;
    const tick = (time: number) => {
      if (!previousTime) previousTime = time;
      const elapsed = Math.min(100, time - previousTime);
      previousTime = time;
      const next = Math.min(maxFrame, frameRef.current + (elapsed / 1000) * 2 * speed);
      frameRef.current = next;
      dispatch({ type: "advance_frame", frame: next });
      if (next >= maxFrame) {
        dispatch({ type: "set_playing", playing: false });
        return;
      }
      animationFrame = window.requestAnimationFrame(tick);
    };
    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [dispatch, maxFrame, playing, speed]);

  if (!report) return null;
  const values = report.results.map((result) => {
    const trajectory = report.animation.algorithms[result.algorithm];
    return {
      name: result.display_name,
      score: trajectory ? interpolateNumber(trajectory.scores, frame) : undefined,
      best: trajectory ? interpolateNumber(trajectory.best_so_far, frame) : undefined,
    };
  });
  const togglePlayback = () => {
    if (playing) { dispatch({ type: "set_playing", playing: false }); return; }
    if (frame >= maxFrame) { frameRef.current = 0; dispatch({ type: "set_frame", frame: 0 }); }
    dispatch({ type: "set_playing", playing: true });
  };
  return <div className="border-t border-line px-4 py-3"><div className="flex flex-wrap items-center gap-3"><button aria-label={playing ? "Pause animation" : "Play animation"} disabled={maxFrame < 1} onClick={togglePlayback} className="grid h-9 w-9 place-items-center rounded-full bg-electric disabled:cursor-not-allowed disabled:opacity-50">{playing ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}</button><button aria-label="Reset animation" onClick={() => { frameRef.current = 0; resetAnimation(); }} className="rounded border border-line p-2 text-blue-200 hover:text-white"><RotateCcw size={15}/></button><input aria-label="Animation frame" className="min-w-[150px] flex-1 accent-electric" type="range" min={0} max={maxFrame} step="0.01" value={Math.min(frame, maxFrame)} onChange={(e) => { const next = Number(e.target.value); frameRef.current = next; dispatch({ type: "set_frame", frame: next }); }} /><span className="text-xs text-blue-100">Frame {Math.min(Math.floor(frame) + 1, maxFrame + 1)} / {maxFrame + 1}</span><select aria-label="Playback speed" className="input w-auto py-1 text-xs" value={speed} onChange={(e) => dispatch({ type: "set_speed", speed: Number(e.target.value) })}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></div><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs muted">{values.map((value) => <span key={value.name}>{value.name}: current <strong className="text-blue-100">{formatNumber(value.score)}</strong> · best <strong className="text-cyan">{formatNumber(value.best)}</strong></span>)}</div></div>;
}

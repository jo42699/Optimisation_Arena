"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from "react";
import { api, type ExperimentRequest } from "@/lib/api";
import { defaultsForAlgorithms } from "@/lib/adapters";
import type { AIInsights, AlgorithmMetadata, FormState, FunctionMetadata, Report, RequestStatus, ViewType } from "@/types/experiment";

interface State {
  functions: FunctionMetadata[]; algorithms: AlgorithmMetadata[]; selectedFunction: string; selectedAlgorithms: string[];
  form: FormState | null; report: Report | null; status: RequestStatus; metadataStatus: RequestStatus; error: string | null;
  view: ViewType; showPaths: boolean; showStarts: boolean; showOptima: boolean; frame: number; playing: boolean; speed: number; insightsStatus: RequestStatus;
}
type Action =
  | { type: "metadata_success"; functions: FunctionMetadata[]; algorithms: AlgorithmMetadata[] }
  | { type: "metadata_error"; error: string }
  | { type: "select_function"; id: string; form: FormState }
  | { type: "toggle_algorithm"; id: string; form: FormState }
  | { type: "update_form"; form: FormState }
  | { type: "experiment_start" }
  | { type: "experiment_success"; report: Report }
  | { type: "experiment_error"; error: string }
  | { type: "set_view"; view: ViewType } | { type: "set_flag"; flag: "showPaths" | "showStarts" | "showOptima"; value: boolean }
  | { type: "set_frame"; frame: number } | { type: "set_playing"; playing: boolean } | { type: "set_speed"; speed: number }
  | { type: "insights_start" } | { type: "insights_success"; insights: AIInsights } | { type: "insights_error"; error: string };

const initial: State = { functions: [], algorithms: [], selectedFunction: "", selectedAlgorithms: [], form: null, report: null, status: "idle", metadataStatus: "loading", error: null, view: "surface", showPaths: true, showStarts: true, showOptima: true, frame: 0, playing: false, speed: 1, insightsStatus: "idle" };
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "metadata_success": return { ...state, functions: action.functions, algorithms: action.algorithms, selectedFunction: action.functions[0]?.identifier || "", selectedAlgorithms: action.algorithms.map((a) => a.identifier), form: action.functions[0] ? makeForm(action.functions[0], action.algorithms, action.algorithms.map((a) => a.identifier)) : null, metadataStatus: "success" };
    case "metadata_error": return { ...state, metadataStatus: "error", error: action.error };
    case "select_function": return { ...state, selectedFunction: action.id, form: action.form };
    case "toggle_algorithm": return { ...state, selectedAlgorithms: action.form ? Object.keys(action.form.parameters) : state.selectedAlgorithms, form: action.form };
    case "update_form": return { ...state, form: action.form };
    case "experiment_start": return { ...state, status: "loading", error: null, playing: false };
    case "experiment_success": return { ...state, report: action.report, status: "success", error: null, frame: 0, playing: false, insightsStatus: action.report.ai_insights ? "success" : "idle" };
    case "experiment_error": return { ...state, status: "error", error: action.error, playing: false };
    case "set_view": return { ...state, view: action.view };
    case "set_flag": return { ...state, [action.flag]: action.value };
    case "set_frame": return { ...state, frame: action.frame, playing: false };
    case "set_playing": return { ...state, playing: action.playing };
    case "set_speed": return { ...state, speed: action.speed };
    case "insights_start": return { ...state, insightsStatus: "loading", error: null };
    case "insights_success": return { ...state, report: state.report ? { ...state.report, ai_insights: action.insights } : state.report, insightsStatus: "success" };
    case "insights_error": return { ...state, insightsStatus: "error", error: action.error };
  }
}
function makeForm(problem: FunctionMetadata, algorithms: AlgorithmMetadata[], selected: string[]): FormState { return { iterations: 500, seed: 42, startingPoint: null, bounds: { x: [...problem.bounds.x], y: [...problem.bounds.y] }, parameters: defaultsForAlgorithms(algorithms, selected), resolution: 80, rankingMetric: "best_score", repeatedTrials: 1 }; }

interface ContextValue extends State { dispatch: Dispatch<Action>; selectFunction: (id: string) => void; toggleAlgorithm: (id: string) => void; updateForm: (patch: Partial<FormState>) => void; submit: () => Promise<void>; requestInsights: () => Promise<void>; resetAnimation: () => void; }
const Context = createContext<ContextValue | null>(null);
export function ExperimentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  useEffect(() => { let active = true; Promise.all([api.functions(), api.algorithms()]).then(([functions, algorithms]) => { if (active) dispatch({ type: "metadata_success", functions: functions.functions, algorithms: algorithms.algorithms }); }).catch((error: unknown) => { if (active) dispatch({ type: "metadata_error", error: error instanceof Error ? error.message : "Could not load backend metadata." }); }); return () => { active = false; }; }, []);
  const selectFunction = useCallback((id: string) => { const problem = state.functions.find((item) => item.identifier === id); if (problem) dispatch({ type: "select_function", id, form: makeForm(problem, state.algorithms, state.selectedAlgorithms) }); }, [state.functions, state.algorithms, state.selectedAlgorithms]);
  const toggleAlgorithm = useCallback((id: string) => { const next = state.selectedAlgorithms.includes(id) ? state.selectedAlgorithms.filter((item) => item !== id) : [...state.selectedAlgorithms, id]; if (!next.length || !state.form) return; dispatch({ type: "toggle_algorithm", id, form: { ...state.form, parameters: defaultsForAlgorithms(state.algorithms, next) } }); }, [state.selectedAlgorithms, state.form, state.algorithms]);
  const updateForm = useCallback((patch: Partial<FormState>) => { if (state.form) dispatch({ type: "update_form", form: { ...state.form, ...patch } }); }, [state.form]);
  const submit = useCallback(async () => { if (!state.form || !state.selectedFunction || !state.selectedAlgorithms.length) return; dispatch({ type: "experiment_start" }); const payload: ExperimentRequest = { function: state.selectedFunction, algorithms: state.selectedAlgorithms, iterations: state.form.iterations, seed: state.form.seed, ...(state.form.startingPoint ? { starting_point: state.form.startingPoint } : {}), bounds: state.form.bounds, parameters: state.form.parameters, landscape: { resolution: state.form.resolution }, comparison: { ranking_metric: state.form.rankingMetric }, repeated_trials: state.form.repeatedTrials, include_population_snapshots: false }; try { dispatch({ type: "experiment_success", report: await api.experiment(payload) }); } catch (error: unknown) { dispatch({ type: "experiment_error", error: error instanceof Error ? error.message : "Experiment request failed." }); } }, [state.form, state.selectedFunction, state.selectedAlgorithms]);
  const requestInsights = useCallback(async () => { if (!state.report) return; dispatch({ type: "insights_start" }); try { dispatch({ type: "insights_success", insights: await api.generateInsights(state.report.experiment_id) }); } catch (error: unknown) { dispatch({ type: "insights_error", error: error instanceof Error ? error.message : "Insights request failed." }); } }, [state.report]);
  const resetAnimation = useCallback(() => dispatch({ type: "set_frame", frame: 0 }), []);
  const value = useMemo(() => ({ ...state, dispatch, selectFunction, toggleAlgorithm, updateForm, submit, requestInsights, resetAnimation }), [state, selectFunction, toggleAlgorithm, updateForm, submit, requestInsights, resetAnimation]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useExperiment(): ContextValue { const value = useContext(Context); if (!value) throw new Error("useExperiment must be used inside ExperimentProvider"); return value; }

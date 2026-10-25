export type RequestStatus = "idle" | "loading" | "success" | "error";
export type ViewType = "surface" | "contour" | "paths" | "heatmap";
export type RankingMetric = "best_score" | "runtime" | "balanced";

export interface Bounds { x: [number, number]; y: [number, number] }
export interface GlobalMinimum { position: [number, number]; objective_value: number }
export interface FunctionMetadata {
  identifier: string; name: string; equation_latex: string; equation_plain: string;
  description: string; dimension: number; bounds: Bounds; global_minima: GlobalMinimum[];
  global_minimum_value: number; unique_global_minimum: boolean; interpretation: string;
}
export interface ParameterMetadata { default: number; min: number; max: number }
export interface AlgorithmMetadata {
  identifier: string; name: string; description: string;
  parameters: Record<string, ParameterMetadata>; required_inputs: string[];
}
export interface Surface { x: number[]; y: number[]; z: number[][]; resolution: number; x_label: string; y_label: string; z_label: string }
export interface Landscape { surface: Surface; known_optima: GlobalMinimum[] }
export interface Trajectory {
  path: [number, number][]; scores: number[]; best_so_far: number[];
  best_so_far_positions: [number, number][]; iterations: number[]; function_evaluations: number[];
}
export interface ResultRow {
  algorithm: string; display_name: string; status: string; execution_status: string;
  execution_completed: boolean; execution_succeeded: boolean; optimization_success: boolean;
  optimization_status: string; target_attained: boolean; stagnation_observed: boolean;
  best_position: [number, number] | null; best_score: number | null;
  best_so_far_position_history: [number, number][]; best_so_far_history: number[];
  current_candidate_history: [number, number][]; candidate_score_history: number[]; candidate_path: [number, number][];
  function_evaluations: number; iterations_completed: number; runtime_ms: number;
  effective_seed: number; parameters: Record<string, number>; termination_reason: string;
  diagnostics: Record<string, unknown>; error: string | null; distance_to_nearest_global_minimum: number | null;
  within_success_tolerance: boolean; success_rate: number | null; target_attainment_rate: number | null;
  median_score: number | null; score_spread: number | null; trial_results?: unknown[];
}
export interface ConvergenceSeries { algorithm: string; display_name: string; iterations: number[]; function_evaluations: number[]; best_so_far: number[] }
export interface Winner { algorithm: string; best_score: number; reason: string }
export interface Comparison { ranking_metric: RankingMetric; winner: Winner | null; fastest_algorithm: string | null; ranking: string[]; ranking_method: string; limitations: string[] }
export interface AIAlgorithmInsight { algorithm: string; observations: string[]; possible_explanations: string[]; confidence: string }
export interface AIRecommendation { title: string; reason: string; expected_benefit: string; suggested_parameters: Record<string, unknown> }
export interface AIInsights {
  status: "completed" | "disabled" | "unavailable" | "failed" | "not_generated";
  experiment_id?: string; headline?: string; overall_analysis?: string;
  algorithm_insights?: AIAlgorithmInsight[]; recommendations?: AIRecommendation[];
  follow_up_experiments?: string[]; limitations?: string[]; message?: string; metrics_reference?: Record<string, unknown>;
}
export interface Report {
  schema_version: string; experiment_id: string; status: string; execution_status?: string; created_at: string;
  config: { function: string; algorithms: string[]; iterations: number; seed: number; starting_point: [number, number] | null; bounds: Bounds; parameters: Record<string, Record<string, number>>; landscape_resolution: number; repeated_trials: number; include_population_snapshots: boolean; effective_seeds: Record<string, number>; total_runtime_ms: number };
  problem: FunctionMetadata; landscape: Landscape; results: ResultRow[]; animation: { algorithms: Record<string, Trajectory> };
  convergence: { series: ConvergenceSeries[]; note: string }; comparison: Comparison;
  diagnostics: Record<string, unknown>; overall_summary: Record<string, unknown>; ai_insights: AIInsights | null;
  metadata: Record<string, unknown>;
}
export interface FormState {
  iterations: number; seed: number; startingPoint: [number, number] | null; bounds: Bounds;
  parameters: Record<string, Record<string, number>>; resolution: number; rankingMetric: RankingMetric; repeatedTrials: number;
}

import type { AlgorithmMetadata, FunctionMetadata, Report, Trajectory } from "@/types/experiment";

export const ALGORITHM_COLORS: Record<string, string> = {
  gradient_descent: "#ff3d4d", simulated_annealing: "#f7c51e", genetic_algorithm: "#28df55",
};

export function isFiniteMatrix(matrix: number[][]): boolean { return matrix.every((row) => row.every(Number.isFinite)); }
export function isUsableReport(value: unknown): value is Report {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<Report>;
  const surface = report.landscape?.surface;
  return typeof report.experiment_id === "string" && Array.isArray(report.results) && Array.isArray(surface?.x) && Array.isArray(surface?.y) && Array.isArray(surface?.z) && surface.z.length === surface.y.length && surface.z.every((row) => Array.isArray(row) && row.length === surface.x?.length && row.every(Number.isFinite)) && report.results.every((result) => Array.isArray(result.best_so_far_history));
}
export function alignedTrajectory(trajectory: Trajectory): boolean {
  const lengths = [trajectory.path.length, trajectory.scores.length, trajectory.best_so_far.length, trajectory.best_so_far_positions.length, trajectory.iterations.length, trajectory.function_evaluations.length];
  return new Set(lengths).size === 1 && trajectory.path.every((point, index) => point.length === 2 && point.every(Number.isFinite) && Number.isFinite(trajectory.scores[index]) && Number.isFinite(trajectory.best_so_far[index]) && trajectory.best_so_far[index] <= (index ? trajectory.best_so_far[index - 1] + 1e-8 : Infinity));
}
export function interpolateNumber(values: number[], frame: number): number {
  if (!values.length) return 0;
  const lowerIndex = Math.max(0, Math.min(values.length - 1, Math.floor(frame)));
  const upperIndex = Math.min(values.length - 1, lowerIndex + 1);
  const fraction = Math.max(0, Math.min(1, frame - lowerIndex));
  return values[lowerIndex] + (values[upperIndex] - values[lowerIndex]) * fraction;
}
export function interpolatedPoint(path: [number, number][], frame: number): [number, number] {
  if (!path.length) return [0, 0];
  const lowerIndex = Math.max(0, Math.min(path.length - 1, Math.floor(frame)));
  const upperIndex = Math.min(path.length - 1, lowerIndex + 1);
  const fraction = Math.max(0, Math.min(1, frame - lowerIndex));
  return [
    path[lowerIndex][0] + (path[upperIndex][0] - path[lowerIndex][0]) * fraction,
    path[lowerIndex][1] + (path[upperIndex][1] - path[lowerIndex][1]) * fraction,
  ];
}
export function pathThroughFrame(path: [number, number][], frame: number): [number, number][] {
  if (!path.length) return [];
  const lowerIndex = Math.max(0, Math.min(path.length - 1, Math.floor(frame)));
  const trail = path.slice(0, lowerIndex + 1);
  if (lowerIndex < path.length - 1 && frame > lowerIndex) trail.push(interpolatedPoint(path, frame));
  return trail;
}
export function defaultsForAlgorithms(algorithms: AlgorithmMetadata[], selected: string[]): Record<string, Record<string, number>> {
  return Object.fromEntries(algorithms.filter((algorithm) => selected.includes(algorithm.identifier)).map((algorithm) => [algorithm.identifier, Object.fromEntries(Object.entries(algorithm.parameters).map(([key, definition]) => [key, definition.default]))]));
}
export function selectedFunction(functions: FunctionMetadata[], id: string): FunctionMetadata | undefined { return functions.find((item) => item.identifier === id); }

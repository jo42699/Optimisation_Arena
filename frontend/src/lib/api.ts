import type { AIInsights, AlgorithmMetadata, FunctionMetadata, Report } from "@/types/experiment";

export interface ExperimentRequest { function: string; algorithms: string[]; iterations: number; seed: number; starting_point?: [number, number]; bounds: { x: [number, number]; y: [number, number] }; parameters: Record<string, Record<string, number>>; landscape: { resolution: number }; comparison: { ranking_metric: string }; repeated_trials: number; include_population_snapshots: boolean }
const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) }, signal: AbortSignal.timeout(120000) });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) { const detail = body && typeof body === "object" && "detail" in body ? (body as { detail: unknown }).detail : body; throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail || `Request failed with HTTP ${response.status}`)); }
  return body as T;
}
export const api = {
  functions: () => request<{ functions: FunctionMetadata[] }>("/api/functions"),
  algorithms: () => request<{ algorithms: AlgorithmMetadata[] }>("/api/algorithms"),
  health: () => request<{ status: string; version: string; ai: { enabled: boolean; configured: boolean; model: string | null } }>("/api/health"),
  experiment: (payload: ExperimentRequest) => request<Report>("/api/experiments", { method: "POST", body: JSON.stringify(payload) }),
  report: (id: string) => request<Report>(`/api/experiments/${encodeURIComponent(id)}`),
  insights: (id: string) => request<AIInsights>(`/api/experiments/${encodeURIComponent(id)}/insights`),
  generateInsights: (id: string) => request<AIInsights>(`/api/experiments/${encodeURIComponent(id)}/insights`, { method: "POST", body: JSON.stringify({ force_refresh: true }) }),
};

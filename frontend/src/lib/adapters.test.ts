import { describe, expect, it } from "vitest";
import { alignedTrajectory, isFiniteMatrix, isUsableReport } from "@/lib/adapters";
import type { Report, Trajectory } from "@/types/experiment";

const trajectory: Trajectory = { path: [[1, 2], [0.5, 1]], scores: [5, 1.25], best_so_far: [5, 1.25], best_so_far_positions: [[1, 2], [0.5, 1]], iterations: [0, 1], function_evaluations: [1, 2] };
describe("report adapters", () => {
  it("preserves trajectory alignment and monotonic best-so-far values", () => { expect(alignedTrajectory(trajectory)).toBe(true); expect(alignedTrajectory({ ...trajectory, scores: [5] })).toBe(false); expect(alignedTrajectory({ ...trajectory, best_so_far: [5, 6] })).toBe(false); });
  it("validates surface dimensions and finite values", () => { expect(isFiniteMatrix([[1, 2], [3, 4]])).toBe(true); expect(isFiniteMatrix([[1, Number.NaN]])).toBe(false); });
  it("rejects malformed report surfaces", () => { const report = { experiment_id: "id", results: [{ best_so_far_history: [] }], landscape: { surface: { x: [0, 1], y: [0, 1], z: [[0, 1], [1, 0]] } } } as unknown as Report; expect(isUsableReport(report)).toBe(true); expect(isUsableReport({ ...report, landscape: { surface: { ...report.landscape.surface, z: [[0]] } } })).toBe(false); });
});

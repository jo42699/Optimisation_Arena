from datetime import datetime, timezone
from typing import Any

import numpy as np

from app import __version__
from app.services.diagnostics import diagnose_result, trial_statistics
from app.services.metrics import fastest_algorithm, select_winner


def _trajectory_dict(result) -> dict[str, Any]:
    points = result.trajectory
    return {"path": [point.position for point in points], "scores": [point.score for point in points], "best_so_far": [point.best_score for point in points], "best_so_far_positions": [point.best_position for point in points], "iterations": [point.iteration for point in points], "function_evaluations": [point.function_evaluations for point in points]}


def build_report(*, experiment_id: str, created_at: str, request, problem, bounds: dict[str, tuple[float, float]], landscape: dict[str, Any], results: list, trial_results: dict[str, list], total_runtime_ms: float) -> dict[str, Any]:
    result_rows: list[dict[str, Any]] = []
    animation: dict[str, Any] = {"algorithms": {}}
    warnings: list[str] = []
    for result in results:
        trajectory = _trajectory_dict(result)
        trial_rows = []
        for trial in trial_results.get(result.algorithm, [result]):
            trial_trajectory = _trajectory_dict(trial)
            trial_rows.append({"status": trial.status, "best_score": trial.best_score, "runtime_ms": trial.runtime_ms, "function_evaluations": trial.function_evaluations, "success": trial.status != "failed" and trial.best_score is not None})
        successes = [bool(row["success"]) for row in trial_rows]
        scores = [row["best_score"] for row in trial_rows if row["best_score"] is not None and np.isfinite(row["best_score"])]
        row = {"algorithm": result.algorithm, "display_name": result.display_name, "status": result.status, "best_position": result.best_position, "best_score": result.best_score, "best_so_far_position_history": trajectory["best_so_far_positions"], "best_so_far_history": trajectory["best_so_far"], "current_candidate_history": trajectory["path"], "candidate_score_history": trajectory["scores"], "candidate_path": trajectory["path"], "function_evaluations": result.function_evaluations, "iterations_completed": result.iterations_completed, "runtime_ms": result.runtime_ms, "effective_seed": result.effective_seed, "parameters": result.parameters, "termination_reason": result.termination_reason, "diagnostics": {**result.diagnostics, **diagnose_result({**trajectory, "best_position": result.best_position, "best_score": result.best_score, "termination_reason": result.termination_reason}, list(problem.global_minima))}, "error": result.error, "distance_to_nearest_global_minimum": diagnose_result({**trajectory, "best_position": result.best_position, "best_score": result.best_score}, list(problem.global_minima))["nearest_global_minimum_distance"], "within_success_tolerance": diagnose_result({**trajectory, "best_position": result.best_position, "best_score": result.best_score}, list(problem.global_minima))["reached_known_optimum"], "success_rate": trial_statistics(scores, successes)["success_rate"], "median_score": trial_statistics(scores, successes)["median_score"], "score_spread": trial_statistics(scores, successes)["score_spread"], "trial_results": trial_rows}
        result_rows.append(row)
        animation["algorithms"][result.algorithm] = trajectory
        if result.status == "failed":
            warnings.append(f"{result.display_name} failed: {result.error or result.termination_reason}")
        elif row["diagnostics"]["stagnation_observed"]:
            warnings.append(f"{result.display_name} showed a measured stagnation interval; the cause is not established by this experiment.")
    comparison_selection = select_winner(result_rows, request.comparison.ranking_metric)
    winner = comparison_selection["winner"]
    fastest = fastest_algorithm(result_rows)
    completed_count = sum(row["status"] != "failed" for row in result_rows)
    total_evaluations = sum(row["function_evaluations"] for row in result_rows)
    global_reached = any(row["within_success_tolerance"] for row in result_rows)
    comparison = {"ranking_metric": request.comparison.ranking_metric, "winner": winner, "fastest_algorithm": fastest, "ranking": comparison_selection["ranking"], "ranking_method": comparison_selection["explanation"], "limitations": ["Runtime ranking is machine-dependent.", "A single trial does not establish statistical reliability."] if request.repeated_trials == 1 else ["Results remain dependent on the selected seed and finite budgets."]}
    report = {"schema_version": "1.0", "experiment_id": experiment_id, "status": "completed" if completed_count else "failed", "created_at": created_at, "config": {"function": problem.identifier, "algorithms": request.algorithms, "iterations": request.iterations, "seed": request.seed, "starting_point": list(request.starting_point) if request.starting_point is not None else None, "bounds": {"x": list(bounds["x"]), "y": list(bounds["y"])}, "parameters": {key: value for key, value in request.parameters.items()}, "landscape_resolution": request.landscape.resolution, "repeated_trials": request.repeated_trials, "include_population_snapshots": request.include_population_snapshots, "effective_seeds": {row["algorithm"]: row["effective_seed"] for row in result_rows}, "total_runtime_ms": total_runtime_ms}, "problem": problem.metadata({"x": list(bounds["x"]), "y": list(bounds["y"])}), "landscape": landscape, "results": result_rows, "animation": animation, "convergence": {"series": [{"algorithm": row["algorithm"], "display_name": row["display_name"], "iterations": animation["algorithms"][row["algorithm"]]["iterations"], "function_evaluations": animation["algorithms"][row["algorithm"]]["function_evaluations"], "best_so_far": animation["algorithms"][row["algorithm"]]["best_so_far"]} for row in result_rows], "note": "Iteration/generation indices are algorithm-specific; function evaluations are the comparable computational axis."}, "comparison": comparison, "diagnostics": {"algorithm_count_requested": len(request.algorithms), "algorithm_count_completed": completed_count, "algorithm_count_failed": len(request.algorithms) - completed_count, "total_function_evaluations": total_evaluations, "numerical_validation": "passed" if all(row["best_score"] is None or np.isfinite(row["best_score"]) for row in result_rows) else "failed", "warnings": warnings, "report_generation_duration_ms": 0.0}, "overall_summary": {"lowest_valid_objective_algorithm": min((row["algorithm"] for row in result_rows if row["best_score"] is not None), key=lambda name: next(row["best_score"] for row in result_rows if row["algorithm"] == name), default=None), "fastest_successfully_completed_algorithm": fastest, "selected_algorithm": winner["algorithm"] if winner else None, "global_optimum_reached_within_tolerance": global_reached, "key_differences": "Solution quality and runtime are measured separately; the ranking metric determines the recommendation.", "stalled_or_failed": any(row["status"] != "completed" for row in result_rows), "limitations": comparison["limitations"]}, "ai_insights": None, "metadata": {"backend_version": __version__, "created_at_utc": datetime.now(timezone.utc).isoformat(), "data_omitted": ["population snapshots are omitted unless explicitly requested"]}}
    return report

from typing import Any

import numpy as np


def diagnose_result(result: dict[str, Any], known_minima: list[tuple[float, float]], tolerance: float = 1e-2) -> dict[str, Any]:
    scores = [float(value) for value in result.get("scores", []) if np.isfinite(value)]
    best_scores = [float(value) for value in result.get("best_so_far", []) if np.isfinite(value)]
    initial = scores[0] if scores else None
    best = result.get("best_score")
    improvement = (initial - best) if initial is not None and best is not None else None
    relative = None if initial in (None, 0) or best is None else improvement / abs(initial)
    last_best = best_scores[-1] if best_scores else None
    if len(best_scores) > 1:
        meaningful = max(abs(last_best or 0) * 1e-10, 1e-12)
        last_improvement = max((i for i in range(1, len(best_scores)) if best_scores[i] < best_scores[i - 1] - meaningful), default=0)
        stagnation = len(best_scores) - 1 - last_improvement
    else:
        stagnation = 0
    position = np.asarray(result.get("best_position", [np.nan, np.nan]), dtype=float)
    distances = [float(np.linalg.norm(position - np.asarray(point, dtype=float))) for point in known_minima]
    nearest = min(distances) if distances else None
    return {
        "initial_score": initial,
        "improvement": improvement,
        "relative_improvement": relative,
        "iterations_since_meaningful_improvement": stagnation,
        "stagnation_observed": stagnation >= max(5, len(best_scores) // 10),
        "non_finite_observed": not (len(scores) == len(result.get("scores", []))),
        "stopping_criterion_met": str(result.get("termination_reason", "")).startswith(("gradient norm", "temperature")),
        "nearest_global_minimum_distance": nearest,
        "reached_known_optimum": nearest is not None and nearest <= tolerance and best is not None and best <= 1e-4,
        "observable_note": "A flat best-so-far history indicates no measured improvement; a local-minimum explanation remains a hypothesis." if stagnation else "Measured best-so-far history continued to improve or ended before a stagnation window.",
    }


def trial_statistics(scores: list[float], success_values: list[bool]) -> dict[str, Any]:
    if not scores:
        return {"median_score": None, "score_spread": None, "success_rate": None}
    values = np.asarray(scores, dtype=float)
    return {"median_score": float(np.median(values)), "score_spread": float(np.std(values)), "success_rate": (float(np.mean(success_values)) if len(scores) > 1 else None)}

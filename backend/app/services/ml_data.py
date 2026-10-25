"""Durable adapters for turning measured experiment reports into ML rows.

The experiment API remains in-memory for fast report retrieval, while this
bounded JSONL file gives the selector a reproducible history across restarts.
Only reports produced by the experiment runner are appended; no labels or
metrics are invented here.
"""

from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path
from typing import Any

FEATURE_COLUMNS = ("function", "dimensions", "budget")
ALGORITHM_NAMES = {
    "gradient_descent": "Gradient Descent",
    "simulated_annealing": "Simulated Annealing",
    "genetic_algorithm": "Genetic Algorithm",
}


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[2]


def configured_path(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else _backend_root() / path


def _finite(value: Any) -> bool:
    try:
        return math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


def append_report(report: dict[str, Any], settings: Any) -> None:
    """Append one strict report, de-duplicating by experiment id."""

    try:
        path = configured_path(settings.ml_history_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        existing_ids: set[str] = set()
        if path.exists():
            with path.open("r", encoding="utf-8") as handle:
                for line in handle:
                    try:
                        item = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if isinstance(item, dict) and isinstance(item.get("experiment_id"), str):
                        existing_ids.add(item["experiment_id"])
        if report.get("experiment_id") in existing_ids:
            return
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(report, allow_nan=False, separators=(",", ":")) + "\n")
    except (OSError, TypeError, ValueError):
        # A read-only deployment must not make the numerical experiment API
        # fail. The training status will report missing history and explain
        # that persistence was unavailable.
        return


def load_reports(settings: Any) -> list[dict[str, Any]]:
    path = configured_path(settings.ml_history_path)
    if not path.exists():
        return []
    reports: list[dict[str, Any]] = []
    try:
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                try:
                    item = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(item, dict) and isinstance(item.get("experiment_id"), str):
                    reports.append(item)
    except OSError:
        return []
    return reports


def _canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def _budget(report: dict[str, Any]) -> int | None:
    config = report.get("config") or {}
    value = config.get("max_evaluations") or config.get("iterations")
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _trial_scores(row: dict[str, Any]) -> list[float]:
    trials = row.get("trial_results")
    candidates = trials if isinstance(trials, list) and trials else [row]
    scores: list[float] = []
    for trial in candidates:
        if not isinstance(trial, dict):
            continue
        succeeded = trial.get("execution_succeeded", trial.get("status") != "failed")
        score = trial.get("best_score")
        if succeeded and _finite(score):
            scores.append(float(score))
    return scores


def report_to_rows(report: dict[str, Any]) -> list[dict[str, Any]]:
    """Return valid measured algorithm rows from one report.

    The report's repeated trials are retained as a list so the dataset builder
    can use medians instead of treating the best trial as the typical result.
    """

    problem = report.get("problem") or {}
    config = report.get("config") or {}
    function = problem.get("identifier") or config.get("function")
    dimensions = problem.get("dimension")
    budget = _budget(report)
    bounds = config.get("bounds")
    parameters = config.get("parameters", {})
    if not isinstance(function, str) or not isinstance(dimensions, int) or budget is None:
        return []
    if not isinstance(bounds, dict):
        bounds = None
    group_key = _canonical({"function": function, "dimensions": dimensions, "budget": budget, "bounds": bounds, "parameters": parameters})
    output: list[dict[str, Any]] = []
    for row in report.get("results", []):
        if not isinstance(row, dict):
            continue
        algorithm = row.get("algorithm")
        if algorithm not in ALGORITHM_NAMES:
            continue
        scores = _trial_scores(row)
        if not scores:
            continue
        output.append({"experiment_id": report.get("experiment_id"), "group_key": group_key, "function": function, "dimensions": dimensions, "budget": budget, "algorithm": algorithm, "scores": scores})
    return output


def build_training_dataset(reports: list[dict[str, Any]]) -> dict[str, Any]:
    """Aggregate reports by comparable configuration, excluding seed leakage."""

    groups: dict[str, dict[str, Any]] = {}
    for report in reports:
        for row in report_to_rows(report):
            group = groups.setdefault(row["group_key"], {"group_key": row["group_key"], "function": row["function"], "dimensions": row["dimensions"], "budget": row["budget"], "scores": defaultdict(list), "experiment_ids": set()})
            group["scores"][row["algorithm"]].extend(row["scores"])
            group["experiment_ids"].add(row["experiment_id"])

    examples: list[dict[str, Any]] = []
    discarded = 0
    for group in groups.values():
        medians = {algorithm: float(sorted(scores)[len(scores) // 2] if len(scores) % 2 else (sorted(scores)[len(scores) // 2 - 1] + sorted(scores)[len(scores) // 2]) / 2) for algorithm, scores in group["scores"].items() if scores}
        if len(medians) < 2:
            discarded += 1
            continue
        winner = min(medians, key=lambda algorithm: (medians[algorithm], algorithm))
        examples.append({"group_key": group["group_key"], "function": group["function"], "dimensions": group["dimensions"], "budget": group["budget"], "label": winner, "algorithm_scores": medians, "source_experiment_ids": sorted(group["experiment_ids"])})
    return {"examples": examples, "raw_report_count": len(reports), "distinct_configuration_count": len(groups), "discarded_configuration_count": discarded}

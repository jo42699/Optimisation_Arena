"""Training, persistence, inference and explainability for the selector tree."""

from __future__ import annotations

import hashlib
import json
import math
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.tree import DecisionTreeClassifier

from app import __version__
from app.problems import get_problem
from app.schemas import ExperimentRequest

from .ml_data import ALGORITHM_NAMES, FEATURE_COLUMNS, append_report, build_training_dataset, configured_path, load_reports

_CACHE: dict[str, tuple[float, Pipeline, dict[str, Any]]] = {}


class SelectorNotReady(Exception):
    def __init__(self, message: str, status: str = "not_trained") -> None:
        super().__init__(message)
        self.status = status


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _json_value(value: Any) -> Any:
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, np.ndarray):
        return [_json_value(item) for item in value.tolist()]
    if isinstance(value, dict):
        return {str(key): _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    return value


def _feature_matrix(examples: list[dict[str, Any]]) -> np.ndarray:
    return np.asarray([[item["function"], item["dimensions"], item["budget"]] for item in examples], dtype=object)


def _pipeline(settings: Any) -> Pipeline:
    encoder = OneHotEncoder(handle_unknown="ignore")
    preprocess = ColumnTransformer([("function", encoder, [0]), ("numeric", "passthrough", [1, 2])], remainder="drop")
    tree = DecisionTreeClassifier(max_depth=settings.ml_tree_max_depth, min_samples_leaf=settings.ml_tree_min_samples_leaf, random_state=settings.ml_random_seed)
    return Pipeline([("preprocess", preprocess), ("classifier", tree)])


def _metadata_path(settings: Any) -> Path:
    return configured_path(settings.ml_metadata_path)


def _model_path(settings: Any) -> Path:
    return configured_path(settings.ml_model_path)


def _write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(_json_value(value), allow_nan=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def model_status(settings: Any) -> dict[str, Any]:
    metadata_path = _metadata_path(settings)
    model_path = _model_path(settings)
    if not metadata_path.exists():
        return {"status": "not_trained", "model_version": None, "training_status": "not_trained", "metadata": None, "limitations": ["No persisted decision-tree model is available. Run the training command after collecting measured experiments."]}
    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        if not isinstance(metadata, dict):
            raise ValueError("model metadata must be an object")
        if metadata.get("training_status") != "trained" or not model_path.exists():
            status = metadata.get("training_status", "not_trained")
            limitations = list(metadata.get("limitations", []))
            if status == "trained" and not model_path.exists():
                status = "persistence_failed"
                limitations.append("Training metadata exists but the model artifact is missing; retrain the selector.")
            return {"status": status, "model_version": metadata.get("model_version"), "training_status": status, "metadata": metadata, "limitations": limitations}
        return {"status": metadata.get("training_status", "trained"), "model_version": metadata.get("model_version"), "training_status": metadata.get("training_status", "trained"), "metadata": metadata, "limitations": metadata.get("limitations", [])}
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return {"status": "failed", "model_version": None, "training_status": "failed", "metadata": None, "limitations": [f"Persisted model metadata could not be read: {exc}"]}


def _evaluation(y_test: np.ndarray, predicted: np.ndarray, classes: list[str], baseline_predicted: np.ndarray | None) -> dict[str, Any]:
    if len(y_test) < 2 or len(set(y_test.tolist())) < 2 or set(y_test.tolist()) != set(classes):
        return {"evaluation_status": "insufficient", "held_out_accuracy": None, "held_out_balanced_accuracy": None, "baseline_accuracy": None, "per_class": {}, "confusion_matrix": None, "limitations": ["The held-out partition is too small or does not contain every observed winner class; held-out metrics are omitted."]}
    precision, recall, f1, support = precision_recall_fscore_support(y_test, predicted, labels=classes, zero_division=0)
    per_class = {label: {"precision": float(precision[index]), "recall": float(recall[index]), "f1": float(f1[index]), "support": int(support[index])} for index, label in enumerate(classes)}
    return {"evaluation_status": "evaluated", "held_out_accuracy": float(accuracy_score(y_test, predicted)), "held_out_balanced_accuracy": float(balanced_accuracy_score(y_test, predicted)), "baseline_accuracy": float(accuracy_score(y_test, baseline_predicted)) if baseline_predicted is not None else None, "per_class": per_class, "confusion_matrix": confusion_matrix(y_test, predicted, labels=classes).tolist(), "limitations": []}


def train_model(settings: Any, *, force: bool = False) -> dict[str, Any]:
    started = time.perf_counter()
    dataset = build_training_dataset(load_reports(settings))
    examples = dataset["examples"]
    labels = sorted({item["label"] for item in examples})
    limitations: list[str] = []
    if len(examples) < settings.ml_min_training_groups:
        limitations.append(f"At least {settings.ml_min_training_groups} distinct comparable configurations are required; {len(examples)} were available.")
    if len(labels) < 2:
        limitations.append("At least two observed winning algorithm classes are required to train a useful classifier.")
    if limitations:
        metadata = {"training_status": "insufficient_data", "model_version": None, "trained_at": None, "raw_report_count": dataset["raw_report_count"], "distinct_configuration_count": dataset["distinct_configuration_count"], "training_sample_count": 0, "held_out_sample_count": 0, "supported_algorithm_classes": labels, "evaluation": {"evaluation_status": "insufficient"}, "split_strategy": "grouped by comparable function/dimension/budget/bounds/parameter configuration; no model artifact was written", "limitations": limitations, "training_duration_ms": (time.perf_counter() - started) * 1000, "backend_version": __version__}
        try:
            _write_json(_metadata_path(settings), metadata)
        except OSError:
            metadata["limitations"].append("Training data was evaluated, but the metadata file could not be written.")
        _CACHE.pop(str(_model_path(settings)), None)
        return metadata

    # Each example is already an aggregate for one configuration group. Keep
    # GroupShuffleSplit explicit so adding per-seed rows later cannot leak a
    # configuration into both train and held-out partitions.
    X = _feature_matrix(examples)
    y = np.asarray([item["label"] for item in examples], dtype=object)
    groups = np.asarray([item["group_key"] for item in examples], dtype=object)
    if len(examples) >= 4:
        splitter = GroupShuffleSplit(n_splits=1, test_size=max(1, min(0.25, 1 / len(examples))), random_state=settings.ml_random_seed)
        train_indices, test_indices = next(splitter.split(X, y, groups=groups))
    else:
        train_indices, test_indices = np.arange(len(examples)), np.asarray([], dtype=int)
    pipeline = _pipeline(settings)
    pipeline.fit(X[train_indices], y[train_indices])
    predicted = pipeline.predict(X[test_indices]) if len(test_indices) else np.asarray([], dtype=object)
    baseline = DummyClassifier(strategy="most_frequent", random_state=settings.ml_random_seed).fit(X[train_indices], y[train_indices]) if len(train_indices) else None
    baseline_predicted = baseline.predict(X[test_indices]) if baseline is not None and len(test_indices) else None
    evaluation = _evaluation(y[test_indices], predicted, labels, baseline_predicted)
    if evaluation["evaluation_status"] != "evaluated":
        limitations.extend(evaluation["limitations"])
    limitations.extend(["The model has been evaluated on held-out configurations of known benchmark functions only.", "This selector does not establish generalisation to unseen benchmark functions."])
    model_version = "decision-tree-" + hashlib.sha256(f"{_now()}:{len(examples)}:{settings.ml_random_seed}".encode()).hexdigest()[:12]
    metadata = {"training_status": "trained", "model_version": model_version, "trained_at": _now(), "raw_report_count": dataset["raw_report_count"], "distinct_configuration_count": dataset["distinct_configuration_count"], "training_sample_count": int(len(train_indices)), "held_out_sample_count": int(len(test_indices)), "supported_algorithm_classes": labels, "feature_columns": list(FEATURE_COLUMNS), "target_definition": "algorithm with the lowest median finite best_score among execution-successful runs for each comparable configuration; exact ties use the stable algorithm identifier", "aggregation": "median across repeated trials and persisted reports for the same comparable configuration", "split_strategy": "GroupShuffleSplit by comparable configuration; random seeds are aggregated rather than split across train and held-out data", "tree_parameters": {"max_depth": settings.ml_tree_max_depth, "min_samples_leaf": settings.ml_tree_min_samples_leaf, "random_state": settings.ml_random_seed}, "evaluation": evaluation, "limitations": limitations, "training_duration_ms": (time.perf_counter() - started) * 1000, "backend_version": __version__}
    model_path = _model_path(settings)
    try:
        model_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = model_path.with_suffix(model_path.suffix + ".tmp")
        joblib.dump(pipeline, temporary)
        temporary.replace(model_path)
        _write_json(_metadata_path(settings), metadata)
    except OSError:
        metadata["training_status"] = "persistence_failed"
        metadata["limitations"].append("The fitted model could not be persisted. Check ML_MODEL_PATH and ML_METADATA_PATH permissions, then retrain.")
        return metadata
    _CACHE[str(model_path)] = (model_path.stat().st_mtime, pipeline, metadata)
    return metadata


def _load(settings: Any) -> tuple[Pipeline, dict[str, Any]]:
    status = model_status(settings)
    if status["status"] != "trained":
        raise SelectorNotReady("The decision-tree selector is not trained on sufficient measured data. Run the training command first.", status["status"])
    path = _model_path(settings)
    try:
        mtime = path.stat().st_mtime
        cached = _CACHE.get(str(path))
        if cached and cached[0] == mtime:
            return cached[1], cached[2]
        pipeline = joblib.load(path)
        if not isinstance(pipeline, Pipeline) or "classifier" not in pipeline.named_steps or "preprocess" not in pipeline.named_steps:
            raise ValueError("artifact is not a selector pipeline")
        metadata = status["metadata"] or {}
        _CACHE[str(path)] = (mtime, pipeline, metadata)
        return pipeline, metadata
    except Exception as exc:
        raise SelectorNotReady(f"The persisted selector could not be loaded: {exc}", "failed") from exc


def _friendly_feature(name: str) -> str:
    if name.startswith("function__x0_"):
        return "function indicator " + name.removeprefix("function__x0_")
    return name.replace("numeric__x1", "dimensions").replace("numeric__x2", "budget")


def _explain(pipeline: Pipeline, row: np.ndarray, predicted_label: str) -> dict[str, Any]:
    preprocessor = pipeline.named_steps["preprocess"]
    tree: DecisionTreeClassifier = pipeline.named_steps["classifier"]
    transformed = preprocessor.transform(row)
    path = tree.decision_path(transformed)
    node_indices = path.indices[path.indptr[0]:path.indptr[1]]
    names = list(preprocessor.get_feature_names_out())
    conditions: list[dict[str, Any]] = []
    for index in node_indices:
        feature_index = int(tree.tree_.feature[index])
        if feature_index < 0:
            continue
        feature_name = names[feature_index]
        value = float(transformed[0, feature_index])
        threshold = float(tree.tree_.threshold[index])
        direction = "<=" if value <= threshold else ">"
        conditions.append({"feature": _friendly_feature(feature_name), "operator": direction, "threshold": threshold, "observed_value": value, "condition": f"{_friendly_feature(feature_name)} {direction} {threshold:.6g}"})
    leaf = int(node_indices[-1])
    counts = tree.tree_.value[leaf][0]
    classes = [str(item) for item in tree.classes_]
    distribution = {label: int(counts[index]) for index, label in enumerate(classes)}
    return {"available": True, "conditions": conditions, "leaf_node": leaf, "leaf_sample_count": int(tree.tree_.n_node_samples[leaf]), "leaf_class_distribution": distribution, "predicted_class": predicted_label, "source": "fitted DecisionTreeClassifier decision path"}


def predict(settings: Any, *, function: str, dimensions: int, budget: int) -> dict[str, Any]:
    problem = get_problem(function)
    problem_dimension = 2
    if dimensions != problem_dimension:
        raise ValueError(f"The current {problem.name} benchmark implementation supports exactly {problem_dimension} dimensions; received {dimensions}.")
    if budget > settings.max_evaluations:
        raise ValueError(f"budget cannot exceed the configured maximum of {settings.max_evaluations}.")
    pipeline, metadata = _load(settings)
    row = np.asarray([[problem.identifier, dimensions, budget]], dtype=object)
    predicted_label = str(pipeline.predict(row)[0])
    classifier: DecisionTreeClassifier = pipeline.named_steps["classifier"]
    probabilities = pipeline.predict_proba(row)[0]
    scores = {str(label): float(probabilities[index]) for index, label in enumerate(classifier.classes_)}
    return {"status": "completed", "recommended_algorithm": predicted_label, "recommended_display_name": ALGORITHM_NAMES.get(predicted_label, predicted_label), "model_scores": scores, "scores_are_leaf_class_frequencies": True, "input": {"function": problem.identifier, "dimensions": dimensions, "budget": budget}, "model_version": metadata.get("model_version"), "training_status": metadata.get("training_status"), "decision_path": _explain(pipeline, row, predicted_label), "model_evaluation": metadata.get("evaluation"), "limitations": metadata.get("limitations", [])}


def collect_training_experiments(settings: Any) -> dict[str, Any]:
    """Collect real, bounded reports through the existing experiment runner."""

    from app.services.experiment_runner import run_experiment

    completed = 0
    failures: list[str] = []
    # This is deliberately explicit and bounded. Every label is derived from
    # the actual engine output; the routine never writes synthetic scores.
    for function in ("sphere", "rosenbrock", "rastrigin", "himmelblau"):
        for budget in (100, 300, 600):
            for seed in (11, 29):
                try:
                    request = ExperimentRequest(function=function, algorithms=list(ALGORITHM_NAMES), iterations=budget, seed=seed, landscape={"resolution": 10}, repeated_trials=1, max_evaluations=budget)
                    run_experiment(request, settings, generate_ai=False)
                    completed += 1
                except Exception as exc:  # pragma: no cover - defensive around a long-running collection job
                    failures.append(f"{function}/{budget}/{seed}: {exc}")
    return {"experiments_collected": completed, "failures": failures, "history_path": str(configured_path(settings.ml_history_path))}

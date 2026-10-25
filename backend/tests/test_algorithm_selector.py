import json

import numpy as np
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.services import algorithm_selector as selector
from app.services.ml_data import build_training_dataset, report_to_rows


def _report(function: str, budget: int, scores: dict[str, list[float]], experiment_id: str) -> dict:
    rows = []
    for algorithm, values in scores.items():
        rows.append({"algorithm": algorithm, "trial_results": [{"status": "completed", "execution_succeeded": True, "best_score": value} for value in values]})
    return {"experiment_id": experiment_id, "problem": {"identifier": function, "dimension": 2}, "config": {"function": function, "iterations": budget, "max_evaluations": budget, "bounds": {"x": [-5.0, 5.0], "y": [-5.0, 5.0]}, "parameters": {}}, "results": rows}


def test_training_rows_use_measured_medians_and_ignore_failed_trials():
    report = _report("sphere", 100, {"gradient_descent": [9.0, 1.0, 3.0], "simulated_annealing": [4.0, 5.0, 6.0]}, "measured-1")
    rows = report_to_rows(report)
    assert {row["algorithm"] for row in rows} == {"gradient_descent", "simulated_annealing"}
    dataset = build_training_dataset([report])
    assert len(dataset["examples"]) == 1
    example = dataset["examples"][0]
    assert example["algorithm_scores"] == {"gradient_descent": 3.0, "simulated_annealing": 5.0}
    assert example["label"] == "gradient_descent"


def test_same_configuration_is_aggregated_before_labeling():
    reports = [
        _report("sphere", 100, {"gradient_descent": [1.0], "genetic_algorithm": [4.0]}, "measured-1"),
        _report("sphere", 100, {"gradient_descent": [5.0], "genetic_algorithm": [2.0]}, "measured-2"),
    ]
    dataset = build_training_dataset(reports)
    assert len(dataset["examples"]) == 1
    assert dataset["examples"][0]["algorithm_scores"] == {"gradient_descent": 3.0, "genetic_algorithm": 3.0}
    assert dataset["examples"][0]["label"] == "genetic_algorithm"


def test_fitted_tree_explanation_contains_actual_path():
    settings = get_settings()
    examples = [
        {"group_key": "a", "function": "sphere", "dimensions": 2, "budget": 100, "label": "gradient_descent"},
        {"group_key": "b", "function": "sphere", "dimensions": 2, "budget": 500, "label": "simulated_annealing"},
        {"group_key": "c", "function": "rastrigin", "dimensions": 2, "budget": 100, "label": "genetic_algorithm"},
        {"group_key": "d", "function": "rastrigin", "dimensions": 2, "budget": 500, "label": "genetic_algorithm"},
    ]
    pipeline = selector._pipeline(settings)
    matrix = selector._feature_matrix(examples)
    labels = np.asarray([example["label"] for example in examples], dtype=object)
    pipeline.fit(matrix, labels)
    row = np.asarray([["sphere", 2, 100]], dtype=object)
    predicted = str(pipeline.predict(row)[0])
    explanation = selector._explain(pipeline, row, predicted)
    assert explanation["available"] is True
    assert explanation["predicted_class"] == predicted
    assert explanation["leaf_sample_count"] >= 1
    assert json.dumps(explanation, allow_nan=False)


def test_insufficient_history_is_reported_without_fabricating_a_model(monkeypatch):
    monkeypatch.setattr(selector, "load_reports", lambda settings: [])
    monkeypatch.setattr(selector, "_write_json", lambda path, value: None)
    settings = get_settings().model_copy(update={"ml_min_training_groups": 4})
    result = selector.train_model(settings)
    assert result["training_status"] == "insufficient_data"
    assert result["model_version"] is None
    assert result["distinct_configuration_count"] == 0
    assert result["limitations"]


def test_prediction_validation_is_transparent_before_model_lookup():
    client = TestClient(app)
    unknown = client.post("/api/predict-algorithm", json={"function": "not-a-function", "dimensions": 2, "budget": 100})
    unsupported_dimensions = client.post("/api/predict-algorithm", json={"function": "sphere", "dimensions": 3, "budget": 100})
    assert unknown.status_code == 422
    assert unsupported_dimensions.status_code == 422
    assert unknown.json()["detail"]["type"] == "unsupported_prediction"

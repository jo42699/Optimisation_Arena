from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_ai_unavailable_does_not_break_report():
    report = client.post("/api/experiments", json={"function": "sphere", "algorithms": ["gradient_descent"], "iterations": 2, "landscape": {"resolution": 10}}).json()
    response = client.post(f"/api/experiments/{report['experiment_id']}/insights", json={})
    assert response.status_code == 200
    assert response.json()["status"] in {"disabled", "unavailable", "completed", "failed"}
    refreshed_report = client.get(f"/api/experiments/{report['experiment_id']}").json()
    assert refreshed_report["ai_insights"]["status"] == response.json()["status"]

# Optimisation Arena backend

This FastAPI service runs reproducible comparisons of Gradient Descent, Simulated Annealing and a Genetic Algorithm on the Sphere, Rosenbrock, Rastrigin and Himmelblau functions. One experiment response contains the numerical surface, animation-ready paths, convergence series, diagnostics, comparison and an AI insights status/result. When AI is enabled and configured, the experiment request automatically enriches the same report with generated insights.

## Prerequisites and setup

Python 3.11 or later is supported. From the repository root:

### Windows PowerShell

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python run.py
```

### macOS/Linux

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
python run.py
```

The API runs at `http://127.0.0.1:8000`. Interactive documentation is at `/docs`; the generated OpenAPI document is at `/api/openapi.json`. Stop the server with Ctrl+C. Run tests with `pytest -q` from `backend/`.

## Configuration

`.env.example` documents the host, CORS origin, resource limits and optional OpenAI settings. `OPENAI_API_KEY` may remain empty: experiments and deterministic diagnostics do not depend on AI. Set `OPENAI_MODEL` to a model available to the configured account and set `OPENAI_INSIGHTS_ENABLED=true` to enable requests.

Reports and insights are stored in bounded in-memory dictionaries. They disappear after a process restart and are not shared between multiple workers.

## API endpoints

- `GET /api/health` — health, version and non-secret AI configuration status.
- `GET /api/functions` — benchmark definitions, equations, bounds and minima.
- `GET /api/algorithms` — algorithm descriptions, parameters and limits.
- `POST /api/experiments` — execute and return a complete report; automatically requests AI insights when configured.
- `GET /api/experiments/{id}` — retrieve a stored report.
- `GET /api/experiments/{id}/summary` — retrieve a compact dashboard summary.
- `POST /api/experiments/{id}/insights` — generate or retrieve optional AI analysis.
- `GET /api/experiments/{id}/insights` — retrieve cached AI analysis or its current status.

Example request using Rastrigin and two algorithms:

```bash
curl -X POST http://127.0.0.1:8000/api/experiments \
  -H "Content-Type: application/json" \
  -d '{"function":"rastrigin","algorithms":["gradient_descent","simulated_annealing"],"iterations":100,"seed":42,"starting_point":[3.5,-2.5],"landscape":{"resolution":80}}'
```

The response has this shape:

```json
{
  "schema_version": "1.0",
  "experiment_id": "uuid",
  "status": "completed",
  "config": {},
  "problem": {},
  "landscape": {"surface": {"x": [], "y": [], "z": []}, "known_optima": []},
  "results": [],
  "animation": {"algorithms": {}},
  "convergence": {"series": []},
  "comparison": {"ranking_metric": "best_score", "winner": {}, "ranking": []},
  "diagnostics": {},
  "overall_summary": {},
  "ai_insights": {"status": "completed"},
  "metadata": {}
}
```

For a resolution of 80, `surface.x` and `surface.y` have 80 values and `surface.z[j][i]` is the objective at `(surface.x[i], surface.y[j])`. Each `animation.algorithms[id]` contains aligned `path`, `scores`, `best_so_far`, `best_so_far_positions`, `iterations` and `function_evaluations` arrays. The frontend can render the surface once, then move a marker through `path[frame]`, extend a trail, and use `scores[frame]` and `best_so_far[frame]` for labels and charts. No frame endpoint or server-side animation loop is required.

`best_score` ranks finite eligible runs by lowest objective. `runtime` ranks by measured runtime and explicitly prioritises speed. `balanced` uses a deterministic 60% normalised objective, 30% normalised runtime and 10% reliability penalty. Runtime is machine-dependent, and one trial does not establish statistical reliability.

Each result separates `execution_status` (`completed`, `early_stopped` or `failed`), `optimization_status` (`improved`, `target_attained`, `no_improvement` or `failed`), `target_attained`, and `stagnation_observed`. The overall summary reports completed, failed, stagnated, optimisation-successful and target-attaining algorithms independently; `stalled_or_failed` is retained as a compatibility aggregate.

## OpenAI insights

Insights send a compact summary of measured metrics, not the full landscape or trajectories. The backend asks the official OpenAI SDK for structured output, validates the returned structure with Pydantic, and keeps the deterministic winner authoritative. Disabled, missing-key, timeout and malformed-response cases return a structured `disabled`, `unavailable` or `failed` result in the same experiment report without invalidating the numerical report. The separate insights endpoint remains available for refreshes. AI text is treated as untrusted data and cannot execute code or change parameters.

## Frontend integration and limitations

The current repository contained no frontend implementation or API conventions, so the service defaults to `http://localhost:3000` CORS and exposes the contract above. Set `CORS_ORIGINS` to the actual frontend origin(s) when connecting it. The service is synchronous and intended for bounded hackathon experiments; long-running workloads should later move to a background-job design. In-memory retention, machine-dependent runtimes and finite iteration/evaluation limits are deliberate initial-version limitations.

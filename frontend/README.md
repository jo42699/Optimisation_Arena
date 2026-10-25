# Optimisation Arena frontend

This is the Next.js dashboard for the existing Optimisation Arena FastAPI backend. It uses backend metadata and the complete experiment report as its only source for numerical results.

## Run locally

Prerequisites: Node.js 20+ and the backend running at the URL configured in `NEXT_PUBLIC_API_BASE_URL`.

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The discovered backend is running at `http://127.0.0.1:8001`; change `frontend/.env.local` if your backend uses another port. Never put an OpenAI key in frontend environment variables.

Checks:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## Backend contract used

- `GET /api/functions` and `GET /api/algorithms` populate selectors and settings.
- `POST /api/experiments` submits the validated experiment configuration and returns the complete report.
- `GET /api/experiments/{id}` retrieves an in-memory report.
- `GET`/`POST /api/experiments/{id}/insights` read or refresh AI insights.
- `GET /api/health` is available to the backend but is not required for rendering.

The report is stored in React Context. A new report updates every panel together; changing controls after a run does not relabel that report. Reports disappear when the backend restarts because its store is intentionally in memory.

## How the visualisations work

The surface uses `landscape.surface.x`, `y` and `z`, with the backend contract `z[j][i] = f(x[i], y[j])`. Plotly renders the same grid as a 3D surface, contour, heatmap or XY paths. The animation slider indexes the actual recorded trajectory arrays and clamps to the shortest available state per algorithm; no intermediate points are invented. Candidate scores are used as the trajectory height, while convergence lines use the backend's best-so-far values against actual function evaluations.

The results table reads execution status, optimisation status, target attainment, stagnation, score, runtime and evaluations directly from each result. The recommendation displays the backend's measured winner separately from known-optimum attainment.

## Replaceable function artwork

Function artwork is mapped centrally in `src/lib/functionImages.ts` and currently uses designed SVG placeholders in `public/images/functions/`. To replace one, add a local asset with the matching name (`sphere.svg`, `rosenbrock.svg`, `rastrigin.svg` or `himmelblau.svg`) and update the mapping only if the extension changes. Both the large selected-function preview and the smaller function cards use this mapping; no machine-specific absolute paths are used.

## AI behaviour and limitations

The AI panel renders `ai_insights` when the backend returns `completed`. For `disabled`, `unavailable`, `failed`, `not_generated` or null it shows a truthful message and can request the supported insights endpoint. AI is optional and does not affect experiment validity. The backend's in-memory persistence is single-process and not suitable for multi-worker production deployment.

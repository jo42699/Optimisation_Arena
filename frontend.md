# Optimisation Arena --- Full Frontend Coding-Agent Prompt

## Mission

Act as a senior frontend engineer with strong experience in Next.js,
TypeScript, scientific visualisation, interactive 3D charts and API
integration.

Build the actual **Optimisation Arena** frontend in a new `frontend/`
directory in the existing repository. Use the screenshot named
**`Optimisation Arena Dashboard (2).png`** in the repository root as the
primary visual reference.

The application lets users select mathematical benchmark functions,
select optimisation algorithms, configure experiments, run them through
the existing backend, animate their search trajectories across an
interactive 3D surface, compare convergence and performance, see the
measured winner, and request AI-generated analysis.

**Do not merely produce a mockup, static HTML, plan or scaffold.
Implement the working frontend, integrate it with the real backend, and
run checks.**

## 1. Inspect the repository first

Before creating or changing files:

1.  Inspect the repository tree.
2.  Find and read the existing backend API routes, Pydantic
    request/response models, report builder, configuration and README.
3.  Locate a real sample experiment JSON report if one exists.
4.  Identify the actual backend base URL, endpoints, request payloads,
    response field names, experiment persistence behaviour and AI
    insights workflow.
5.  Inspect `Optimisation Arena Dashboard (2).png`.
6.  Determine the current frontend status, if any.

Do not guess API endpoints or assume every example field in this prompt
exists. The actual backend implementation and its schemas are
authoritative. Where the backend differs from an example in this prompt,
write a typed adapter that maps the real schema to the UI. If a required
capability is missing in the backend, document it and provide an honest
UI state rather than fabricating a result.

Preserve the existing backend. Do not overwrite or relocate it.

## 2. Required project location and stack

Create all frontend code inside `frontend/` at the repository root.

Use: - Next.js App Router. - React and TypeScript with strict type
checking. - Tailwind CSS. - React Context API for shared
application/experiment state. - Plotly.js and `react-plotly.js` for
interactive 3D surface, contour plot and heatmap. - Recharts or Plotly
for convergence charts; prefer a consistent visual style and avoid
redundant chart libraries where possible. - KaTeX or MathJax for
rendered mathematical equations. - Lucide React icons. - Zod or
equivalent runtime validation where practical.

Use client components for interactive charts and browser-only libraries.
Load Plotly dynamically with server-side rendering disabled when
necessary. Keep dependencies reasonable.

Suggested structure (adapt to existing repository conventions):

``` text
frontend/
├── public/
│   └── images/
│       └── functions/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── experiments/
│   │   ├── documentation/
│   │   └── about/
│   ├── components/
│   │   ├── layout/
│   │   ├── experiment/
│   │   ├── visualizations/
│   │   ├── results/
│   │   ├── insights/
│   │   └── ui/
│   ├── context/
│   │   └── ExperimentContext.tsx
│   ├── hooks/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── adapters.ts
│   │   ├── math.ts
│   │   └── formatters.ts
│   ├── types/
│   │   └── experiment.ts
│   └── styles/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

Use the repository's existing package manager if applicable. Otherwise
use npm and document commands.

## 3. Reference image and visual design

The reference image is `Optimisation Arena Dashboard (2).png` in the
repository root. Recreate its structure and style, not just its colours:

-   Compact top navigation.
-   Left column for function selection, algorithm selection and
    experiment configuration.
-   Large central visualisation panel.
-   Right column for visualisation controls and function information.
-   Lower row with convergence comparison, results
    summary/recommendation and AI insights.

The screenshot is a design reference, **not a data source**. All live
numerical values, paths, convergence lines, results, winner claims and
AI analysis must come from the actual backend response.

Style: - Dark navy / blue-black background. - Slightly lighter navy
cards with subtle blue borders. - Electric blue and violet primary
actions. - White headings and cool blue-grey supporting text. - Red,
amber and green algorithm series, consistently used across charts. -
Thin chart gridlines, clear legends and readable labels. - Compact
spacing and a polished scientific-dashboard feel. - Rounded cards,
restrained shadows and subtle hover/focus states. - Avoid generic white
dashboard styling, giant empty panels and decorative fake charts.

Make the layout responsive and accessible. Do not rely on colour alone
to communicate algorithm identity.

## 4. Global React Context

Create an `ExperimentContext` and mount its provider in the root
application layout. Use a typed `useReducer` or similarly maintainable
state pattern.

Manage shared state such as: - Function metadata returned by the
backend. - Algorithm metadata returned by the backend. - Selected
function and algorithms. - Experiment configuration. - Current
experiment ID and report. - Request status (`idle`, `loading`,
`success`, `error`). - API loading/error state. - Active visualisation
type and colour map. - Visibility flags for paths, starting points and
global minima. - Animation state, current frame and playback speed. - AI
insight data and request status. - Theme state if managed globally.

Provide typed actions/helpers to load metadata, select functions and
algorithms, update parameters, submit experiments, load reports, reset
state, control animation, update visualisation settings and request
insights where supported.

Keep local modal state local. Avoid storing duplicate copies of large
derived chart arrays. Use memoisation. Prevent stale asynchronous
requests from replacing newer results; use `AbortController` where
practical.

## 5. Typed backend integration

Inspect actual backend routes and schemas before writing the API client.

Create: - `src/lib/api.ts` for HTTP calls. - `src/lib/adapters.ts` for
response-to-view-model mapping. - `src/types/experiment.ts` for accurate
TypeScript types.

Configure the base URL through:

``` dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Use the real backend URL if different. `NEXT_PUBLIC_` variables are
public; never put an OpenAI key in them.

Implement client functions for the endpoints that really exist, such as
fetching supported functions and algorithms, submitting an experiment,
retrieving a report by ID, fetching history if supported, and
requesting/retrieving insights if supported. These are logical
operations, not permission to invent endpoint paths.

Handle network failures, non-2xx responses, HTTP 422 validation errors,
timeouts, malformed JSON, missing optional fields, AI
unavailable/disabled responses and unknown experiment IDs.

Show useful error messages and retry options. Never silently substitute
fake successful data. If the backend runs synchronously, show a loading
state while awaiting the response. If it uses background jobs, follow
its actual status/polling contract; do not invent progress endpoints.

## 6. Function selection panel

Build the first left-side card, "Choose a mathematical problem".

Populate available functions from backend metadata. Support these when
returned: - Sphere. - Rosenbrock. - Rastrigin. - Himmelblau.

For the selected function, show: - Name. - Rendered equation. -
Description. - Dimension. - Search bounds. - Known global minimum
coordinates. - Known minimum objective value. - Function preview.

Below it, show compact selectable cards for the other available
functions, with a thumbnail, name, equation preview and selection
affordance.

### Required image placeholders

Create local placeholder areas for each supported function under
`frontend/public/images/functions/`. If final images are unavailable,
use a designed placeholder with a subtle gradient, icon or small
generated landscape thumbnail, and a function label. Do not use broken
image URLs or unrelated stock photography.

A lightweight, deterministic canvas-based 2D thumbnail generated from
the corresponding function is acceptable. It is only a thumbnail, not a
replacement for the interactive 3D chart.

Render equations from backend-provided LaTeX with KaTeX or MathJax.
Avoid duplicating equations in hardcoded components.

When the selected function changes, update its information and
configuration defaults. Do not relabel old results as belonging to the
newly selected function. Require a new run or clearly label the report
as belonging to the previous configuration.

## 7. Algorithm selection panel

Populate algorithm cards from backend metadata. The initial design
should accommodate Gradient Descent, Simulated Annealing and Genetic
Algorithm, but must not hardcode these as the only possible algorithms
if the backend exposes more.

Each card needs a name, short description, checkbox and settings
control. Expose only parameters supported by the backend. Use a modal,
drawer or expandable panel for advanced settings.

Suggested consistent colours: - Gradient Descent: red. - Simulated
Annealing: amber. - Genetic Algorithm: green.

Users can select one or more algorithms. Validate that at least one is
selected.

## 8. Experiment configuration and submission

Build controls for the settings supported by the real backend: -
Iteration/generation budget. - Random seed. - Starting point, if
supported. - Search bounds, if supported. - Repeated-trial count, if
supported. - Algorithm-specific parameters. - Landscape resolution, if
supported. - Ranking metric, if supported.

Populate defaults from backend metadata or documented defaults.

The "Run Experiment" button must: 1. Validate the form. 2. Construct a
request using the actual backend schema. 3. Submit through the API
client. 4. Display loading state and prevent duplicate submissions. 5.
Handle validation and server errors. 6. Store the actual report in
global context. 7. Update all dashboard panels. 8. Reset animation to
the first valid frame. 9. Display success only after a report is
returned.

Do not fabricate results if the request fails.

## 9. Central interactive visualisation

Use Plotly.js for actual scientific charts. Add tabs: - **3D Surface**
--- default. - **Contour Plot (2D)**. - **Algorithm Paths Only**. -
**Heatmap**.

Show the active report's function name, a legend and a chart
expand/fullscreen action where practical.

### 9.1 3D surface

Use the real backend grid. Inspect the response schema; it may contain
`landscape.surface.x`, `landscape.surface.y` and `landscape.surface.z`.

Requirements: - Correct X/Y/Z orientation. - Interactive rotate, zoom,
pan and hover. - Labelled axes. - Configurable colour map, with Viridis
as a suitable initial choice. - Actual algorithm trajectories. -
Distinct starting-point markers. - Distinct markers for all known global
minima returned by the backend. - Optional final/best-position
markers. - Visibility toggles for paths, start points and global
minima. - Useful tooltips with coordinates, iteration and score when
available. - Responsive sizing.

For a candidate `(x, y)`, use its correctly aligned recorded objective
score as Z. If the score is missing and the function is supported
locally, use a tested local function implementation. Validate array
alignment and never pair mismatched arrays.

Use recorded current-candidate or best-so-far paths according to the
view's meaning. Clearly label which one is shown. Do not invent
trajectory points. Reuse one surface grid across algorithms.

### 9.2 Contour plot

Render the actual backend grid as a 2D contour plot. Overlay paths,
starting points and known minima when available. Include axes, colour
scale and consistent algorithm colours.

### 9.3 Algorithm paths only

Provide a focused XY path view or paths projected onto the surface. Keep
axes and legends meaningful.

### 9.4 Heatmap

Render the real objective grid as a heatmap with axes, colour scale and
optional path overlays.

### 9.5 Animation controls

When usable histories exist, provide: - Play/pause. - Reset. - Timeline
slider. - Current iteration/generation. - Playback speed. - Current
candidate score. - Best-so-far score.

Animate actual recorded states. Do not fabricate intermediate states or
stretch a short path to match the requested budget.

Algorithms may return different history lengths. Use a safe common
timeline or per-algorithm frame mapping; never index beyond an array.
Clean up animation frames/timers on unmount or report changes. Respect
reduced-motion preferences.

Avoid rerendering the entire surface for every animation tick if only
markers or paths change. Use memoisation and Plotly update mechanisms
where practical.

### 9.6 Chart actions

Add reset-camera and download-as-PNG actions if supported. Show an
honest empty state if a grid or path is unavailable.

## 10. Right sidebar

### Visualisation settings

Include view type, colour map, show/hide algorithm paths, show/hide
start points and show/hide global minima. Wire each control to the
actual chart state; do not create decorative controls.

### Function information

Display the selected report's name, rendered equation, dimension, known
minima, minimum value and bounds. If multiple minima exist, show all
available minima.

## 11. Convergence comparison

Create a "Convergence Comparison" panel using actual backend best-so-far
histories, such as `best_so_far_history` if that is the real field.

Requirements: - One line per selected algorithm. - Consistent colours. -
X-axis labelled as iterations/generations or function evaluations
according to the data. - Y-axis labelled best objective value. -
Actual-value tooltips. - Legend and readable grid. - Responsive
sizing. - Linear/logarithmic scale option when mathematically valid.

Do not confuse iteration count with function-evaluation count. If
algorithms use different evaluation budgets, make that clear. Handle
zero and negative values correctly for logarithmic scales; do not
silently omit valid data or generate invalid logarithms. Never generate
synthetic convergence series.

## 12. Results summary and recommendation

Create a results table with fields available in the actual report, such
as algorithm, best score, best position, iterations/generations
completed, runtime, function evaluations and target-attainment status.

Show unavailable values as unavailable, not zero.

Use the backend's explicit winner/recommendation field if present. If no
winner is provided, derive one only when the response schema and ranking
metric make the comparison unambiguous; otherwise show that no reliable
recommendation is available.

Distinguish: - Run completed. - Optimisation target attained. - Known
global optimum reached within tolerance. - Experiment winner.

A completed run is not automatically a successful optimisation. Show the
measured score and selection criterion. Do not claim high success rates
unless valid repeated-trial statistics are returned.

## 13. AI insights and recommendations

Create an "AI Insights & Recommendations" panel.

Inspect whether insights are included in the report or returned from a
separate backend endpoint. Render the actual response and support its
real fields, potentially including headline, overall analysis,
per-algorithm observations, possible explanations, recommendations,
parameter suggestions, follow-up experiments and limitations.

If `ai_insights` is null, do not invent AI commentary. Show a "Generate
Insights" button only if the backend has a supported endpoint. After
generation, update context with the returned analysis.

Never hardcode paragraphs that pretend to be AI results. Never expose an
OpenAI API key in frontend code.

## 14. Global data consistency

All panels must represent the same active experiment report.

When a new report arrives, update the surface, trajectories, animation,
convergence chart, results, winner, diagnostics and AI insights if
present.

If the user changes the selected function or algorithm controls after a
run, do not silently relabel old results. Indicate that a new run is
needed or clearly label the previous report's configuration.

Use explicit TypeScript interfaces and adapters for the actual schema.
Avoid `any` and scattered property-name guesses.

## 15. Navigation and secondary pages

Add working header links for Experiments, Documentation and About. Do
not leave broken links.

Documentation should explain the actual supported workflow and
functions/algorithms. About should describe the project's purpose. Show
experiment history only if the backend supports it; otherwise explain
the limitation and provide a route back to the dashboard.

A theme toggle is desirable if it genuinely changes the theme and keeps
charts readable.

## 16. Responsive layout

Desktop: three-column dashboard with left controls, central
visualisation and right settings/information; three lower panels.

Tablet: reduce widths and move side panels below the visualisation as
needed.

Mobile: stacked panels, mobile navigation, horizontally scrollable tabs
if needed, accessible controls, useful chart height and touch gestures.
Prevent horizontal page overflow.

## 17. Accessibility and interaction quality

Use semantic HTML, associated labels, keyboard navigation, visible focus
states, accessible button names, chart legends, readable text,
reduced-motion support and clear loading/empty/error states. Avoid
controls that appear active but do nothing.

## 18. Testing

Add tests for: 1. API success/error/malformed-response handling. 2.
Mapping the real report schema to UI data. 3. Surface grid orientation
and dimensions. 4. Trajectory coordinate/score alignment. 5.
Convergence-series mapping. 6. Winner display from backend comparison.
7. Equation rendering. 8. Missing optional fields and null AI insights.
9. Global context updates after an experiment. 10. Form validation and
request payload construction.

Use a real report fixture from the repository when available. Do not
present fabricated metrics as real integration data.

Run linting, type checking, tests and a production build. Fix failures
rather than disabling checks. If a check cannot run, document why.

## 19. Environment and frontend README

Create `frontend/.env.example` with the safe backend URL, for example:

``` dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Use the actual backend URL discovered during inspection. Never place
secrets in frontend environment variables.

Create `frontend/README.md` documenting requirements, installation,
environment variables, development and production commands, tests,
actual backend route mapping, how the report drives each chart, and
known limitations.

## 20. Definition of done

-   [ ] App exists inside `frontend/`.
-   [ ] Existing backend remains intact.
-   [ ] Screenshot is used as the design reference.
-   [ ] Dashboard is responsive and visually close to the reference.
-   [ ] Function cards have local image placeholders and rendered
    equations.
-   [ ] Metadata comes from backend where available.
-   [ ] React Context coordinates shared experiment state.
-   [ ] Experiment form submits a real request.
-   [ ] 3D surface uses the actual backend grid.
-   [ ] Recorded trajectories animate without fabricated states.
-   [ ] Contour, paths-only and heatmap modes work.
-   [ ] Convergence chart uses actual history.
-   [ ] Results and winner use real measurements.
-   [ ] AI insights come from the actual backend.
-   [ ] Missing data and API errors are handled honestly.
-   [ ] Type checking, lint, tests and production build pass, or
    blockers are documented.

## 21. Final instructions

Implement the frontend in the existing repository, not elsewhere.
Inspect the backend first and use its real API contract. Do not replace
real results with mocks, hardcode a winner or claim AI analysis exists
if the backend has not returned it.

At completion, report files created/modified, actual backend endpoints
used, installation/run commands, how 3D animation is driven by the
report, test/lint/type/build results, and remaining backend limitations.

**Start implementation now. Do not stop after writing a plan or creating
the initial Next.js scaffold.**

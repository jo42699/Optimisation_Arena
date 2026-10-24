# Optimisation Arena --- Frontend Agent Instructions

This repository contains instructions for an AI coding agent to build
the Optimisation Arena frontend using the existing backend.

## Reference files

-   **Dashboard design reference:**
    `Optimisation Arena Dashboard (2).png`
-   **Full coding-agent instructions:** [`frontend.md`](./frontend.md)

## 1. Add the dashboard image

Place the supplied image in the repository root, next to `backend/` and
`frontend.md`, using this exact filename:

``` text
Optimisation Arena Dashboard (2).png
```

Expected layout:

``` text
your-project/
├── backend/                              # Existing backend; preserve it
├── frontend.md                           # Full frontend implementation prompt
├── README.md                             # This file
├── Optimisation Arena Dashboard (2).png  # Dashboard visual reference
└── frontend/                             # Created by the coding agent
```

If the image is in Downloads, copy it into the repository root.

Windows PowerShell:

``` powershell
Copy-Item "$HOME\Downloads\Optimisation Arena Dashboard (2).png" ".\Optimisation Arena Dashboard (2).png"
```

macOS/Linux:

The reference image `Optimisation Arena Dashboard (2).png` is already in the project root. Do not copy or rename it. Read `frontend.md` and follow the full implementation instructions. Inspect the existing backend and its actual API schemas, then build the complete Next.js frontend in `frontend/`. Use the image as the visual reference, React Context for global state, and real backend responses for the interactive 3D plots, convergence charts, results summary and AI insights. Preserve the backend and test the finished application.

Adjust the source path if the image is stored elsewhere. Keep the
filename exactly as shown, including spaces and parentheses.

## 2. Give the coding agent access to the repository

Open the whole project repository in your coding agent (Cursor, Claude
Code, VS Code with an agent, or another repository-aware tool). The
agent must be able to inspect the existing `backend/` directory, not
just read the prompt.

## 3. Send the prompt

Ask the agent to read `frontend.md` completely and follow it:

> Read `frontend.md` from beginning to end and follow it as the
> implementation specification. Use
> `Optimisation Arena Dashboard (2).png` in the repository root as the
> visual reference. Inspect the existing backend and its actual API
> contracts before writing frontend code. Build the working Next.js
> frontend inside a new `frontend/` folder, use real backend data, run
> the checks and tests, and report what is complete and what remains. Do
> not replace the backend or stop after scaffolding.

## 4. Attach the image in tools that support attachments

If your coding agent offers file attachments, attach
`Optimisation Arena Dashboard (2).png` to the agent conversation too.
Keep the image in the repository root so the agent can locate it in
future sessions.

## 5. Important integration notes

-   The screenshot is a visual reference only, not a source of numerical
    experiment results.
-   The existing backend and its report schema are the source of truth
    for function metadata, surface grids, algorithm trajectories,
    convergence histories, performance metrics, winner selection and AI
    insights.
-   The frontend must not fabricate results if the backend is
    unavailable or returns incomplete data.
-   Keep the existing backend intact. Create the frontend separately in
    `frontend/`.
-   Never expose an OpenAI API key in a `NEXT_PUBLIC_` environment
    variable or browser code.

See [`frontend.md`](./frontend.md) for the complete specification.

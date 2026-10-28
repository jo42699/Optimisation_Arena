# Optimisation Arena

Optimisation Arena is a web-based application for exploring and comparing mathematical optimisation algorithms. It runs algorithms against benchmark functions, visualises their search behaviour through interactive 3D plots and convergence graphs, and aims to use historical experiment data to predict which algorithm is most suitable for a given problem.

**Hackathon:** OxHack 2026  
**Target prize category:** HRT — Best Use of Data for Predictions and Decision Making

> **Project status:** The core dashboard, benchmark functions, optimisation algorithms, experiment workflow and Plotly visualisations have been described as implemented. Verify the current repository to confirm whether the decision-tree training and prediction workflow is complete.

## Features

- Interactive dashboard for configuring and exploring optimisation experiments.
- Benchmark functions including Sphere, Rosenbrock, Rastrigin and Himmelblau.
- Optimisation algorithms including Gradient Descent, Simulated Annealing and Genetic Algorithm.
- Interactive 3D objective-landscape visualisations.
- Convergence graphs showing how objective values change during optimisation.
- Experiment comparison using measured metrics supported by the implementation.
- **Intelligent Algorithm Selector (planned or in progress):** a decision-tree model trained on previous experiment results.
- **Prediction verification (planned or in progress):** compare the predicted algorithm with the observed winner after running experiments.

## Benchmark functions

| Function | What it helps investigate |
|---|---|
| Sphere | Basic convergence on a smooth function with a single global minimum. |
| Rosenbrock | Optimisation through a narrow, curved valley. |
| Rastrigin | Search behaviour on a multimodal landscape with many local minima. |
| Himmelblau | Search behaviour on a function with multiple minima. |

These are controlled mathematical test problems. Strong performance on them does not by itself establish performance on every real-world optimisation problem.

## Optimisation algorithms

| Algorithm | General approach |
|---|---|
| Gradient Descent | Uses gradient information to update a candidate solution towards lower objective values. |
| Simulated Annealing | Uses stochastic search and can sometimes accept uphill moves to escape local minima. |
| Genetic Algorithm | Evolves a population of candidate solutions using selection, crossover and mutation. |

For fair comparisons, algorithms should use the same objective and comparable evaluation budgets. Repeated runs with different random seeds help measure reliability for stochastic algorithms.

## How it works

The core workflow is:

1. Select a benchmark function.
2. Configure the problem using the controls available in the application.
3. Run one or more optimisation algorithms.
4. Inspect the 3D landscape and convergence graphs.
5. Compare measured results.

The intended ML-enabled workflow extends this:

1. Collect results from previous experiments.
2. Prepare a dataset from measured outcomes.
3. Train a decision-tree classifier to predict which algorithm is likely to perform best for a problem configuration.
4. Request a prediction for a selected configuration.
5. Run the algorithms under comparable conditions.
6. Compare the predicted winner with the actual winner.
7. Review model evaluation metrics and the evidence supporting the recommendation.

## Machine-learning extension

The **Intelligent Algorithm Selector** is intended to learn from previous experiments and recommend an algorithm for a selected problem configuration.

### Potential inputs

Use features available at prediction time, such as:

- Benchmark function.
- Number of dimensions.
- Evaluation budget.
- Other problem characteristics that can be computed consistently during training and prediction.

### Training labels

For a minimisation task, a label can be derived from the algorithm with the lowest final objective value, provided candidates were evaluated under comparable conditions. When multiple random seeds are available, aggregate repeated runs using a documented statistic, such as the median, rather than relying on one unusually good run.

### Evaluation

Evaluate the model on held-out data and compare it with a simple baseline. Avoid splitting near-duplicate experiments from the same configuration across training and testing.

A small set of benchmark functions may limit generalisation. Performance on unseen runs of known functions is not the same as performance on entirely new functions. Decision-tree scores should not automatically be interpreted as calibrated probabilities of success.

If the ML extension is not implemented in the current checkout, add the training pipeline and API routes before treating it as an available feature.

## Technology

Known project components include:

- **Frontend:** Next.js, TypeScript and Tailwind CSS, as described for the project.
- **Visualisation:** Plotly.
- **Optimisation:** mathematical benchmark functions and the implemented optimisation algorithms.
- **Machine learning (intended):** Python and scikit-learn for a decision-tree model, if the backend uses Python.

Confirm actual dependencies and versions in the repository's dependency files. Exact versions and API routes are intentionally not assumed here.

## Getting started

The exact commands depend on the repository's current structure and scripts. Inspect the project files and use the commands defined there.

### 1. Prerequisites

Depending on the implementation, you may need Git, Node.js and npm (or the package manager specified by the lockfile), Python if the backend or ML pipeline uses Python, and a Python virtual environment.

Check the repository's dependency files for required versions.

### 2. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_REPOSITORY_DIRECTORY>
```

Replace the placeholders with your repository URL and directory name.

### 3. Install frontend dependencies

Move into the directory containing `package.json`. Use the package manager indicated by the lockfile. For npm:

```bash
npm install
npm run
```

The second command lists available scripts. Run the development script defined in `package.json`—commonly `npm run dev`—from the appropriate directory.

### 4. Install backend dependencies

If the backend uses Python, move into its directory and create a virtual environment:

```bash
python -m venv .venv
```

Activate it on macOS/Linux:

```bash
source .venv/bin/activate
```

On Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

If the repository contains `requirements.txt`, install dependencies with:

```bash
pip install -r requirements.txt
```

If it uses `pyproject.toml`, Poetry, uv or another dependency manager, follow the existing project configuration instead.

### 5. Configure environment variables

If an example environment file exists, copy it to the expected local environment filename and fill in the required values. Check the code and example configuration for actual variable names. Do not commit secrets or API keys.

### 6. Start the application

Start the backend and frontend in separate terminals using the commands defined by the repository. The correct backend command depends on its framework and entry point; do not assume it is FastAPI or Flask without checking.

Open the local URL printed by the frontend development server once both services are running.

## Training the decision tree

Use this section once the ML training pipeline exists.

1. Collect real experiment configurations and measured outcomes from the existing optimisation engine.
2. Validate the dataset for missing values, failed runs and incompatible experiment conditions.
3. Derive winner labels using a documented metric and comparable evaluation conditions.
4. Train the model using the project's training script.
5. Evaluate it on held-out data and compare it with a baseline.
6. Persist the fitted preprocessing pipeline and model together.
7. Start or reload the backend according to its model lifecycle.
8. Submit a valid prediction request and confirm the response comes from the trained model.
9. Run the existing algorithms and compare the observed winner with the prediction.

The actual training command and prediction endpoint must match the implementation in the repository. Do not assume a script name or API route that has not been created.

## Evaluation and scientific integrity

- Use comparable objectives and evaluation budgets.
- Repeat stochastic experiments with multiple seeds where possible.
- Report variability as well as best-case performance.
- Keep test data separate from training and model selection.
- Compare the model with a simple baseline.
- Clearly distinguish predictions from measured results.
- Report failed and unsupported experiments transparently.
- Never present illustrative or placeholder numbers as real results.

## Troubleshooting

**Frontend does not start**
- Confirm you are in the directory containing `package.json`.
- Install dependencies using the repository's package manager.
- Run `npm run` to inspect available scripts.
- Check the required Node.js version and terminal error.

**Backend does not start**
- Confirm the backend framework and entry point.
- Activate the correct environment if applicable.
- Install dependencies from the project's dependency file.
- Check required environment variables and port configuration.

**The model artifact is missing**
- Confirm the ML training pipeline has been implemented.
- Train the model using valid experiment data and the documented command.
- Confirm the artifact is saved where the backend expects it.
- Restart or reload the backend if required.

**Predictions appear unreliable**
- Check the number and diversity of experiment configurations.
- Verify labels are derived consistently from measured results.
- Check for data leakage and near-duplicate train/test examples.
- Compare with a baseline and inspect per-class metrics.
- Collect more experiments if the dataset is too small.

## Future improvements

Possible extensions include more benchmark functions, additional optimisation algorithms, automated experiment generation, decision-tree visualisation, reliability analysis across random seeds, performance heatmaps, experiment history, reproducible reports, and an AI experiment analyst grounded in actual metrics.

## Project summary

**Optimisation Arena is an interactive mathematical optimisation platform that compares algorithms on benchmark functions and aims to use historical experiment data to train an explainable decision tree that recommends algorithms and verifies those predictions through experiments.**







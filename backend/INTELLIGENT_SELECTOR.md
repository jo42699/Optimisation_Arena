# Intelligent Algorithm Selector

This feature adds a persisted, supervised `DecisionTreeClassifier` to the existing Optimisation Arena backend. It does not replace the experiment engine.

## Start and collect measured history

Use the existing backend virtual environment and install the updated requirements:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

The current local project uses port `8001` in `.env`; set `PORT` to another free port if necessary.

To collect training data and train the model:

```powershell
python train_model.py --collect
```

The collection command runs real Sphere, Rosenbrock, Rastrigin and Himmelblau experiments at three bounded budgets and two seeds. The labels come from the measured finite `best_score` values. OpenAI insights are skipped during collection to avoid unnecessary calls.

To train only from history already collected by normal experiment requests:

```powershell
python train_model.py
```

History is JSONL at `ML_HISTORY_PATH`; the joblib pipeline and JSON metadata are at `ML_MODEL_PATH` and `ML_METADATA_PATH`. These generated files are ignored by Git and disappear only if the configured storage is removed.

## API

```http
GET  /api/model/status
POST /api/model/train
POST /api/predict-algorithm
```

Train from existing history:

```json
{ "collect": false, "force": true }
```

Collect real runs first:

```json
{ "collect": true, "force": true }
```

Predict:

```json
{ "function": "rastrigin", "dimensions": 2, "budget": 300 }
```

The prediction includes the actual class prediction, leaf-frequency scores, model version, held-out evaluation metadata, tree split conditions, reached-leaf support and limitations. Scores are not calibrated probabilities.

## Training design

The features are the benchmark identifier, dimensionality and evaluation budget. Each comparable configuration is grouped by function, dimension, budget, bounds and algorithm parameter configuration. Repeated trials and separate persisted runs are aggregated with medians. The target is the algorithm with the lowest median finite `best_score` among execution-successful runs.

`GroupShuffleSplit` holds out whole configuration groups. A held-out accuracy is shown only if the test partition has enough samples and represents every observed winner class. The model is evaluated on known benchmark functions and does not claim generalisation to new functions. Current objective and optimiser implementations are two-dimensional; prediction requests for another dimension are rejected with HTTP 422.

If there is not enough history or there is only one observed winner class, training returns `insufficient_data` and no recommendation is produced. If the storage path is not writable, numerical experiments continue but the training status explains that persistence failed.

For a deployed environment, set `ML_TRAINING_TOKEN` and send it as `X-ML-Training-Token` to protect the retraining route. Prediction only loads artifacts from the server-configured path; users cannot supply a model file.

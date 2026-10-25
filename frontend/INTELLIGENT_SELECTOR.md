# Frontend selector workflow

The dashboard's **Intelligent Algorithm Selector** uses the configured backend URL from `NEXT_PUBLIC_API_BASE_URL`.

1. Start the backend and train it with `python train_model.py --collect`.
2. Start the frontend with `npm run dev`.
3. Choose a function, keep dimensions at `2`, enter an evaluation budget, and select **Predict Best Algorithm**.
4. Expand **Why this algorithm?** to see the fitted tree's actual split path and leaf support.
5. Press **Run Comparison** to invoke the existing `/api/experiments` route for all three algorithms under the current configuration.

The recommendation and measured winner are deliberately separate. A single comparison does not establish model accuracy. The model performance disclosure shows held-out metrics only when the backend has enough representative test data; it never substitutes a placeholder percentage.

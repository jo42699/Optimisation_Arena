"""Train the persisted selector from measured experiment history.

Examples:
    python train_model.py
    python train_model.py --collect
"""

import argparse

from app.config import get_settings
from app.services.algorithm_selector import collect_training_experiments, train_model


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Optimisation Arena's decision-tree algorithm selector")
    parser.add_argument("--collect", action="store_true", help="run a bounded matrix of real experiments before training")
    args = parser.parse_args()
    settings = get_settings()
    if args.collect:
        print(collect_training_experiments(settings))
    print(train_model(settings))


if __name__ == "__main__":
    main()

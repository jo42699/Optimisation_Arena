from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Optimisation Arena API"
    app_env: str = "development"
    host: str = "127.0.0.1"
    port: int = Field(default=8000, ge=1, le=65535)
    cors_origins: str = "http://localhost:3000"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_insights_enabled: bool = True
    default_landscape_resolution: int = Field(default=80, ge=10, le=150)
    max_landscape_resolution: int = Field(default=150, ge=10, le=250)
    max_iterations: int = Field(default=5000, ge=1, le=10000)
    max_repeated_trials: int = Field(default=50, ge=1, le=50)
    max_evaluations: int = Field(default=100000, ge=100, le=500000)
    max_trajectory_points: int = Field(default=5000, ge=10, le=20000)
    ml_history_path: str = "data/experiment_history.jsonl"
    ml_model_path: str = "data/algorithm_selector.joblib"
    ml_metadata_path: str = "data/algorithm_selector_metadata.json"
    ml_training_token: str = ""
    ml_min_training_groups: int = Field(default=4, ge=2, le=10000)
    ml_tree_max_depth: int = Field(default=4, ge=1, le=20)
    ml_tree_min_samples_leaf: int = Field(default=1, ge=1, le=100)
    ml_random_seed: int = Field(default=42, ge=-2_147_483_648, le=2_147_483_647)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

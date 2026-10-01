"""Start the local service using the project's private backend configuration."""

import os
from pathlib import Path

from dotenv import load_dotenv
import uvicorn

from stockia_ai.config import Settings


def main() -> None:
    load_dotenv(Path(__file__).resolve().parents[3] / "backend" / ".env")
    if os.getenv("AI_SERVICE_TOKEN"):
        os.environ.setdefault("STOCKIA_AI_SHARED_TOKEN", os.environ["AI_SERVICE_TOKEN"])
    settings = Settings.from_env()
    uvicorn.run("stockia_ai.app:app", host=settings.host, port=settings.port)


if __name__ == "__main__":
    main()

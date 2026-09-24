from dataclasses import dataclass
import os


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    host: str = "127.0.0.1"
    port: int = 8010
    max_image_bytes: int = 3_500_000
    max_image_pixels: int = 24_000_000
    min_image_edge: int = 96
    ocr_enabled: bool = True
    shared_token: str | None = None
    pipeline_version: str = "0.1.0"

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            host=os.getenv("STOCKIA_AI_HOST", "127.0.0.1"),
            port=int(os.getenv("STOCKIA_AI_PORT", "8010")),
            max_image_bytes=int(os.getenv("STOCKIA_AI_MAX_IMAGE_BYTES", "3500000")),
            max_image_pixels=int(os.getenv("STOCKIA_AI_MAX_IMAGE_PIXELS", "24000000")),
            min_image_edge=int(os.getenv("STOCKIA_AI_MIN_IMAGE_EDGE", "96")),
            ocr_enabled=_as_bool(os.getenv("STOCKIA_OCR_ENABLED"), True),
            shared_token=os.getenv("STOCKIA_AI_SHARED_TOKEN") or None,
            pipeline_version=os.getenv("STOCKIA_AI_PIPELINE_VERSION", "0.1.0"),
        )

from uuid import uuid4
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from stockia_ai import __version__
from stockia_ai.config import Settings
from stockia_ai.image_input import ImageInputError, SUPPORTED_MIME_TYPES
from stockia_ai.pipeline import RecognitionPipeline
from stockia_ai.request_guard import AnalyzeRequestGuard, MULTIPART_OVERHEAD_BYTES
from stockia_ai.schemas import AnalysisResponse


settings = Settings.from_env()
pipeline = RecognitionPipeline(settings)
api = FastAPI(title="StockIA Perception API", version=__version__)


@api.get("/healthz")
async def healthz():
    capabilities = pipeline.capabilities()
    ready = all(item.state == "ready" for item in capabilities.values())
    return {
        "status": "ready" if ready else "degraded",
        "version": __version__,
        "pipeline_version": settings.pipeline_version,
        "agents": {name: item.model_dump() for name, item in capabilities.items()},
    }


@api.post("/v1/analyze", response_model=AnalysisResponse)
async def analyze_image(
    image: Annotated[UploadFile, File()],
):
    mime_type = (image.content_type or "").split(";", 1)[0].strip().lower()
    if mime_type not in SUPPORTED_MIME_TYPES:
        raise HTTPException(status_code=415, detail="Solo se aceptan imágenes JPEG, PNG o WebP.")
    raw = await image.read(settings.max_image_bytes + 1)
    await image.close()
    if len(raw) > settings.max_image_bytes:
        raise HTTPException(status_code=413, detail="La imagen supera el tamaño máximo permitido.")
    try:
        return await run_in_threadpool(pipeline.analyze, raw, mime_type, uuid4().hex)
    except ImageInputError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


app = AnalyzeRequestGuard(
    api,
    max_body_bytes=settings.max_image_bytes + MULTIPART_OVERHEAD_BYTES,
    shared_token=settings.shared_token,
)

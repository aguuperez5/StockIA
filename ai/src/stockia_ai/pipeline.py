from time import perf_counter

from stockia_ai.adapters.paddle_ocr import PaddleOcrReader
from stockia_ai.adapters.zxing_cpp import ZxingCppReader
from stockia_ai.agents.barcode import BarcodeAgent
from stockia_ai.agents.consensus import ConsensusAgent
from stockia_ai.agents.ocr import OcrAgent
from stockia_ai.agents.quality import ImageQualityAgent
from stockia_ai.config import Settings
from stockia_ai.image_input import decode_image
from stockia_ai.schemas import (
    AgentCapability,
    AnalysisResponse,
    Consensus,
    QualityAssessment,
)


class RecognitionPipeline:
    def __init__(
        self,
        settings: Settings | None = None,
        *,
        barcode_reader=None,
        ocr_reader=None,
    ) -> None:
        self.settings = settings or Settings.from_env()
        self.quality_agent = ImageQualityAgent(self.settings.min_image_edge)
        self.barcode_agent = BarcodeAgent(barcode_reader or ZxingCppReader())
        self.ocr_agent = OcrAgent(ocr_reader or PaddleOcrReader(), enabled=self.settings.ocr_enabled)
        self.consensus_agent = ConsensusAgent()

    def capabilities(self) -> dict[str, AgentCapability]:
        return {
            "image_quality": AgentCapability(state="ready", detail="OpenCV"),
            "barcode": AgentCapability(
                state="ready" if self.barcode_agent.available else "degraded",
                detail="zxing-cpp" if self.barcode_agent.available else "zxing-cpp no instalado",
            ),
            "ocr": AgentCapability(
                state=("ready" if self.ocr_agent.available else "disabled" if not self.settings.ocr_enabled else "degraded"),
                detail="PaddleOCR" if self.ocr_agent.available else "PaddleOCR/PaddlePaddle no disponible",
            ),
            "consensus": AgentCapability(state="ready", detail="reglas deterministas; sin escritura de inventario"),
        }

    def analyze(self, raw: bytes, mime_type: str, request_id: str) -> AnalysisResponse:
        timings: dict[str, float] = {}
        warnings: list[str] = []
        started = perf_counter()
        image = decode_image(
            raw,
            mime_type,
            max_bytes=self.settings.max_image_bytes,
            max_pixels=self.settings.max_image_pixels,
        )
        timings["decode"] = round((perf_counter() - started) * 1000, 2)

        step_started = perf_counter()
        quality = self.quality_agent.analyze(image)
        timings["quality"] = round((perf_counter() - step_started) * 1000, 2)
        if not quality.usable:
            warnings.extend(quality.warnings)
            return AnalysisResponse(
                request_id=request_id,
                pipeline_version=self.settings.pipeline_version,
                status="low_quality",
                quality=quality,
                consensus=Consensus(status="no_detection", warnings=["image_too_small"]),
                agents=self.capabilities(),
                timings_ms=timings,
                warnings=warnings,
            )

        step_started = perf_counter()
        barcode_evidence, barcode_warnings = self.barcode_agent.analyze(image)
        timings["barcode"] = round((perf_counter() - step_started) * 1000, 2)
        warnings.extend(barcode_warnings)

        # Always try independent OCR when configured: a valid checksum alone
        # cannot prove that a noisy barcode was decoded correctly.
        step_started = perf_counter()
        text_evidence, ocr_evidence, ocr_warnings = self.ocr_agent.analyze(image)
        timings["ocr"] = round((perf_counter() - step_started) * 1000, 2)
        warnings.extend(ocr_warnings)

        identifiers = barcode_evidence + ocr_evidence
        consensus = self.consensus_agent.analyze(identifiers)
        warnings.extend(quality.warnings)
        warnings.extend(consensus.warnings)
        return AnalysisResponse(
            request_id=request_id,
            pipeline_version=self.settings.pipeline_version,
            status=consensus.status,
            quality=quality,
            identifiers=identifiers,
            text_evidence=text_evidence,
            consensus=consensus,
            agents=self.capabilities(),
            timings_ms=timings,
            warnings=sorted(set(warnings)),
        )

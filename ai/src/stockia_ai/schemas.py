from typing import Literal

from pydantic import BaseModel, Field


class QualityAssessment(BaseModel):
    width: int
    height: int
    brightness_mean: float
    sharpness_variance: float
    usable: bool
    warnings: list[str] = Field(default_factory=list)


class IdentifierEvidence(BaseModel):
    value: str
    format: str
    source: Literal["barcode", "ocr"]
    checksum_valid: bool
    score: float | None = None


class TextEvidence(BaseModel):
    text: str
    score: float | None = None


class Consensus(BaseModel):
    status: Literal["corroborated", "needs_review", "ambiguous", "no_detection"]
    candidate_values: list[str] = Field(default_factory=list)
    corroborated_values: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class AgentCapability(BaseModel):
    state: Literal["ready", "degraded", "disabled"]
    detail: str


class AnalysisResponse(BaseModel):
    request_id: str
    pipeline_version: str
    status: Literal["corroborated", "needs_review", "ambiguous", "no_detection", "low_quality"]
    quality: QualityAssessment
    identifiers: list[IdentifierEvidence] = Field(default_factory=list)
    text_evidence: list[TextEvidence] = Field(default_factory=list)
    consensus: Consensus
    agents: dict[str, AgentCapability]
    timings_ms: dict[str, float] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)

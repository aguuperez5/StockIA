import re
from typing import Protocol

import numpy as np

from stockia_ai.agents.gtin import classify_gtin, normalize_gtin
from stockia_ai.schemas import IdentifierEvidence, TextEvidence


class OcrReader(Protocol):
    @property
    def available(self) -> bool: ...

    def __call__(self, image: np.ndarray) -> list[tuple[str, float | None]]: ...


_GTIN_LIKE = re.compile(r"(?<![A-Z0-9])(?:[0-9OQDILZSB][\s.-]?){7,13}[0-9OQDILZSB](?![A-Z0-9])", re.IGNORECASE)
_OCR_CONFUSABLES = str.maketrans({"O": "0", "Q": "0", "D": "0", "I": "1", "L": "1", "Z": "2", "S": "5", "B": "8"})


class OcrAgent:
    def __init__(self, reader: OcrReader, *, enabled: bool = True) -> None:
        self.reader = reader
        self.enabled = enabled

    @property
    def available(self) -> bool:
        return self.enabled and self.reader.available

    def analyze(
        self, image: np.ndarray
    ) -> tuple[list[TextEvidence], list[IdentifierEvidence], list[str]]:
        if not self.enabled:
            return [], [], ["ocr_disabled"]
        if not self.reader.available:
            return [], [], ["ocr_engine_unavailable"]
        try:
            raw_lines = self.reader(image)
        except Exception:
            return [], [], ["ocr_inference_failed"]

        lines: list[TextEvidence] = []
        identifiers: list[IdentifierEvidence] = []
        seen: set[str] = set()
        for raw_text, raw_score in raw_lines:
            text = str(raw_text).strip()
            if not text:
                continue
            score = None if raw_score is None else min(1.0, max(0.0, float(raw_score)))
            lines.append(TextEvidence(text=text[:160], score=score))
            for match in _GTIN_LIKE.finditer(text.upper()):
                value = normalize_gtin(match.group().translate(_OCR_CONFUSABLES))
                if value in seen:
                    continue
                seen.add(value)
                format_name, valid = classify_gtin(value)
                if format_name != "unknown":
                    identifiers.append(
                        IdentifierEvidence(
                            value=value,
                            format=format_name,
                            source="ocr",
                            checksum_valid=valid,
                            score=score,
                        )
                    )
        return lines, identifiers, []

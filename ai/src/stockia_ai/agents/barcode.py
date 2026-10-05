from typing import Protocol
import re

import numpy as np

from stockia_ai.agents.gtin import classify_gtin, normalize_gtin
from stockia_ai.schemas import IdentifierEvidence


class BarcodeReader(Protocol):
    @property
    def available(self) -> bool: ...

    def __call__(self, image: np.ndarray) -> list[tuple[str, str]]: ...


class BarcodeAgent:
    def __init__(self, reader: BarcodeReader) -> None:
        self.reader = reader

    @property
    def available(self) -> bool:
        return self.reader.available

    def analyze(self, image: np.ndarray) -> tuple[list[IdentifierEvidence], list[str]]:
        if not self.available:
            return [], ["barcode_engine_unavailable"]
        try:
            raw_codes = self.reader(image)
        except Exception:
            return [], ["barcode_inference_failed"]

        evidence: list[IdentifierEvidence] = []
        counts: dict[tuple[str, str], int] = {}
        first_seen: list[tuple[str, str]] = []
        for raw_value, symbology in raw_codes:
            value = normalize_gtin(raw_value)
            if not value:
                continue
            key = (value, symbology)
            if key not in counts:
                counts[key] = 0
                first_seen.append(key)
            counts[key] += 1

        for value, symbology in first_seen:
            count = counts[(value, symbology)]
            symbol_key = re.sub(r"[^A-Z0-9]", "", str(symbology).upper().rsplit(".", 1)[-1])
            expected_format = {
                "EAN13": "EAN-13",
                "EAN8": "EAN-8",
                "UPCA": "UPC-A",
                "ITF": "GTIN-14",
                "ITF14": "GTIN-14",
            }.get(symbol_key)
            detected_format, checksum_valid = classify_gtin(value)
            valid = bool(expected_format and expected_format == detected_format and checksum_valid)
            format_name = expected_format or str(symbology)
            evidence.append(
                IdentifierEvidence(
                    value=value,
                    format=format_name if format_name != "unknown" else symbology,
                    source="barcode",
                    checksum_valid=valid,
                    occurrences=count,
                    quantity=count,
                )
            )
        return evidence, []

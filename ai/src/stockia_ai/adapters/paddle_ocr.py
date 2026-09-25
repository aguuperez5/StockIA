from importlib.util import find_spec
import json
from threading import Lock

import numpy as np


class PaddleOcrReader:
    def __init__(self) -> None:
        self._engine = None
        self._lock = Lock()

    @property
    def available(self) -> bool:
        return find_spec("paddleocr") is not None and find_spec("paddle") is not None

    def _load(self):
        if self._engine is None:
            from paddleocr import PaddleOCR

            self._engine = PaddleOCR(
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,
            )
        return self._engine

    def __call__(self, image: np.ndarray) -> list[tuple[str, float | None]]:
        with self._lock:
            results = self._load().predict(image)
        lines: list[tuple[str, float | None]] = []
        for result in results:
            payload = getattr(result, "json", result)
            if callable(payload):
                payload = payload()
            if isinstance(payload, str):
                payload = json.loads(payload)
            if not isinstance(payload, dict):
                continue
            payload = payload.get("res", payload)
            texts = payload.get("rec_texts", [])
            scores = payload.get("rec_scores", [])
            for index, text in enumerate(texts):
                score = scores[index] if index < len(scores) else None
                lines.append((str(text), None if score is None else float(score)))
        return lines

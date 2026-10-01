"""Offline CPU OCR with bundled models; retain PaddleOCR as an alternative."""

from importlib.util import find_spec
from threading import Lock

import numpy as np

from stockia_ai.adapters.paddle_ocr import PaddleOcrReader


class RapidOcrReader:
    name = "RapidOCR / ONNX Runtime CPU"

    def __init__(self) -> None:
        self._engine = None
        self._lock = Lock()

    @property
    def available(self) -> bool:
        return find_spec("rapidocr_onnxruntime") is not None and find_spec("onnxruntime") is not None

    def __call__(self, image: np.ndarray) -> list[tuple[str, float | None]]:
        with self._lock:
            if self._engine is None:
                from rapidocr_onnxruntime import RapidOCR

                self._engine = RapidOCR(intra_op_num_threads=2, inter_op_num_threads=1)
            results, _timings = self._engine(image)
        return [(str(text), float(score)) for _box, text, score in (results or [])]


def default_ocr_reader():
    rapid = RapidOcrReader()
    return rapid if rapid.available else PaddleOcrReader()

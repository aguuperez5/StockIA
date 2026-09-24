import cv2
import numpy as np

from stockia_ai.schemas import QualityAssessment


class ImageQualityAgent:
    """Cheap image diagnostics; only unusably small images are gated."""

    def __init__(self, min_edge: int = 96) -> None:
        self.min_edge = min_edge

    def analyze(self, image: np.ndarray) -> QualityAssessment:
        height, width = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        brightness = float(np.mean(gray))
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        warnings: list[str] = []
        if min(width, height) < self.min_edge:
            warnings.append("low_resolution")
        if brightness < 30:
            warnings.append("underexposed")
        elif brightness > 245:
            warnings.append("overexposed")
        if sharpness < 20:
            warnings.append("possible_blur")

        return QualityAssessment(
            width=width,
            height=height,
            brightness_mean=round(brightness, 2),
            sharpness_variance=round(sharpness, 2),
            usable=min(width, height) >= self.min_edge,
            warnings=warnings,
        )

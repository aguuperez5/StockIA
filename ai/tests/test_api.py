import unittest

import cv2
import numpy as np
from fastapi.testclient import TestClient

from stockia_ai.app import app, settings
from stockia_ai.request_guard import AnalyzeRequestGuard, MULTIPART_OVERHEAD_BYTES


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_reports_agent_readiness_without_loading_models(self):
        response = self.client.get("/healthz")
        self.assertEqual(response.status_code, 200)
        self.assertIn(response.json()["status"], {"ready", "degraded"})
        self.assertIn("barcode", response.json()["agents"])
        self.assertIn("ocr", response.json()["agents"])

    def test_rejects_non_image_mime_before_inference(self):
        response = self.client.post(
            "/v1/analyze",
            files={"image": ("document.txt", b"not-an-image", "text/plain")},
        )
        self.assertEqual(response.status_code, 415)

    def test_rejects_corrupt_image_payload(self):
        response = self.client.post(
            "/v1/analyze",
            files={"image": ("broken.jpg", b"not-a-jpeg", "image/jpeg")},
        )
        self.assertEqual(response.status_code, 400)

    def test_rejects_oversized_multipart_body_before_image_parsing(self):
        oversized = b"x" * (settings.max_image_bytes + MULTIPART_OVERHEAD_BYTES + 1)
        response = self.client.post(
            "/v1/analyze",
            files={"image": ("oversized.jpg", oversized, "image/jpeg")},
        )
        self.assertEqual(response.status_code, 413)

    def test_shared_token_is_checked_before_multipart_parsing(self):
        protected = AnalyzeRequestGuard(
            app,
            max_body_bytes=settings.max_image_bytes + MULTIPART_OVERHEAD_BYTES,
            shared_token="local-test-secret",
        )
        response = TestClient(protected).post(
            "/v1/analyze",
            files={"image": ("broken.jpg", b"not-an-image", "image/jpeg")},
            headers={"authorization": "Bearer wrong-secret"},
        )
        self.assertEqual(response.status_code, 401)

    def test_valid_image_returns_evidence_contract_without_persisting_photo(self):
        image = np.full((180, 240, 3), 255, dtype=np.uint8)
        ok, encoded = cv2.imencode(".jpg", image)
        self.assertTrue(ok)
        response = self.client.post(
            "/v1/analyze",
            files={"image": ("capture.jpg", encoded.tobytes(), "image/jpeg")},
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["status"], "no_detection")
        self.assertTrue(payload["request_id"])
        self.assertNotIn("photoData", payload)
        self.assertIn("quality", payload)


if __name__ == "__main__":
    unittest.main()

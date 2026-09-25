import unittest

import numpy as np

from stockia_ai.agents.consensus import ConsensusAgent
from stockia_ai.agents.barcode import BarcodeAgent
from stockia_ai.agents.gtin import classify_gtin
from stockia_ai.agents.ocr import OcrAgent
from stockia_ai.config import Settings
from stockia_ai.pipeline import RecognitionPipeline
from stockia_ai.schemas import IdentifierEvidence


class FakeOcrReader:
    available = True

    def __call__(self, _image):
        return [("7791000000109", 0.98), ("Válvula esférica", 0.91)]


class FakeBarcodeReader:
    available = True

    def __init__(self, values):
        self.values = values

    def __call__(self, _image):
        return self.values


class AgentTests(unittest.TestCase):
    def test_gtin_checksum_validation(self):
        self.assertEqual(classify_gtin("7791000000109"), ("EAN-13", True))
        self.assertEqual(classify_gtin("4006381333931"), ("EAN-13", True))
        self.assertEqual(classify_gtin("7791000000100"), ("EAN-13", False))
        self.assertEqual(classify_gtin("1234567"), ("unknown", False))

    def test_ocr_extracts_text_and_checksum_valid_identifier(self):
        agent = OcrAgent(FakeOcrReader())
        lines, identifiers, warnings = agent.analyze(np.zeros((100, 100, 3), dtype=np.uint8))
        self.assertEqual(warnings, [])
        self.assertEqual([line.text for line in lines], ["7791000000109", "Válvula esférica"])
        self.assertEqual([(item.value, item.checksum_valid) for item in identifiers], [("7791000000109", True)])

    def test_consensus_requires_independent_evidence_for_corroboration(self):
        agent = ConsensusAgent()
        barcode = IdentifierEvidence(value="7791000000109", format="EAN-13", source="barcode", checksum_valid=True)
        ocr = IdentifierEvidence(value="7791000000109", format="EAN-13", source="ocr", checksum_valid=True, score=0.98)
        conflict = IdentifierEvidence(value="7791000000116", format="EAN-13", source="ocr", checksum_valid=True, score=0.8)
        self.assertEqual(agent.analyze([barcode]).status, "needs_review")
        self.assertEqual(agent.analyze([barcode, ocr]).status, "corroborated")
        self.assertEqual(agent.analyze([barcode, conflict]).status, "ambiguous")

    def test_non_retail_qr_payload_is_not_treated_as_a_gtin(self):
        agent = BarcodeAgent(FakeBarcodeReader([("4006381333931", "QRCode")]))
        evidence, warnings = agent.analyze(np.zeros((100, 100, 3), dtype=np.uint8))
        self.assertEqual(warnings, [])
        self.assertEqual(evidence[0].checksum_valid, False)

    def test_pipeline_reconciles_independent_readers_and_returns_timings(self):
        import cv2

        image = np.random.default_rng(7).integers(0, 255, (160, 240, 3), dtype=np.uint8)
        ok, encoded = cv2.imencode(".jpg", image)
        self.assertTrue(ok)
        pipeline = RecognitionPipeline(
            Settings(ocr_enabled=True),
            barcode_reader=FakeBarcodeReader([("7791000000109", "EAN-13")]),
            ocr_reader=FakeOcrReader(),
        )
        result = pipeline.analyze(encoded.tobytes(), "image/jpeg", "test-request")
        self.assertEqual(result.status, "corroborated")
        self.assertEqual(result.consensus.corroborated_values, ["7791000000109"])
        self.assertIn("barcode", result.timings_ms)
        self.assertIn("ocr", result.timings_ms)


if __name__ == "__main__":
    unittest.main()

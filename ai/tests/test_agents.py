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

    def test_matching_ocr_does_not_hide_a_second_barcode(self):
        identifiers = [
            IdentifierEvidence(value="7791000000109", format="EAN-13", source="barcode", checksum_valid=True),
            IdentifierEvidence(value="7791000000116", format="EAN-13", source="barcode", checksum_valid=True),
            IdentifierEvidence(value="7791000000109", format="EAN-13", source="ocr", checksum_valid=True),
        ]
        result = ConsensusAgent().analyze(identifiers)
        self.assertEqual(result.status, "ambiguous")
        self.assertEqual(result.candidate_values, ["7791000000109", "7791000000116"])

    def test_upc_and_zero_padded_ean_are_independent_matching_reads(self):
        result = ConsensusAgent().analyze([
            IdentifierEvidence(value="0042100005264", format="EAN-13", source="barcode", checksum_valid=True),
            IdentifierEvidence(value="042100005264", format="UPC-A", source="ocr", checksum_valid=True),
        ])
        self.assertEqual(result.status, "corroborated")
        self.assertEqual(result.corroborated_values, ["0042100005264"])

    def test_real_decoder_reads_short_labels_instead_of_rejecting_them(self):
        from io import BytesIO
        from PIL import Image
        import zxingcpp

        barcode = np.asarray(zxingcpp.write_barcode(zxingcpp.BarcodeFormat.EAN13, "7790070410115", width=600))
        image = Image.fromarray(barcode).resize((barcode.shape[1], 65), Image.Resampling.NEAREST)
        raw = BytesIO()
        image.save(raw, format="PNG")
        result = RecognitionPipeline(Settings(ocr_enabled=False)).analyze(raw.getvalue(), "image/png", "short-label")
        self.assertFalse(result.quality.usable)
        self.assertEqual(result.consensus.candidate_values, ["7790070410115"])
        self.assertEqual(result.status, "needs_review")

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
        self.assertEqual(result.consensus.quantities.get("7791000000109"), 1)
        self.assertIn("barcode", result.timings_ms)
        self.assertIn("ocr", result.timings_ms)

    def test_barcode_counts_multiple_appearances(self):
        # Dos lecturas del mismo código en posiciones distintas
        agent = BarcodeAgent(FakeBarcodeReader([
            ("7791000000109", "EAN-13"),
            ("7791000000109", "EAN-13"),
            ("7791000000116", "EAN-13"),
        ]))
        evidence, warnings = agent.analyze(np.zeros((100, 100, 3), dtype=np.uint8))
        self.assertEqual(warnings, [])
        counts = {item.value: item.occurrences for item in evidence}
        self.assertEqual(counts["7791000000109"], 2)
        self.assertEqual(counts["7791000000116"], 1)

    def test_consensus_avoids_double_counting_with_corroborated_ocr(self):
        # 1 barcode + 1 OCR del mismo código -> cantidad 1 (el OCR corrobora, no duplica)
        agent = ConsensusAgent()
        barcode = IdentifierEvidence(value="7791000000109", format="EAN-13", source="barcode", checksum_valid=True, occurrences=1)
        ocr = IdentifierEvidence(value="7791000000109", format="EAN-13", source="ocr", checksum_valid=True, score=0.98, occurrences=1)
        result = agent.analyze([barcode, ocr])
        self.assertEqual(result.status, "corroborated")
        self.assertEqual(result.quantities.get("7791000000109"), 1)

    def test_consensus_counts_multiple_barcodes_with_single_ocr(self):
        # 2 barcodes + 1 OCR -> cantidad 2
        agent = ConsensusAgent()
        barcode = IdentifierEvidence(value="7791000000109", format="EAN-13", source="barcode", checksum_valid=True, occurrences=2)
        ocr = IdentifierEvidence(value="7791000000109", format="EAN-13", source="ocr", checksum_valid=True, score=0.98, occurrences=1)
        result = agent.analyze([barcode, ocr])
        self.assertEqual(result.status, "corroborated")
        self.assertEqual(result.quantities.get("7791000000109"), 2)

    def test_consensus_counts_distinct_ocr_reads_when_no_barcode(self):
        # Solo OCR con 2 lecturas distintas del mismo código -> cantidad 2
        agent = ConsensusAgent()
        ocr = IdentifierEvidence(value="7791000000109", format="EAN-13", source="ocr", checksum_valid=True, occurrences=2)
        result = agent.analyze([ocr])
        self.assertEqual(result.status, "needs_review")
        self.assertEqual(result.quantities.get("7791000000109"), 2)


if __name__ == "__main__":
    unittest.main()

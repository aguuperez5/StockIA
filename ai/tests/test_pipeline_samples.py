import unittest
from pathlib import Path

from stockia_ai.config import Settings
from stockia_ai.pipeline import RecognitionPipeline
class MockOcrReader:
    name = "MockOcrReader"

    def __init__(self, detected_text: str = "3017620422003"):
        self.detected_text = detected_text

    @property
    def available(self) -> bool:
        return True

    def __call__(self, image):
        return [(self.detected_text, 0.98)]


class PipelineSamplesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.samples_dir = (
            Path(__file__).resolve().parents[1] / "samples" / "openfoodfacts"
        )
        cls.pipeline = RecognitionPipeline(Settings(ocr_enabled=True))

    def _read_sample(self, filename: str) -> bytes:
        file_path = self.samples_dir / filename
        self.assertTrue(file_path.exists(), f"Sample file not found: {filename}")
        return file_path.read_bytes()

    def test_direct_barcode_detection_claro(self):
        """Detección directa por código de barras con imagen nítida (-claro)."""
        data = self._read_sample("3017620422003-claro.png")
        analysis = self.pipeline.analyze(data, "image/png", "test-claro")
        gtins = [i.value for i in analysis.identifiers if i.checksum_valid]
        self.assertIn("3017620422003", gtins)
        self.assertIn(analysis.status, {"matched", "needs_review", "corroborated"})

    def test_direct_barcode_detection_contraste(self):
        """Detección directa por código de barras con contraste variado (-contraste)."""
        data = self._read_sample("3017620422003-contraste.png")
        analysis = self.pipeline.analyze(data, "image/png", "test-contraste")
        gtins = [i.value for i in analysis.identifiers if i.checksum_valid]
        self.assertIn("3017620422003", gtins)

    def test_rotated_barcode_detection_girado(self):
        """Detección de código de barras rotado (-girado)."""
        data = self._read_sample("3017620422003-girado.png")
        analysis = self.pipeline.analyze(data, "image/png", "test-girado")
        gtins = [i.value for i in analysis.identifiers if i.checksum_valid]
        self.assertIn("3017620422003", gtins)

    def test_multiple_barcodes_detection_varios_codigos(self):
        """Detección de múltiples códigos en una misma captura ('varios-codigos')."""
        data = self._read_sample("varios-codigos.png")
        analysis = self.pipeline.analyze(data, "image/png", "test-varios")
        gtins = sorted({i.value for i in analysis.identifiers if i.checksum_valid})
        self.assertEqual(len(gtins), 3)
        self.assertEqual(
            gtins, ["3017620422003", "3274080005003", "5449000000996"]
        )
        self.assertEqual(analysis.status, "ambiguous")

    def test_rejection_sin_codigo(self):
        """Rechazo o no detección cuando la imagen no contiene códigos legibles ('sin-codigo')."""
        data = self._read_sample("sin-codigo.png")
        analysis = self.pipeline.analyze(data, "image/png", "test-sin-codigo")
        valid_gtins = [i.value for i in analysis.identifiers if i.checksum_valid]
        self.assertEqual(len(valid_gtins), 0)
        self.assertEqual(analysis.status, "no_detection")

    def test_ocr_fallback_with_injected_reader_solo_numeros(self):
        """Fallback OCR con lector inyectado en imagen con solo números impresos (-solo-numeros)."""
        injected_pipeline = RecognitionPipeline(
            Settings(ocr_enabled=True),
            ocr_reader=MockOcrReader("3017620422003"),
        )
        data = self._read_sample("3017620422003-solo-numeros.png")
        analysis = injected_pipeline.analyze(data, "image/png", "test-ocr-fallback")

        gtins = [i.value for i in analysis.identifiers if i.checksum_valid]
        self.assertIn("3017620422003", gtins)
        ocr_identifiers = [i for i in analysis.identifiers if i.source == "ocr"]
        self.assertGreaterEqual(len(ocr_identifiers), 1)

    def test_ocr_fallback_with_real_ocr_solo_numeros(self):
        """Prueba con OCR real instalable (marcado para omitirse si el motor local no está presente)."""
        if not self.pipeline.ocr_agent.available:
            self.skipTest(
                "Motor OCR local (PaddleOCR) no disponible en este entorno. "
                "Requiere STOCKIA_INSTALL_OCR=true."
            )
        data = self._read_sample("3017620422003-solo-numeros.png")
        analysis = self.pipeline.analyze(data, "image/png", "test-ocr-real")
        gtins = [i.value for i in analysis.identifiers if i.checksum_valid]
        self.assertIn("3017620422003", gtins)


if __name__ == "__main__":
    unittest.main()

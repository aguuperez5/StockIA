"""Download PNG barcode labels with human-readable numbers for manual tests."""

from datetime import datetime, timezone
from io import BytesIO
import json
from pathlib import Path
import ssl
from urllib.parse import urlencode
from urllib.request import urlopen

import certifi
import numpy as np
from PIL import Image

from stockia_ai.adapters.zxing_cpp import ZxingCppReader
from stockia_ai.agents.barcode import BarcodeAgent
from stockia_ai.agents.gtin import classify_gtin


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "ai" / "samples" / "openfoodfacts" / "etiquetas_descargadas"
TLS = ssl.create_default_context(cafile=certifi.where())


def fixture_products():
    path = OUTPUT.parent / "products.json"
    if not path.is_file():
        raise SystemExit("Ejecutá npm run samples:ai para descargar productos de Open Food Facts primero.")
    products = json.loads(path.read_text(encoding="utf-8"))["products"]
    return [product for product in products if classify_gtin(product["barcode"])[1]]


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    reader = BarcodeAgent(ZxingCppReader())
    for product in fixture_products():
        code = product["barcode"]
        options = {
            "bcid": {"EAN-8": "ean8", "UPC-A": "upca", "EAN-13": "ean13", "GTIN-14": "interleaved2of5"}[classify_gtin(code)[0]],
            "text": code,
            "scale": 3,
            "height": 25,
            "includetext": "",
            "textsize": 14,
            "textyoffset": -18,
            "textxalign": "center",
            "paddingwidth": 12,
            "paddingheight": 8,
            "backgroundcolor": "FFFFFF",
        }
        url = "https://bwipjs-api.metafloor.com/?" + urlencode(options)
        with urlopen(url, context=TLS, timeout=25) as response:
            if response.headers.get_content_type() != "image/png":
                raise ValueError("El generador no devolvió un PNG.")
            raw = response.read()
        with Image.open(BytesIO(raw)) as image:
            evidence, warnings = reader.analyze(np.asarray(image.convert("RGB"))[:, :, ::-1].copy())
        actual = {item.value for item in evidence if item.checksum_valid}
        if actual != {code}:
            raise ValueError(f"La etiqueta descargada no coincide con {code}: {sorted(actual)}, {warnings}")
        filename = f"{code}.png"
        (OUTPUT / filename).write_bytes(raw)
        manifest.append({
            "sample_id": code,
            "image": filename,
            "expected_gtins": [code],
            "source": "downloaded_generated_label",
            "source_url": url,
            "identifier_source": "openfoodfacts_api",
            "product_url": product["product_url"],
            "variant": "barcode_with_printed_number",
            "split": "regression",
        })
        print(f"Descargado y verificado: {filename}")
    (OUTPUT / "manifest.jsonl").write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in manifest),
        encoding="utf-8",
    )
    (OUTPUT / "download.json").write_text(json.dumps({
        "downloaded_at": datetime.now(timezone.utc).isoformat(),
        "count": len(manifest),
        "generator": "bwip-js public API",
        "note": "Etiquetas generadas y descargadas de bwip-js; identificadores de Open Food Facts. No son fotos de envases.",
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(manifest)} códigos distintos, con números debajo, en {OUTPUT}")


if __name__ == "__main__":
    main()

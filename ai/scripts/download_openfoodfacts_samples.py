"""Download Open Food Facts identifiers and generate labels with numbers below.

Public read-only API, no API key. Labels are synthetic, not packaging photos.
"""

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import ssl
from urllib.error import HTTPError
from urllib.parse import urlencode, urlsplit
from time import sleep
from urllib.request import Request, urlopen

import certifi
from dotenv import load_dotenv
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import zxingcpp

from stockia_ai.agents.gtin import classify_gtin


ROOT = Path(__file__).resolve().parents[2]
TLS = ssl.create_default_context(cafile=certifi.where())


DEFAULT_CODES = ["3017620422003", "5449000000996", "3274080005003"]


def fetch_products(codes):
    load_dotenv(ROOT / "backend" / ".env")
    base = os.getenv("OPENFOODFACTS_BASE_URL", "https://world.openfoodfacts.org").rstrip("/")
    headers = {
        "User-Agent": os.getenv("OPENFOODFACTS_USER_AGENT", "StockIA/1.0 (local development)"),
        "Accept": "application/json",
    }
    if urlsplit(base).hostname == "world.openfoodfacts.net":
        headers["Authorization"] = "Basic b2ZmOm9mZg=="
    products = []
    for index, code in enumerate(codes):
        if index:
            sleep(5)  # Below OFF's 15 product reads/min/IP; other processes also share the IP.
        url = base + f"/api/v3.6/product/{code}.json?" + urlencode({
            "fields": "code,product_name,product_name_es,product_name_en,brands", "lc": "es",
        })
        try:
            with urlopen(Request(url, headers=headers), context=TLS, timeout=25) as response:
                data = json.load(response)
        except HTTPError as error:
            print(f"Open Food Facts: HTTP {error.code} para {code}.")
            if error.code in (429, 503):
                raise SystemExit("Proveedor limitado/no disponible. Reintentá más tarde.")
            continue
        product = data.get("product", {})
        returned_code = str(product.get("code") or "")
        if data.get("status") != "success" or data.get("result", {}).get("id") != "product_found":
            print(f"Sin producto confirmado para {code}.")
            continue
        if not classify_gtin(returned_code)[1] or returned_code.zfill(14) != code.zfill(14):
            raise ValueError("El proveedor devolvió otro identificador.")
        products.append({
            "barcode": code,
            "name": product.get("product_name_es") or product.get("product_name") or product.get("product_name_en") or None,
            "brand": product.get("brands") or None,
            "source": "openfoodfacts_api",
            "source_url": url,
            "product_url": f"https://world.openfoodfacts.org/product/{returned_code}",
        })
        print(f"Descargado: {code}")
    return products


def make_images(output, products):
    manifest = []
    labels = []
    try:
        font = ImageFont.truetype("arial.ttf", 34)
    except OSError:
        font = ImageFont.load_default(size=34)

    def save(name, image, codes, kind):
        image.save(output / name, **({"quality": 82} if name.endswith(".jpg") else {}))
        manifest.append({
            "sample_id": Path(name).stem,
            "image": name,
            "expected_gtins": codes,
            "split": "regression",
            "source": "synthetic_from_openfoodfacts_identifier",
            "variant": kind,
        })

    for product in products:
        code = product["barcode"]
        symbol = {"EAN-8": zxingcpp.BarcodeFormat.EAN8, "UPC-A": zxingcpp.BarcodeFormat.UPCA, "EAN-13": zxingcpp.BarcodeFormat.EAN13, "GTIN-14": zxingcpp.BarcodeFormat.ITF}[classify_gtin(code)[0]]
        bars = Image.fromarray(np.asarray(zxingcpp.write_barcode(symbol, code, width=600)))
        bars = bars.resize((bars.width, 190), Image.Resampling.NEAREST)
        label = Image.new("RGB", (bars.width + 48, 270), "white")
        label.paste(bars, (24, 20))
        ImageDraw.Draw(label).text((label.width // 2, 224), code, fill="black", font=font, anchor="mt")
        labels.append(label)
        save(f"{code}-claro.png", label, [code], "clear")
        save(f"{code}-girado.png", label.rotate(13, expand=True, fillcolor="white"), [code], "rotated")
        save(f"{code}-contraste.png", label.point(lambda x: 150 + x * 45 // 255), [code], "low_contrast")
        save(f"{code}-bajo.png", bars.resize((bars.width, 65), Image.Resampling.NEAREST), [code], "short_label")
        save(f"{code}-camara.jpg", label.resize((label.width // 2, 135), Image.Resampling.LANCZOS), [code], "jpeg_camera")
        digits = Image.new("RGB", (label.width, 150), "white")
        ImageDraw.Draw(digits).text((digits.width // 2, 55), code, fill="black", font=font, anchor="mt")
        save(f"{code}-solo-numeros.png", digits, [code], "ocr_only")
    save("sin-codigo.png", Image.new("RGB", (500, 200), "white"), [], "negative")
    if len(labels) > 1:
        multiple = Image.new("RGB", (max(label.width for label in labels), sum(label.height for label in labels)), "white")
        offset = 0
        for label in labels:
            multiple.paste(label, (0, offset))
            offset += label.height
        save("varios-codigos.png", multiple, [p["barcode"] for p in products], "multiple")
    (output / "manifest.jsonl").write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in manifest), encoding="utf-8")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int)
    parser.add_argument("--codes", nargs="+", help="GTINs válidos a consultar (máximo 6)")
    parser.add_argument("--output", type=Path, default=ROOT / "ai" / "samples" / "openfoodfacts")
    args = parser.parse_args()
    codes = list(dict.fromkeys(args.codes or DEFAULT_CODES))
    count = args.count if args.count is not None else len(codes)
    if not 1 <= len(codes) <= 6 or not 1 <= count <= len(codes):
        parser.error("Se requieren entre 1 y 6 códigos, y --count no puede excederlos")
    if any(not classify_gtin(code)[1] for code in codes):
        parser.error("Todos los códigos deben ser GTIN válidos")
    products = fetch_products(codes[:count])
    if not products:
        raise SystemExit("Open Food Facts no devolvió productos con GTIN válidos.")
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "products.json").write_text(json.dumps({"downloaded_at": datetime.now(timezone.utc).isoformat(), "license": "ODbL 1.0 / Database Contents License", "products": products}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest = make_images(args.output, products)
    print(f"Guardados {len(products)} códigos de Open Food Facts y {len(manifest)} imágenes en {args.output}")


if __name__ == "__main__":
    main()

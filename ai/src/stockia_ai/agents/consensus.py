from stockia_ai.schemas import Consensus, IdentifierEvidence


class ConsensusAgent:
    """Reconciles independent reads; never turns a checksum into certainty.

    Regla para evitar doble conteo:
    - Cada barcode decodificado en una posición distinta de la imagen cuenta como 1 unidad.
    - La lectura OCR del número impreso de una etiqueta cuyo barcode ya se leyó NO suma otra unidad (corrobora GTIN pero no duplica).
    - Si solo hay OCR para ese código, cuenta 1 por cada lectura distinta.
    """

    def analyze(self, identifiers: list[IdentifierEvidence]) -> Consensus:
        barcodes = {}
        barcode_counts = {}
        for item in identifiers:
            if item.source == "barcode" and item.checksum_valid:
                key = item.value.zfill(14)
                barcodes[key] = item.value
                qty = getattr(item, "occurrences", None) or getattr(item, "quantity", 1) or 1
                barcode_counts[key] = barcode_counts.get(key, 0) + qty

        ocr_codes = {}
        ocr_counts = {}
        for item in identifiers:
            if item.source == "ocr" and item.checksum_valid:
                key = item.value.zfill(14)
                ocr_codes[key] = item.value
                qty = getattr(item, "occurrences", None) or getattr(item, "quantity", 1) or 1
                ocr_counts[key] = ocr_counts.get(key, 0) + qty

        # Different zero-padded representations of a GTIN are equivalent.
        values = {**ocr_codes, **barcodes}
        shared = sorted(values[key] for key in barcodes.keys() & ocr_codes.keys())

        # Conteo con regla anti-doble conteo
        quantities = {}
        for key, display_val in values.items():
            b_qty = barcode_counts.get(key, 0)
            o_qty = ocr_counts.get(key, 0)
            if b_qty > 0:
                # El barcode físico determina la cantidad; el OCR actúa como corroboración
                qty = b_qty
            else:
                # Solo OCR presente
                qty = o_qty
            quantities[display_val] = qty
            quantities[key] = qty

        if len(values) > 1:
            status = "ambiguous"
            candidates = sorted(values.values())
        elif shared:
            status = "corroborated"
            candidates = shared
        elif barcodes or ocr_codes:
            status = "needs_review"
            candidates = sorted(values.values())
        else:
            status = "no_detection"
            candidates = []

        warnings = []
        if status == "ambiguous":
            warnings.append("conflicting_or_multiple_identifiers")
        elif status == "needs_review":
            warnings.append("identifier_not_independently_corroborated")
        return Consensus(
            status=status,
            candidate_values=candidates,
            corroborated_values=shared,
            quantities=quantities,
            warnings=warnings,
        )

from stockia_ai.schemas import Consensus, IdentifierEvidence


class ConsensusAgent:
    """Reconciles independent reads; never turns a checksum into certainty."""

    def analyze(self, identifiers: list[IdentifierEvidence]) -> Consensus:
        barcodes = {
            item.value.zfill(14): item.value for item in identifiers
            if item.source == "barcode" and item.checksum_valid
        }
        ocr_codes = {
            item.value.zfill(14): item.value for item in identifiers
            if item.source == "ocr" and item.checksum_valid
        }
        # Different zero-padded representations of a GTIN are equivalent.
        values = {**ocr_codes, **barcodes}
        shared = sorted(values[key] for key in barcodes.keys() & ocr_codes.keys())

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
            warnings=warnings,
        )

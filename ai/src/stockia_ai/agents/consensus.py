from stockia_ai.schemas import Consensus, IdentifierEvidence


class ConsensusAgent:
    """Reconciles independent reads; never turns a checksum into certainty."""

    def analyze(self, identifiers: list[IdentifierEvidence]) -> Consensus:
        barcodes = {
            item.value for item in identifiers
            if item.source == "barcode" and item.checksum_valid
        }
        ocr_codes = {
            item.value for item in identifiers
            if item.source == "ocr" and item.checksum_valid
        }
        shared = sorted(barcodes & ocr_codes)

        if shared:
            status = "corroborated"
            candidates = shared
        elif len(barcodes) > 1 or len(ocr_codes) > 1 or (barcodes and ocr_codes):
            status = "ambiguous"
            candidates = sorted(barcodes | ocr_codes)
        elif barcodes or ocr_codes:
            status = "needs_review"
            candidates = sorted(barcodes | ocr_codes)
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

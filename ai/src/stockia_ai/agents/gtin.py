import re


GTIN_FORMATS = {8: "EAN-8", 12: "UPC-A", 13: "EAN-13", 14: "GTIN-14"}


def normalize_gtin(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def classify_gtin(value: str) -> tuple[str, bool]:
    code = normalize_gtin(value)
    format_name = GTIN_FORMATS.get(len(code), "unknown")
    if format_name == "unknown":
        return format_name, False

    digits = [int(digit) for digit in code]
    payload = digits[:-1]
    weighted_sum = sum(
        digit * (3 if offset % 2 == 0 else 1)
        for offset, digit in enumerate(reversed(payload))
    )
    check_digit = (10 - weighted_sum % 10) % 10
    return format_name, check_digit == digits[-1]

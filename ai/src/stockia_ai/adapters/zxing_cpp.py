from importlib.util import find_spec

import numpy as np


class ZxingCppReader:
    @property
    def available(self) -> bool:
        return find_spec("zxingcpp") is not None

    def __call__(self, image: np.ndarray) -> list[tuple[str, str]]:
        import zxingcpp

        results = zxingcpp.read_barcodes(image)
        values = []
        for result in results:
            text = str(getattr(result, "text", "") or "")
            symbology = str(getattr(result, "format", "unknown")).rsplit(".", 1)[-1]
            if text:
                values.append((text, symbology))
        return values

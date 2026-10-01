"""Check every downloaded/generated sample against the real perception pipeline."""

import argparse
import json
from pathlib import Path
from time import perf_counter

from stockia_ai.config import Settings
from stockia_ai.pipeline import RecognitionPipeline


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", type=Path, default=Path(__file__).resolve().parents[1] / "samples" / "openfoodfacts")
    args = parser.parse_args()
    pipeline = RecognitionPipeline(Settings.from_env())
    results = []
    for line in (args.directory / "manifest.jsonl").read_text(encoding="utf-8").splitlines():
        sample = json.loads(line)
        path = args.directory / sample["image"]
        started = perf_counter()
        analysis = pipeline.analyze(path.read_bytes(), "image/jpeg" if path.suffix == ".jpg" else "image/png", sample["sample_id"])
        actual = sorted({item.value for item in analysis.identifiers if item.checksum_valid})
        expected = sorted(sample["expected_gtins"])
        passed = actual == expected and (len(expected) <= 1 or analysis.status == "ambiguous")
        results.append({"image": path.name, "expected": expected, "actual": actual, "status": analysis.status, "passed": passed, "elapsed_ms": round((perf_counter() - started) * 1000, 2), "warnings": analysis.warnings})
        print(f"{'OK' if passed else 'FAIL'} {path.name}: {analysis.status}, {actual}")
    report = {"pipeline_version": pipeline.settings.pipeline_version, "agents": {name: capability.model_dump() for name, capability in pipeline.capabilities().items()}, "passed": sum(row["passed"] for row in results), "total": len(results), "results": results, "scope": "Synthetic regression fixtures; not a real-world accuracy estimate."}
    (args.directory / "evaluation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{report['passed']}/{report['total']} muestras correctas")
    raise SystemExit(0 if all(row["passed"] for row in results) else 1)


if __name__ == "__main__":
    main()

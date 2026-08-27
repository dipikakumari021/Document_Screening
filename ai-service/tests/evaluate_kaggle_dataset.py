"""
evaluate_kaggle_dataset.py
---------------------------
Benchmarks the OCR module against the TrainingDataPro "OCR GENERATED
Machine-Readable Zone (MRZ) Text Detection" dataset (Kaggle / Hugging Face,
CC-BY-NC-ND-4.0), instead of just the one hand-built synthetic image.

IMPORTANT — what this dataset does and doesn't test:
This dataset's ground-truth MRZ strings are synthetically generated for
OCR/text-detection benchmarking — they are NOT checksum-valid ICAO 9303
documents (dates like "300030" aren't even real calendar dates). So this
script does NOT re-test checksum validation logic (that's already proven
correct by tests/test_ocr_pipeline.py, which uses a *properly* checksummed
synthetic passport). What this script DOES test, which the single
hand-built image can't: raw character-level OCR read accuracy across many
different names, countries, and rendering variations — i.e. "how good is
Tesseract at actually reading MRZ pixels," independent of the parsing
logic downstream of it.

Expected dataset layout (matches the HF/Kaggle mirror as of Aug 2026):

    <dataset_dir>/
      images/
        0.png
        1.png
        ...
      annotations.xml   <- CVAT-format, one <image> per file, two
                            <box label="text"><attribute name="text">
                            entries per image (MRZ line 1, line 2)

Usage:
    python3 tests/evaluate_kaggle_dataset.py --dataset-dir tests/kaggle_mrz_dataset
"""

import argparse
import base64
import csv
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from mrz_parser import _clean_line  # noqa: E402
from ocr_module import extract_raw_mrz_lines  # noqa: E402


def load_ground_truth(annotations_path: Path) -> dict:
    """
    Parses the CVAT-format annotations.xml into
    {image_relative_path: [line1_text, line2_text]}.
    """
    tree = ET.parse(annotations_path)
    root = tree.getroot()
    ground_truth = {}
    for image_el in root.findall("image"):
        name = image_el.get("name")
        boxes = []
        for box in image_el.findall("box"):
            attr = box.find("attribute[@name='text']")
            if attr is not None and attr.text:
                # Sort by vertical position (ytl), NOT XML element order — verified
                # against this dataset that <box> elements are not always listed
                # top-to-bottom (e.g. images/10.png has the passport-number line
                # listed before the name line), which would silently swap line1
                # and line2 if we trusted document order.
                boxes.append((float(box.get("ytl", 0)), attr.text))
        boxes.sort(key=lambda b: b[0])
        if len(boxes) >= 2:
            ground_truth[name] = [b[1] for b in boxes[:2]]
    return ground_truth


def char_accuracy(pred: str, truth: str) -> float:
    """Positional character accuracy on two equal-length (44-char) strings."""
    if not truth:
        return 0.0
    matches = sum(1 for a, b in zip(pred, truth) if a == b)
    return matches / len(truth)


def levenshtein(a: str, b: str) -> int:
    """Small pure-python edit distance — fine at 44 chars, no extra dependency."""
    if a == b:
        return 0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        curr = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1):
            curr[j] = min(
                prev[j] + 1,        # deletion
                curr[j - 1] + 1,    # insertion
                prev[j - 1] + (ca != cb),  # substitution
            )
        prev = curr
    return prev[-1]


def evaluate(dataset_dir: Path) -> None:
    images_dir = dataset_dir / "images"
    annotations_path = dataset_dir / "annotations.xml"

    if not annotations_path.exists():
        print(f"ERROR: {annotations_path} not found. Expected the CVAT-format "
              f"annotations.xml that ships with the TrainingDataPro dataset.")
        sys.exit(1)
    if not images_dir.exists():
        print(f"ERROR: {images_dir} not found.")
        sys.exit(1)

    ground_truth = load_ground_truth(annotations_path)
    if not ground_truth:
        print("ERROR: No ground-truth entries parsed from annotations.xml — "
              "check the file matches the expected CVAT format.")
        sys.exit(1)

    print(f"Loaded ground truth for {len(ground_truth)} images.\n")

    rows = []
    for image_name, (gt_line1, gt_line2) in sorted(ground_truth.items()):
        image_path = dataset_dir / image_name
        if not image_path.exists():
            print(f"  SKIP (missing file): {image_name}")
            continue

        with open(image_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")

        try:
            pred_lines = extract_raw_mrz_lines(b64)
        except Exception as exc:  # noqa: BLE001
            print(f"  SKIP (OCR error on {image_name}): {exc}")
            continue

        pred1 = pred_lines[0] if len(pred_lines) > 0 else "<" * 44
        pred2 = pred_lines[1] if len(pred_lines) > 1 else "<" * 44
        gt1 = _clean_line(gt_line1)
        gt2 = _clean_line(gt_line2)

        acc1 = char_accuracy(pred1, gt1)
        acc2 = char_accuracy(pred2, gt2)
        dist1 = levenshtein(pred1, gt1)
        dist2 = levenshtein(pred2, gt2)

        rows.append({
            "image": image_name,
            "line1_char_accuracy": round(acc1, 4),
            "line2_char_accuracy": round(acc2, 4),
            "line1_edit_distance": dist1,
            "line2_edit_distance": dist2,
            "line1_exact_match": pred1 == gt1,
            "line2_exact_match": pred2 == gt2,
            "predicted_line1": pred1,
            "predicted_line2": pred2,
            "ground_truth_line1": gt1,
            "ground_truth_line2": gt2,
        })
        status = "OK " if (pred1 == gt1 and pred2 == gt2) else "ERR"
        print(f"  [{status}] {image_name}  line1_acc={acc1:.2f}  line2_acc={acc2:.2f}")

    if not rows:
        print("\nNo images evaluated — nothing to report.")
        return

    out_csv = dataset_dir / "benchmark_results.csv"
    with open(out_csv, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    n = len(rows)
    mean_acc = sum(r["line1_char_accuracy"] + r["line2_char_accuracy"] for r in rows) / (2 * n)
    exact_match_rate = sum(1 for r in rows if r["line1_exact_match"] and r["line2_exact_match"]) / n

    print("\n" + "=" * 60)
    print(f"BENCHMARK SUMMARY  ({n} images from TrainingDataPro MRZ dataset)")
    print("=" * 60)
    print(f"Mean character-level accuracy:  {mean_acc * 100:.1f}%")
    print(f"Exact both-line match rate:      {exact_match_rate * 100:.1f}%")
    print(f"Full per-image results written to: {out_csv}")
    print("\nNote: this dataset's ground truth is not checksum-valid MRZ, so it")
    print("benchmarks raw OCR read accuracy only — checksum validation is proven")
    print("separately by tests/test_ocr_pipeline.py against a properly")
    print("checksummed synthetic passport.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Benchmark OCR module against a Kaggle/HF MRZ dataset.")
    parser.add_argument(
        "--dataset-dir",
        type=str,
        default=str(Path(__file__).parent / "kaggle_mrz_dataset"),
        help="Path to the extracted dataset folder (containing images/ and annotations.xml)",
    )
    args = parser.parse_args()
    evaluate(Path(args.dataset_dir))

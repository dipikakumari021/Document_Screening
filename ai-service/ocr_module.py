"""
ocr_module.py
-------------
The OCR component of the AI screening service (this is the module you
own end-to-end for the SIH build).

Pipeline:
  1. Decode the incoming image (base64 -> numpy/OpenCV image).
  2. Preprocess for OCR (grayscale, denoise, threshold, upscale).
  3. Run Tesseract twice:
       a. On the bottom strip of the passport (the MRZ band) with a
          restricted character whitelist -> feeds mrz_parser.py, which
          does field extraction + checksum validation.
       b. On the full image / top portion (the "visual inspection zone")
          with normal settings -> gives us printed name text to cross-
          check against the MRZ name (printed_vs_mrz_match).
  4. Merge everything into the exact response contract the team agreed
     on, so the Node backend can consume it without any changes:

     {
       "name": str, "passport_no": str, "dob": str, "expiry": str,
       "nationality": str, "confidence": float,
       "mrz": {"parsed_fields": {...}, "valid_checksum": bool},
       "printed_vs_mrz_match": bool
     }

No business logic (risk scoring, DB checks) lives here — that's the
Node backend's job. This module only ever answers "what does the
document say, and do we trust the read."
"""

import base64
import re
from difflib import SequenceMatcher
from io import BytesIO

import cv2
import numpy as np
import pytesseract
from PIL import Image

from mrz_parser import parse_td3_mrz

# ---------------------------------------------------------------------
# Image decoding / preprocessing
# ---------------------------------------------------------------------

def decode_base64_image(b64_string: str) -> np.ndarray:
    """Accepts a raw base64 string or a data URI (data:image/...;base64,...)."""
    if "," in b64_string and b64_string.strip().startswith("data:"):
        b64_string = b64_string.split(",", 1)[1]
    img_bytes = base64.b64decode(b64_string)
    pil_img = Image.open(BytesIO(img_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def _preprocess(gray: np.ndarray, upscale: float = 2.0) -> np.ndarray:
    """Standard OCR preprocessing: upscale, denoise, adaptive threshold."""
    if upscale != 1.0:
        gray = cv2.resize(gray, None, fx=upscale, fy=upscale, interpolation=cv2.INTER_CUBIC)
    gray = cv2.bilateralFilter(gray, 9, 75, 75)
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15
    )
    return thresh


def _crop_mrz_band(img: np.ndarray) -> np.ndarray:
    """MRZ sits in the bottom ~25% of a standard passport bio-data page."""
    h, w = img.shape[:2]
    top = int(h * 0.72)
    return img[top:h, 0:w]


def _is_mrz_only_crop(img: np.ndarray) -> bool:
    """
    Detects images that are ALREADY a tight crop of just the two MRZ lines
    (e.g. the TrainingDataPro benchmark dataset ships 700x200 MRZ-only
    strips, not full passport photos). A full passport bio-data page is
    roughly 1.3-1.6:1 (portrait-ish scan/photo); an MRZ-only strip is very
    wide and short, so a simple aspect-ratio threshold tells them apart
    without needing a separate code path the caller has to know about.
    """
    h, w = img.shape[:2]
    return (w / h) > 2.2


# ---------------------------------------------------------------------
# Tesseract calls
# ---------------------------------------------------------------------

_MRZ_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<"


def _find_text_row_band(gray: np.ndarray, dark_threshold: int = 180, pad: int = 4) -> tuple:
    """
    Returns (top, bottom) rows bounding where actual text sits, instead of
    assuming it fills the crop. MRZ crops aren't always tightly bounded —
    the TrainingDataPro benchmark dataset, for example, ships 700x200
    images where both MRZ lines sit in the top ~43% with blank space below
    — so blindly splitting the full crop 50/50 can cut into whitespace and
    lose a whole line. Row-wise dark-pixel density finds where the text
    actually is first.
    """
    h = gray.shape[0]
    dark_pixel_counts = (gray < dark_threshold).sum(axis=1)
    text_rows = np.nonzero(dark_pixel_counts > 0)[0]
    if len(text_rows) == 0:
        return 0, h
    top = max(0, int(text_rows.min()) - pad)
    bottom = min(h, int(text_rows.max()) + pad)
    return top, bottom


def _ocr_mrz_band(mrz_img: np.ndarray) -> tuple:
    """
    Runs Tesseract restricted to the MRZ charset.

    MRZ lines have no spaces, so Tesseract sees each line as a single
    ~44-character "word" — running both lines together under --psm 6
    (block-of-text mode) confuses its line/word segmentation and drops
    trailing characters. Splitting into the two known lines and OCR'ing
    each with --psm 7 (treat image as a single text line) is dramatically
    more reliable, empirically confirmed against synthetic MRZ renders.

    Returns (text, mean_word_confidence 0-1).
    """
    gray = cv2.cvtColor(mrz_img, cv2.COLOR_BGR2GRAY)
    text_top, text_bottom = _find_text_row_band(gray)
    text_region = gray[text_top:text_bottom, :]
    mid = text_region.shape[0] // 2
    halves = [text_region[0:mid, :], text_region[mid:, :]]

    config = f'--psm 7 -c tessedit_char_whitelist="{_MRZ_WHITELIST}" --oem 3'

    lines = []
    confidences = []
    for half in halves:
        upscaled = cv2.resize(half, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        text = pytesseract.image_to_string(upscaled, config=config).strip()
        lines.append(text)

        data = pytesseract.image_to_data(upscaled, config=config, output_type=pytesseract.Output.DICT)
        line_confs = [int(c) for c in data["conf"] if c not in ("-1", -1)]
        if line_confs:
            confidences.append(sum(line_confs) / len(line_confs) / 100.0)

    combined_text = "\n".join(lines)
    mean_conf = sum(confidences) / len(confidences) if confidences else 0.0
    return combined_text, mean_conf


def _ocr_visual_zone(img: np.ndarray) -> str:
    """General OCR pass over the printed (non-MRZ) portion of the document."""
    h = img.shape[0]
    visual_zone = img[0 : int(h * 0.72), :]
    gray = cv2.cvtColor(visual_zone, cv2.COLOR_BGR2GRAY)
    processed = _preprocess(gray, upscale=2.0)
    return pytesseract.image_to_string(processed, config="--psm 6 --oem 3")


# ---------------------------------------------------------------------
# Printed-vs-MRZ name cross-check
# ---------------------------------------------------------------------

def _name_similarity(a: str, b: str) -> float:
    a = re.sub(r"[^A-Z ]", "", a.upper())
    b = re.sub(r"[^A-Z ]", "", b.upper())
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def _printed_matches_mrz(visual_text: str, mrz_surname: str, mrz_given: str) -> bool:
    """
    Fuzzy-matches the MRZ name against whatever text we found in the visual
    zone. Passport printing/fonts vary a lot, so we use a similarity
    threshold rather than an exact match, and check surname + given names
    independently (order on the printed page differs from MRZ order).
    """
    if not mrz_surname and not mrz_given:
        return False
    visual_upper = re.sub(r"[^A-Z\n ]", " ", visual_text.upper())
    best_surname = max(
        (_name_similarity(mrz_surname, line) for line in visual_upper.splitlines() if line.strip()),
        default=0.0,
    )
    best_given = max(
        (_name_similarity(mrz_given, line) for line in visual_upper.splitlines() if line.strip()),
        default=0.0,
    )
    return best_surname > 0.6 or best_given > 0.6


# ---------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------

def extract_raw_mrz_lines(passport_image_b64: str) -> list:
    """
    Lower-level entry point used by the benchmark script (tests/evaluate_kaggle_dataset.py)
    to compare RAW OCR output against ground-truth MRZ text character-for-character.

    run_ocr() feeds OCR output through parse_td3_mrz(), which cleans/pads/
    truncates and rejects fields that don't form valid calendar dates or
    checksums — appropriate for real documents, but it would hide the raw
    OCR read quality when benchmarking against a dataset whose ground-truth
    strings aren't real checksum-valid MRZs (see README's "Kaggle benchmark"
    section). This function returns the two OCR'd lines with no such
    downstream interpretation, cleaned to 44 chars the same way the parser
    does so the comparison is apples-to-apples.
    """
    from mrz_parser import _clean_line  # local import: internal helper, benchmark-only use

    img = decode_base64_image(passport_image_b64)
    mrz_band = img if _is_mrz_only_crop(img) else _crop_mrz_band(img)
    raw_text, _ = _ocr_mrz_band(mrz_band)
    lines = [l for l in raw_text.splitlines() if l.strip()]
    return [_clean_line(l) for l in lines[:2]]


def run_ocr(passport_image_b64: str) -> dict:
    """
    Main function called by main.py (and, in the merged /analyze endpoint,
    by whoever wires the three modules together).

    Returns a dict matching the team's agreed OCR contract exactly.
    """
    img = decode_base64_image(passport_image_b64)
    mrz_only_input = _is_mrz_only_crop(img)

    mrz_band = img if mrz_only_input else _crop_mrz_band(img)
    mrz_text, mrz_word_confidence = _ocr_mrz_band(mrz_band)
    mrz_result = parse_td3_mrz(mrz_text)

    fields = mrz_result.get("parsed_fields", {})
    full_name = " ".join(filter(None, [fields.get("given_names"), fields.get("surname")])).strip()

    printed_vs_mrz = False
    if mrz_result.get("found") and not mrz_only_input:
        # Only meaningful when the input is a full document photo with a
        # visual/printed zone above the MRZ. An MRZ-only crop (e.g. the
        # benchmark dataset) has no visual zone to cross-check against.
        visual_text = _ocr_visual_zone(img)
        printed_vs_mrz = _printed_matches_mrz(
            visual_text, fields.get("surname", ""), fields.get("given_names", "")
        )

    # Tesseract's per-word confidence is noisy on MRZ lines (they're one long
    # unspaced "word" with no dictionary to lean on), so we blend it with the
    # ICAO checksum result — which is a much stronger correctness signal —
    # rather than reporting the raw OCR engine confidence on its own.
    if not mrz_result.get("found"):
        overall_confidence = 0.0
    else:
        checksum_component = 1.0 if mrz_result.get("valid_checksum") else 0.3
        overall_confidence = 0.4 * mrz_word_confidence + 0.6 * checksum_component

    return {
        "name": full_name or None,
        "passport_no": fields.get("passport_no"),
        "dob": fields.get("dob"),
        "expiry": fields.get("expiry"),
        "nationality": fields.get("nationality"),
        "confidence": round(overall_confidence, 3),
        "mrz": {
            "parsed_fields": fields,
            "valid_checksum": mrz_result.get("valid_checksum", False),
            "field_checks": mrz_result.get("field_checks", {}),
            "mrz_found": mrz_result.get("found", False),
            "raw_lines": mrz_result.get("raw_lines", []),
        },
        "printed_vs_mrz_match": printed_vs_mrz,
    }

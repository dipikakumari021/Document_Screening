"""
test_ocr_pipeline.py
---------------------
Two layers of tests:

1. test_mrz_parser_unit_* — pure logic tests on mrz_parser.py using
   hand-built MRZ strings (no image, no OCR — fast, deterministic).
2. test_full_pipeline_on_synthetic_image — generates a synthetic
   passport PNG, base64-encodes it, and runs it through the REAL
   run_ocr() function (image decode -> preprocess -> Tesseract ->
   MRZ parse), asserting the output matches what we rendered.

Run with:  python3 tests/test_ocr_pipeline.py
"""

import base64
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from mrz_parser import compute_check_digit, parse_td3_mrz  # noqa: E402
from ocr_module import run_ocr  # noqa: E402
from tests.generate_synthetic_passport import build_mrz_lines, render_passport_image  # noqa: E402


def test_check_digit_known_value():
    # Classic ICAO 9303 worked example: "520727" -> check digit 3
    assert compute_check_digit("520727") == 3
    print("PASS: compute_check_digit known-value test")


def test_mrz_parser_unit_valid():
    line1, line2 = build_mrz_lines(
        surname="SHARMA", given_names="RAHUL", passport_no="R1234567",
        nationality="IND", dob_yymmdd="990814", sex="M", expiry_yymmdd="300814",
    )
    raw_text = line1 + "\n" + line2
    result = parse_td3_mrz(raw_text)
    assert result["found"] is True
    assert result["valid_checksum"] is True, result["field_checks"]
    assert result["parsed_fields"]["passport_no"] == "R1234567"
    assert result["parsed_fields"]["surname"] == "SHARMA"
    assert result["parsed_fields"]["given_names"] == "RAHUL"
    assert result["parsed_fields"]["nationality"] == "IND"
    assert result["parsed_fields"]["dob"] == "1999-08-14"
    assert result["parsed_fields"]["expiry"] == "2030-08-14"
    print("PASS: MRZ parser unit test (valid document)")


def test_mrz_parser_unit_tampered_checksum():
    line1, line2 = build_mrz_lines(
        surname="SHARMA", given_names="RAHUL", passport_no="R1234567",
        nationality="IND", dob_yymmdd="990814", sex="M", expiry_yymmdd="300814",
    )
    # Simulate tampering: flip a digit in the passport number field but
    # leave the check digit as-is -> checksum should now fail.
    tampered_line2 = "R7234567" + line2[8:]
    raw_text = line1 + "\n" + tampered_line2
    result = parse_td3_mrz(raw_text)
    assert result["found"] is True
    assert result["valid_checksum"] is False
    assert result["field_checks"]["passport_no"] is False
    print("PASS: MRZ parser detects tampered checksum")


def test_full_pipeline_on_synthetic_image():
    out_path = Path(__file__).parent / "synthetic_passport.png"
    meta = render_passport_image(
        str(out_path),
        surname="SHARMA", given_names="RAHUL", passport_no="R1234567",
        nationality="IND", dob_yymmdd="990814", sex="M", expiry_yymmdd="300814",
    )

    with open(out_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")

    result = run_ocr(b64)

    print("Full pipeline OCR output:")
    for k, v in result.items():
        print(f"  {k}: {v}")

    assert result["passport_no"] == meta["passport_no"], (
        f"Expected passport_no {meta['passport_no']!r}, got {result['passport_no']!r}"
    )
    assert result["nationality"] == meta["nationality"]
    assert result["mrz"]["valid_checksum"] is True, result["mrz"]["field_checks"]
    assert result["confidence"] > 0.0
    print("PASS: full pipeline end-to-end on synthetic image")


if __name__ == "__main__":
    test_check_digit_known_value()
    test_mrz_parser_unit_valid()
    test_mrz_parser_unit_tampered_checksum()
    test_full_pipeline_on_synthetic_image()
    print("\nALL TESTS PASSED")

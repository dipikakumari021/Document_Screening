"""
mrz_parser.py
-------------
Parses the Machine Readable Zone (MRZ) of a TD3-format passport
(2 lines x 44 characters — the ICAO 9303 standard used by nearly all
passport booklets) and validates it using the official check-digit
algorithm.

This module has NO dependency on OCR — it takes raw text (already
extracted by Tesseract) and turns it into structured, validated
fields. Keeping it separate means we can unit-test the parsing logic
with fake/synthetic MRZ strings, independent of image quality.

TD3 layout (44 chars per line):

Line 1: P<CCCSURNAME<<GIVEN<NAMES<<<<<<<<<<<<<<<<<<<<<<<<<<<<
        │││└─┬─┘└──────────┬───────────────────────────────┘
        │││  │             └ Name (surname << given names, < = space/filler)
        │││  └ Issuing country (3 letters)
        ││└ Document type filler
        │└ Document type ('P' = passport)

Line 2: PASSNO<CHK CCC YYMMDD CHK SEX YYMMDD CHK <<<<<<<<<<<< CHK
        └─┬──┘     └┬┘ └──┬──┘     └┬┘ └──┬──┘     └────┬────┘
      passport no  nat.  DOB           expiry      personal no
      +check digit       +check digit  +check digit  (+ its own check,
                                                        often unused)
      followed by a final COMPOSITE check digit over the whole line.
"""

import re
from datetime import datetime
from typing import Optional

MRZ_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<"

# ICAO 9303 check-digit weighting sequence, cycles 7,3,1,7,3,1,...
_WEIGHTS = [7, 3, 1]


def _char_value(c: str) -> int:
    """Maps a MRZ character to its numeric value for checksum purposes."""
    if c == "<":
        return 0
    if c.isdigit():
        return int(c)
    if c.isalpha():
        return ord(c.upper()) - ord("A") + 10
    return 0


def compute_check_digit(data: str) -> int:
    """Computes the ICAO 9303 check digit for a string of MRZ data."""
    total = 0
    for i, c in enumerate(data):
        total += _char_value(c) * _WEIGHTS[i % 3]
    return total % 10


def _verify(data: str, check_char: str) -> bool:
    if check_char == "<" or not check_char.isdigit():
        # Some issuers put '<' where a field (e.g. personal number) is unused.
        return data.strip("<") == ""
    return compute_check_digit(data) == int(check_char)


def _clean_line(line: str) -> str:
    """Uppercases, strips whitespace OCR sometimes injects, pads/truncates to 44."""
    line = re.sub(r"[^A-Za-z0-9<]", "", line.upper())
    line = line.ljust(44, "<")[:44]
    return line


def _parse_mrz_date(yy_mm_dd: str) -> Optional[str]:
    """
    MRZ dates are YYMMDD with a 2-digit year. Passport numbers (DOB) can be
    any year in the past; expiry is generally within ~10-15 years of issue.
    We use a simple pivot: 00-30 -> 2000-2030, 31-99 -> 1931-1999.
    This is a heuristic — good enough for a screening demo, and the officer
    always sees the raw extracted value too.
    """
    if len(yy_mm_dd) != 6 or not yy_mm_dd.isdigit():
        return None
    yy, mm, dd = yy_mm_dd[0:2], yy_mm_dd[2:4], yy_mm_dd[4:6]
    pivot_year = int(yy) + (2000 if int(yy) <= 30 else 1900)
    try:
        return datetime(pivot_year, int(mm), int(dd)).strftime("%Y-%m-%d")
    except ValueError:
        return None


def find_mrz_lines(raw_text: str) -> Optional[list]:
    """
    Scans OCR'd text for the two MRZ lines. We look for lines that are
    long (near 44 chars after cleaning) and dominated by the MRZ charset
    (lots of '<' fillers and uppercase letters/digits) — this is what
    distinguishes MRZ lines from the rest of the printed passport text.
    """
    candidates = []
    for raw_line in raw_text.splitlines():
        cleaned = re.sub(r"[^A-Za-z0-9<]", "", raw_line.upper())
        if len(cleaned) < 30:
            continue
        mrz_chars = sum(1 for c in cleaned if c in MRZ_CHARSET)
        if mrz_chars / len(cleaned) < 0.85:
            continue
        candidates.append(_clean_line(cleaned))

    if len(candidates) < 2:
        return None

    # Line 1 always starts with 'P' (document type) for a passport booklet.
    for i in range(len(candidates) - 1):
        if candidates[i].startswith("P"):
            return [candidates[i], candidates[i + 1]]

    # Fallback: just take the last two long candidate lines (bottom of image).
    return candidates[-2:]


def parse_td3_mrz(raw_text: str) -> dict:
    """
    Main entry point. Takes raw OCR text (may contain the whole passport,
    not just the MRZ) and returns a structured, checksum-validated result.
    """
    lines = find_mrz_lines(raw_text)
    if not lines:
        return {
            "found": False,
            "parsed_fields": {},
            "valid_checksum": False,
            "raw_lines": [],
        }

    line1, line2 = lines

    # ---- Line 1: document type, issuing country, name ----
    doc_type = line1[0:2].replace("<", "")
    issuing_country = line1[2:5].replace("<", "")
    name_field = line1[5:44]
    surname, _, given = name_field.partition("<<")
    surname = surname.replace("<", " ").strip()
    given_names = given.replace("<", " ").strip()

    # ---- Line 2: passport no, nationality, DOB, sex, expiry, personal no ----
    passport_no_raw = line2[0:9]
    passport_no = passport_no_raw.replace("<", "")
    passport_no_check = line2[9]

    nationality = line2[10:13].replace("<", "")

    dob_raw = line2[13:19]
    dob_check = line2[19]

    sex = line2[20]

    expiry_raw = line2[21:27]
    expiry_check = line2[27]

    personal_no_raw = line2[28:42]
    personal_no = personal_no_raw.replace("<", "")
    personal_no_check = line2[42]

    composite_check = line2[43]
    composite_data = (
        line2[0:10] + line2[13:20] + line2[21:43]
    )  # per ICAO 9303 composite formula for TD3

    checks = {
        "passport_no": _verify(passport_no_raw, passport_no_check),
        "dob": _verify(dob_raw, dob_check),
        "expiry": _verify(expiry_raw, expiry_check),
        "personal_no": _verify(personal_no_raw, personal_no_check) if personal_no else True,
        "composite": _verify(composite_data, composite_check),
    }

    overall_valid = all(checks.values())

    parsed_fields = {
        "document_type": doc_type,
        "issuing_country": issuing_country,
        "surname": surname,
        "given_names": given_names,
        "passport_no": passport_no,
        "nationality": nationality,
        "dob": _parse_mrz_date(dob_raw),
        "sex": sex if sex in ("M", "F") else "X",
        "expiry": _parse_mrz_date(expiry_raw),
        "personal_no": personal_no or None,
    }

    return {
        "found": True,
        "parsed_fields": parsed_fields,
        "valid_checksum": overall_valid,
        "field_checks": checks,
        "raw_lines": [line1, line2],
    }

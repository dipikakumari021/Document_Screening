"""
generate_synthetic_passport.py
-------------------------------
Builds a fake passport-bio-page PNG with a correctly checksummed MRZ,
purely for testing the OCR + MRZ-parsing pipeline before you have real
(or dummy) sample passport images to test with.

This validates: image decoding, MRZ-band cropping, Tesseract extraction,
MRZ field parsing, and checksum validation — everything except real-world
OCR robustness (lighting, glare, camera angle), which you'll want to test
with actual sample images once your teammates / mentors provide some.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from mrz_parser import compute_check_digit  # noqa: E402

FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
MRZ_FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def build_mrz_lines(surname, given_names, passport_no, nationality, dob_yymmdd, sex, expiry_yymmdd, country="IND"):
    name_field = f"{surname}<<{given_names.replace(' ', '<')}"
    line1 = ("P<" + country + name_field).ljust(44, "<")[:44]

    passport_no_field = passport_no.ljust(9, "<")
    passport_check = compute_check_digit(passport_no_field)
    dob_check = compute_check_digit(dob_yymmdd)
    expiry_check = compute_check_digit(expiry_yymmdd)
    personal_no_field = "<" * 14
    personal_check = "<"  # unused field marker per ICAO spec

    composite_data = (
        passport_no_field + str(passport_check)
        + dob_yymmdd + str(dob_check)
        + expiry_yymmdd + str(expiry_check)
        + personal_no_field + personal_check
    )
    composite_check = compute_check_digit(composite_data)

    line2 = (
        passport_no_field + str(passport_check)
        + nationality.ljust(3, "<")
        + dob_yymmdd + str(dob_check)
        + sex
        + expiry_yymmdd + str(expiry_check)
        + personal_no_field + personal_check
        + str(composite_check)
    )
    assert len(line1) == 44 and len(line2) == 44, (len(line1), len(line2))
    return line1, line2


def render_passport_image(out_path: str, surname="SHARMA", given_names="RAHUL", passport_no="R1234567",
                           nationality="IND", dob_yymmdd="990814", sex="M", expiry_yymmdd="300814"):
    W, H = 1000, 640
    img = Image.new("RGB", (W, H), (238, 233, 218))  # passport-page beige
    draw = ImageDraw.Draw(img)

    title_font = ImageFont.truetype(FONT_PATH, 28)
    label_font = ImageFont.truetype(FONT_PATH, 16)
    mrz_font = ImageFont.truetype(MRZ_FONT_PATH, 30)

    draw.text((30, 20), "REPUBLIC OF INDIA / PASSPORT", font=title_font, fill=(20, 20, 60))

    printed_name = f"{given_names} {surname}"
    fields = [
        ("Type / Code / No", f"P / IND / {passport_no}"),
        ("Surname", surname),
        ("Given Name(s)", given_names),
        ("Nationality", "INDIAN"),
        ("Date of Birth", f"14 AUG {'19' + dob_yymmdd[0:2] if int(dob_yymmdd[0:2]) > 30 else '20' + dob_yymmdd[0:2]}"),
        ("Sex", sex),
        ("Date of Expiry", f"14 AUG {'19' + expiry_yymmdd[0:2] if int(expiry_yymmdd[0:2]) > 30 else '20' + expiry_yymmdd[0:2]}"),
    ]
    y = 90
    for label, value in fields:
        draw.text((30, y), f"{label}:", font=label_font, fill=(90, 90, 90))
        draw.text((260, y), value, font=label_font, fill=(10, 10, 10))
        y += 34

    # Printed name line again lower down, mimicking a signature/visual zone repeat
    draw.text((30, y + 10), printed_name, font=title_font, fill=(10, 10, 10))

    # Photo box placeholder
    draw.rectangle([700, 90, 950, 340], outline=(60, 60, 60), width=2)
    draw.text((730, 200), "PHOTO", font=label_font, fill=(150, 150, 150))

    line1, line2 = build_mrz_lines(surname, given_names, passport_no, nationality, dob_yymmdd, sex, expiry_yymmdd)

    mrz_top = int(H * 0.80)
    draw.rectangle([0, int(H * 0.72), W, H], fill=(255, 255, 255))
    draw.text((30, mrz_top), line1, font=mrz_font, fill=(0, 0, 0))
    draw.text((30, mrz_top + 45), line2, font=mrz_font, fill=(0, 0, 0))

    img.save(out_path)
    return {
        "surname": surname,
        "given_names": given_names,
        "passport_no": passport_no,
        "nationality": nationality,
        "dob_yymmdd": dob_yymmdd,
        "sex": sex,
        "expiry_yymmdd": expiry_yymmdd,
        "mrz_line1": line1,
        "mrz_line2": line2,
    }


if __name__ == "__main__":
    out = Path(__file__).parent / "synthetic_passport.png"
    meta = render_passport_image(str(out))
    print(f"Wrote {out}")
    print(meta)

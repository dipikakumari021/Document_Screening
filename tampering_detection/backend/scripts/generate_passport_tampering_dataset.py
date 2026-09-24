#!/usr/bin/env python3
"""
generate_passport_tampering_dataset.py
--------------------------------------
Generates a passport tampering dataset for the 3-model pipeline:
- Model 1: Binary classifier (original vs tampered)
- Model 2: U-Net segmenter (image + binary mask pairs)
- Model 3: Type classifier (cropped tampered regions by class)

Outputs match the exact directory structure expected by existing dataset.py files.
"""

import argparse
import hashlib
import json
import random
import shutil
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------
# Ensure project root is on path for imports
# ---------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[3]  # Document_Screening/
AI_SERVICE_ROOT = PROJECT_ROOT / "ai-service"
BACKEND_ROOT = Path(__file__).resolve().parents[1]  # tampering_detection/backend/
sys.path.insert(0, str(AI_SERVICE_ROOT))
sys.path.insert(0, str(BACKEND_ROOT))

from mrz_parser import compute_check_digit  # noqa: E402
from utils.postprocessing import mask_to_bbox, crop_region  # noqa: E402


# ---------------------------------------------------------------------
# Constants and Configuration
# ---------------------------------------------------------------------
VALID_LAYOUTS = ["IND", "USA", "GBR", "FRA", "CAN"]
TAMPER_TYPES = [
    "Text Edited",
    "Photo Replaced",
    "Copy Move",
    "Splicing",
    "Logo Edited",
]

# Image dimensions (matching generate_synthetic_passport.py)
IMG_W, IMG_H = 1000, 640

# Font handling - use PIL default if TTF not available
DEFAULT_FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
DEFAULT_MRZ_FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

# JPEG quality for global re-compression after tampering
JPEG_QUALITY = 90

# Mask dilation for blend boundaries
MASK_DILATION_PX = 3

# Deterministic hash function for variant seeds
def deterministic_hash(s: str) -> int:
    """Return a deterministic 32-bit hash from a string."""
    return int(hashlib.md5(s.encode()).hexdigest(), 16) % (2**32)

# ---------------------------------------------------------------------
# Data Classes
# ---------------------------------------------------------------------
@dataclass
class PassportMetadata:
    passport_id: str
    layout: str
    surname: str
    given_names: str
    passport_no: str
    nationality: str
    dob_yymmdd: str
    sex: str
    expiry_yymmdd: str
    photo_box: Tuple[int, int, int, int]        # x, y, w, h
    mrz_region: Tuple[int, int, int, int]       # x, y, w, h (bottom area)
    text_fields: Dict[str, Tuple[int, int, int, int]]  # field_name -> (x, y, w, h)
    logo_region: Tuple[int, int, int, int]      # x, y, w, h
    mrz_line1: str
    mrz_line2: str
    seed: int


@dataclass
class TamperResult:
    tampered_bgr: np.ndarray
    mask_bgr: np.ndarray  # binary 0/255
    operation_params: Dict[str, Any]
    tamper_type: str


# ---------------------------------------------------------------------
# Font Utilities
# ---------------------------------------------------------------------
def get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Get a font, falling back to PIL default if TTF not found."""
    for path in [DEFAULT_FONT_PATH, DEFAULT_MRZ_FONT_PATH]:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    # Fallback
    return ImageFont.load_default()


# ---------------------------------------------------------------------
# Synthetic Passport Generation (adapted from generate_synthetic_passport.py)
# ---------------------------------------------------------------------
def build_mrz_lines(surname: str, given_names: str, passport_no: str,
                    nationality: str, dob_yymmdd: str, sex: str,
                    expiry_yymmdd: str, country: str = "IND") -> Tuple[str, str]:
    name_field = f"{surname}<<{given_names.replace(' ', '<')}"
    line1 = ("P<" + country + name_field).ljust(44, "<")[:44]

    passport_no_field = passport_no.ljust(9, "<")
    passport_check = compute_check_digit(passport_no_field)
    dob_check = compute_check_digit(dob_yymmdd)
    expiry_check = compute_check_digit(expiry_yymmdd)
    personal_no_field = "<" * 14
    personal_check = "<"

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


def render_passport_image(
    out_path: str,
    metadata: PassportMetadata,
    bg_color: Tuple[int, int, int] = (238, 233, 218),
    photo_image: Optional[np.ndarray] = None,
) -> None:
    """Render a passport bio-data page to disk."""
    W, H = IMG_W, IMG_H
    img = Image.new("RGB", (W, H), bg_color)
    draw = ImageDraw.Draw(img)

    title_font = get_font(28)
    label_font = get_font(16)
    mrz_font = get_font(30)

    # Header
    country_name = {
        "IND": "REPUBLIC OF INDIA",
        "USA": "UNITED STATES OF AMERICA",
        "GBR": "UNITED KINGDOM",
        "FRA": "REPUBLIQUE FRANCAISE",
        "CAN": "CANADA",
    }.get(metadata.layout, "PASSPORT")
    draw.text((30, 20), f"{country_name} / PASSPORT", font=title_font, fill=(20, 20, 60))

    # Visual zone fields
    printed_name = f"{metadata.given_names} {metadata.surname}"
    fields = [
        ("Type / Code / No", f"P / {metadata.nationality} / {metadata.passport_no}"),
        ("Surname", metadata.surname),
        ("Given Name(s)", metadata.given_names),
        ("Nationality", metadata.nationality),
        ("Date of Birth", _format_dob(metadata.dob_yymmdd)),
        ("Sex", metadata.sex),
        ("Date of Expiry", _format_expiry(metadata.expiry_yymmdd)),
    ]
    y = 90
    for label, value in fields:
        draw.text((30, y), f"{label}:", font=label_font, fill=(90, 90, 90))
        draw.text((260, y), value, font=label_font, fill=(10, 10, 10))
        y += 34

    # Printed name repeat
    draw.text((30, y + 10), printed_name, font=title_font, fill=(10, 10, 10))

    # Photo box - draw placeholder or paste photo
    px, py, pw, ph = metadata.photo_box
    if photo_image is not None:
        photo_pil = Image.fromarray(cv2.cvtColor(photo_image, cv2.COLOR_BGR2RGB))
        photo_pil = photo_pil.resize((pw, ph), Image.Resampling.LANCZOS)
        img.paste(photo_pil, (px, py))
    else:
        draw.rectangle([px, py, px + pw, py + ph], outline=(60, 60, 60), width=2)
        draw.text((px + 30, py + ph // 2 - 10), "PHOTO", font=label_font, fill=(150, 150, 150))

    # MRZ lines
    mrz_top = int(H * 0.80)
    draw.rectangle([0, int(H * 0.72), W, H], fill=(255, 255, 255))
    draw.text((30, mrz_top), metadata.mrz_line1, font=mrz_font, fill=(0, 0, 0))
    draw.text((30, mrz_top + 45), metadata.mrz_line2, font=mrz_font, fill=(0, 0, 0))

    img.save(out_path)


def _format_dob(dob_yymmdd: str) -> str:
    yy = int(dob_yymmdd[:2])
    year = 1900 + yy if yy > 30 else 2000 + yy
    return f"{dob_yymmdd[4:6]} {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][int(dob_yymmdd[2:4])-1]} {year}"


def _format_expiry(expiry_yymmdd: str) -> str:
    yy = int(expiry_yymmdd[:2])
    year = 2000 + yy
    return f"{expiry_yymmdd[4:6]} {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][int(expiry_yymmdd[2:4])-1]} {year}"


# ---------------------------------------------------------------------
# Genuine Passport Generation
# ---------------------------------------------------------------------
def generate_genuine_passport(passport_id: str, layout: str, seed: int) -> Tuple[np.ndarray, PassportMetadata]:
    """Generate a single genuine passport image and its metadata."""
    rng = random.Random(seed)

    # Generate random but valid passport data
    surnames = ["SHARMA", "PATEL", "SINGH", "KUMAR", "GUPTA", "SMITH", "JOHNSON", "WILLIAMS", "BROWN", "JONES",
                "MULLER", "SCHMIDT", "SCHNEIDER", "FISCHER", "WEBER", "MARTIN", "BERNARD", "DUBOIS", "THOMAS", "ROBERT"]
    given_names = ["RAHUL", "PRIYA", "AMIT", "NEHA", "VIKAS", "ANJALI", "JAMES", "MARY", "JOHN", "PATRICIA",
                   "ROBERT", "JENNIFER", "MICHAEL", "LINDA", "WILLIAM", "ELIZABETH", "DAVID", "BARBARA", "RICHARD", "SUSAN"]
    nationalities = {"IND": "IND", "USA": "USA", "GBR": "GBR", "FRA": "FRA", "CAN": "CAN"}

    surname = rng.choice(surnames)
    given = rng.choice(given_names)
    passport_no = f"{rng.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{rng.randint(1000000, 9999999)}"
    nationality = nationalities[layout]
    dob_yy = rng.randint(40, 99)  # 1940-1999 for adults
    dob_mm = rng.randint(1, 12)
    dob_dd = rng.randint(1, 28)
    dob_yymmdd = f"{dob_yy:02d}{dob_mm:02d}{dob_dd:02d}"
    sex = rng.choice(["M", "F"])
    expiry_yy = (dob_yy + 30 + rng.randint(5, 10)) % 100  # 30-40 years from birth
    expiry_mm = dob_mm
    expiry_dd = dob_dd
    expiry_yymmdd = f"{expiry_yy:02d}{expiry_mm:02d}{expiry_dd:02d}"

    # Build MRZ lines
    mrz_line1, mrz_line2 = build_mrz_lines(
        surname, given, passport_no, nationality, dob_yymmdd, sex, expiry_yymmdd, layout
    )

    # Define regions (pixel coordinates for 1000x640)
    photo_box = (700, 90, 250, 250)  # x, y, w, h
    mrz_region = (0, int(IMG_H * 0.72), IMG_W, int(IMG_H * 0.28))
    text_fields = {
        "surname": (260, 124, 400, 34),
        "given_names": (260, 158, 400, 34),
        "passport_no": (260, 90, 400, 34),
        "nationality": (260, 192, 400, 34),
        "dob": (260, 226, 400, 34),
        "sex": (260, 260, 100, 34),
        "expiry": (260, 294, 400, 34),
    }
    logo_region = (800, 30, 100, 100)  # emblem area

    metadata = PassportMetadata(
        passport_id=passport_id,
        layout=layout,
        surname=surname,
        given_names=given,
        passport_no=passport_no,
        nationality=nationality,
        dob_yymmdd=dob_yymmdd,
        sex=sex,
        expiry_yymmdd=expiry_yymmdd,
        photo_box=photo_box,
        mrz_region=mrz_region,
        text_fields=text_fields,
        logo_region=logo_region,
        mrz_line1=mrz_line1,
        mrz_line2=mrz_line2,
        seed=seed,
    )

    # Render to temporary file, then load as BGR
    temp_path = f"/tmp/{passport_id}_genuine.png"
    render_passport_image(temp_path, metadata)
    bgr = cv2.imread(temp_path)
    Path(temp_path).unlink(missing_ok=True)

    return bgr, metadata


# ---------------------------------------------------------------------
# Tampering Operations
# ---------------------------------------------------------------------
def global_jpeg_compress(bgr: np.ndarray, quality: int = JPEG_QUALITY) -> np.ndarray:
    """Apply single global JPEG compression."""
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    _, encimg = cv2.imencode('.jpg', bgr, encode_param)
    return cv2.imdecode(encimg, cv2.IMREAD_COLOR)


def generate_mask_from_regions(regions: List[Tuple[int, int, int, int]], img_shape: Tuple[int, int], dilation: int = MASK_DILATION_PX) -> np.ndarray:
    """Create binary mask (255/0) from list of (x, y, w, h) regions."""
    h, w = img_shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    for x, y, rw, rh in regions:
        x1, y1 = max(0, x - dilation), max(0, y - dilation)
        x2, y2 = min(w, x + rw + dilation), min(h, y + rh + dilation)
        mask[y1:y2, x1:x2] = 255
    # Dilate to cover blend boundaries
    if dilation > 0:
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * dilation + 1, 2 * dilation + 1))
        mask = cv2.dilate(mask, kernel, iterations=1)
    return mask


def seamless_blend(src: np.ndarray, dst: np.ndarray, mask: np.ndarray, method: str = "poisson") -> np.ndarray:
    """Blend src into dst using mask. Returns blended image."""
    # Ensure mask is binary 0/255
    _, mask_bin = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
    # Find center of mask for seamlessClone
    moments = cv2.moments(mask_bin)
    if moments["m00"] == 0:
        return dst
    cx = int(moments["m10"] / moments["m00"])
    cy = int(moments["m01"] / moments["m00"])

    try:
        if method == "poisson":
            return cv2.seamlessClone(src, dst, mask_bin, (cx, cy), cv2.NORMAL_CLONE)
        else:
            # Alpha blend fallback
            alpha = (mask_bin / 255.0)[:, :, np.newaxis]
            return (src * alpha + dst * (1 - alpha)).astype(np.uint8)
    except cv2.error:
        # Fallback to alpha blend
        alpha = (mask_bin / 255.0)[:, :, np.newaxis]
        return (src * alpha + dst * (1 - alpha)).astype(np.uint8)


def apply_text_edited(genuine_bgr: np.ndarray, metadata: PassportMetadata, seed: int) -> TamperResult:
    """Modify DOB, Expiry, or Passport Number with realistic rendering."""
    rng = random.Random(seed)
    h, w = genuine_bgr.shape[:2]
    tampered = genuine_bgr.copy()

    # Choose 1-2 fields to edit
    editable_fields = ["dob", "expiry", "passport_no"]
    num_edits = rng.randint(1, 2)
    fields_to_edit = rng.sample(editable_fields, num_edits)

    operation_params = {"edited_fields": {}, "new_values": {}}
    mask_regions = []

    # Convert to PIL for text rendering
    pil_img = Image.fromarray(cv2.cvtColor(tampered, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil_img)
    label_font = get_font(16)

    for field in fields_to_edit:
        if field == "dob":
            # Generate new valid DOB
            new_yy = rng.randint(40, 99)
            new_mm = rng.randint(1, 12)
            new_dd = rng.randint(1, 28)
            new_dob = f"{new_yy:02d}{new_mm:02d}{new_dd:02d}"
            new_display = _format_dob(new_dob)

            # Update metadata and MRZ
            metadata.dob_yymmdd = new_dob
            operation_params["edited_fields"]["dob"] = new_dob
            operation_params["new_values"]["dob"] = new_display

            # Re-render visual zone
            x, y, rw, rh = metadata.text_fields["dob"]
            # Clear old text
            draw.rectangle([x, y, x + rw, y + rh], fill=(238, 233, 218))
            draw.text((x, y), new_display, font=label_font, fill=(10, 10, 10))
            mask_regions.append((x, y, rw, rh))

        elif field == "expiry":
            new_yy = rng.randint(30, 99)
            new_mm = rng.randint(1, 12)
            new_dd = rng.randint(1, 28)
            new_expiry = f"{new_yy:02d}{new_mm:02d}{new_dd:02d}"
            new_display = _format_expiry(new_expiry)

            metadata.expiry_yymmdd = new_expiry
            operation_params["edited_fields"]["expiry"] = new_expiry
            operation_params["new_values"]["expiry"] = new_display

            x, y, rw, rh = metadata.text_fields["expiry"]
            draw.rectangle([x, y, x + rw, y + rh], fill=(238, 233, 218))
            draw.text((x, y), new_display, font=label_font, fill=(10, 10, 10))
            mask_regions.append((x, y, rw, rh))

        elif field == "passport_no":
            new_passport = f"{rng.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{rng.randint(1000000, 9999999)}"
            metadata.passport_no = new_passport
            operation_params["edited_fields"]["passport_no"] = new_passport
            operation_params["new_values"]["passport_no"] = new_passport

            x, y, rw, rh = metadata.text_fields["passport_no"]
            draw.rectangle([x, y, x + rw, y + rh], fill=(238, 233, 218))
            draw.text((x, y), f"P / {metadata.nationality} / {new_passport}", font=label_font, fill=(10, 10, 10))
            mask_regions.append((x, y, rw, rh))

    # Rebuild MRZ lines with updated data
    mrz_line1, mrz_line2 = build_mrz_lines(
        metadata.surname, metadata.given_names, metadata.passport_no,
        metadata.nationality, metadata.dob_yymmdd, metadata.sex, metadata.expiry_yymmdd,
        metadata.layout
    )
    metadata.mrz_line1 = mrz_line1
    metadata.mrz_line2 = mrz_line2

    # Re-render MRZ area
    mrz_top = int(IMG_H * 0.80)
    mrz_font = get_font(30)
    draw.rectangle([0, int(IMG_H * 0.72), IMG_W, IMG_H], fill=(255, 255, 255))
    draw.text((30, mrz_top), metadata.mrz_line1, font=mrz_font, fill=(0, 0, 0))
    draw.text((30, mrz_top + 45), metadata.mrz_line2, font=mrz_font, fill=(0, 0, 0))
    mask_regions.append((30, int(IMG_H * 0.72), IMG_W - 60, 100))  # Full MRZ area

    # Convert back to BGR
    tampered = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    # Global JPEG re-compression
    tampered = global_jpeg_compress(tampered)

    # Generate mask
    mask = generate_mask_from_regions(mask_regions, (IMG_H, IMG_W))

    return TamperResult(
        tampered_bgr=tampered,
        mask_bgr=mask,
        operation_params=operation_params,
        tamper_type="Text Edited",
    )


def apply_photo_replaced(genuine_bgr: np.ndarray, metadata: PassportMetadata, seed: int, face_pool: List[np.ndarray]) -> TamperResult:
    """Replace the photo with a different face."""
    rng = random.Random(seed)
    tampered = genuine_bgr.copy()

    px, py, pw, ph = metadata.photo_box
    if not face_pool:
        raise ValueError("face_pool is empty")

    # Select replacement face
    new_face_bgr = rng.choice(face_pool)
    new_face_resized = cv2.resize(new_face_bgr, (pw, ph), interpolation=cv2.INTER_LANCZOS4)

    # Create mask for photo region (with dilation for blend)
    mask = np.zeros((IMG_H, IMG_W), dtype=np.uint8)
    cv2.rectangle(mask, (px - MASK_DILATION_PX, py - MASK_DILATION_PX),
                  (px + pw + MASK_DILATION_PX, py + ph + MASK_DILATION_PX), 255, -1)

    # Blend using seamless clone
    roi = tampered[py:py+ph, px:px+pw]
    blended_roi = seamless_blend(new_face_resized, roi, mask[py:py+ph, px:px+pw])
    tampered[py:py+ph, px:px+pw] = blended_roi

    # Global JPEG re-compression
    tampered = global_jpeg_compress(tampered)

    operation_params = {
        "source_face_index": next((i for i, f in enumerate(face_pool) if np.array_equal(f, new_face_bgr)), -1),
        "blend_method": "poisson",
        "photo_box": metadata.photo_box,
    }

    return TamperResult(
        tampered_bgr=tampered,
        mask_bgr=mask,
        operation_params=operation_params,
        tamper_type="Photo Replaced",
    )


def apply_copy_move(genuine_bgr: np.ndarray, metadata: PassportMetadata, seed: int) -> TamperResult:
    """Copy a region and paste it elsewhere with transformation."""
    rng = random.Random(seed)
    tampered = genuine_bgr.copy()
    h, w = tampered.shape[:2]

    # Define candidate source regions (text fields, MRZ fragments, logo)
    candidate_sources = list(metadata.text_fields.values()) + [metadata.logo_region]
    # Filter to reasonable sizes
    candidate_sources = [r for r in candidate_sources if r[2] >= 30 and r[3] >= 30]

    if not candidate_sources:
        # Fallback: use a fixed region
        src_x, src_y, src_w, src_h = 300, 120, 200, 60
    else:
        src_x, src_y, src_w, src_h = rng.choice(candidate_sources)

    # Choose destination that doesn't overlap source
    dst_candidates = [
        (100, 400, src_w, src_h),  # below visual zone
        (600, 400, src_w, src_h),  # right side
        (300, 500, src_w, src_h),  # near bottom
    ]
    dst_x, dst_y, dst_w, dst_h = rng.choice(dst_candidates)

    # Apply modest transformation
    angle = rng.uniform(-10, 10)
    scale = rng.uniform(0.9, 1.1)
    M = cv2.getRotationMatrix2D((src_w / 2, src_h / 2), angle, scale)
    src_region = tampered[src_y:src_y+src_h, src_x:src_x+src_w].copy()
    transformed = cv2.warpAffine(src_region, M, (dst_w, dst_h), borderMode=cv2.BORDER_REFLECT)

    # Create mask for both regions
    mask = np.zeros((IMG_H, IMG_W), dtype=np.uint8)
    cv2.rectangle(mask, (src_x - MASK_DILATION_PX, src_y - MASK_DILATION_PX),
                  (src_x + src_w + MASK_DILATION_PX, src_y + src_h + MASK_DILATION_PX), 255, -1)
    cv2.rectangle(mask, (dst_x - MASK_DILATION_PX, dst_y - MASK_DILATION_PX),
                  (dst_x + dst_w + MASK_DILATION_PX, dst_y + dst_h + MASK_DILATION_PX), 255, -1)

    # Blend at destination
    dst_roi = tampered[dst_y:dst_y+dst_h, dst_x:dst_x+dst_w]
    blended = seamless_blend(transformed, dst_roi, mask[dst_y:dst_y+dst_h, dst_x:dst_x+dst_w])
    tampered[dst_y:dst_y+dst_h, dst_x:dst_x+dst_w] = blended

    # Global JPEG re-compression
    tampered = global_jpeg_compress(tampered)

    operation_params = {
        "src_region": {"x": src_x, "y": src_y, "w": src_w, "h": src_h},
        "dst_region": {"x": dst_x, "y": dst_y, "w": dst_w, "h": dst_h},
        "transform": {"angle": angle, "scale": scale},
    }

    # Mask covers both source and destination
    mask_regions = [(src_x, src_y, src_w, src_h), (dst_x, dst_y, dst_w, dst_h)]
    mask = generate_mask_from_regions(mask_regions, (IMG_H, IMG_W))

    return TamperResult(
        tampered_bgr=tampered,
        mask_bgr=mask,
        operation_params=operation_params,
        tamper_type="Copy Move",
    )


def apply_splicing(genuine_bgr: np.ndarray, metadata: PassportMetadata, seed: int,
                   foreign_passports: Dict[str, Tuple[np.ndarray, PassportMetadata]]) -> TamperResult:
    """Splice a region from a different passport/layout."""
    rng = random.Random(seed)
    tampered = genuine_bgr.copy()

    # Choose a foreign passport (different layout if possible)
    foreign_ids = [pid for pid in foreign_passports if pid != metadata.passport_id]
    if not foreign_ids:
        raise ValueError("No foreign passports available for splicing")

    foreign_id = rng.choice(foreign_ids)
    foreign_bgr, foreign_meta = foreign_passports[foreign_id]

    # Choose target region in genuine (photo box, text field, or logo)
    target_options = {
        "photo_box": metadata.photo_box,
        "logo": metadata.logo_region,
    }
    target_name = rng.choice(list(target_options.keys()))
    tx, ty, tw, th = target_options[target_name]

    # Choose source region from foreign passport
    foreign_options = {
        "photo_box": foreign_meta.photo_box,
        "logo": foreign_meta.logo_region,
    }
    # Prefer matching region type
    source_name = target_name if target_name in foreign_options else rng.choice(list(foreign_options.keys()))
    fx, fy, fw, fh = foreign_options[source_name]

    # Extract and resize foreign patch
    foreign_patch = foreign_bgr[fy:fy+fh, fx:fx+fw].copy()
    foreign_patch_resized = cv2.resize(foreign_patch, (tw, th), interpolation=cv2.INTER_LANCZOS4)

    # Color transfer (LAB mean/std match)
    genuine_roi = tampered[ty:ty+th, tx:tx+tw]
    foreign_lab = cv2.cvtColor(foreign_patch_resized, cv2.COLOR_BGR2LAB)
    genuine_lab = cv2.cvtColor(genuine_roi, cv2.COLOR_BGR2LAB)

    for c in range(3):
        f_mean, f_std = foreign_lab[:, :, c].mean(), foreign_lab[:, :, c].std()
        g_mean, g_std = genuine_lab[:, :, c].mean(), genuine_lab[:, :, c].std()
        if f_std > 0:
            foreign_lab[:, :, c] = (foreign_lab[:, :, c] - f_mean) * (g_std / f_std) + g_mean

    color_matched = cv2.cvtColor(foreign_lab.astype(np.uint8), cv2.COLOR_LAB2BGR)

    # Mask for target region
    mask = np.zeros((IMG_H, IMG_W), dtype=np.uint8)
    cv2.rectangle(mask, (tx - MASK_DILATION_PX, ty - MASK_DILATION_PX),
                  (tx + tw + MASK_DILATION_PX, ty + th + MASK_DILATION_PX), 255, -1)

    # Blend
    blended = seamless_blend(color_matched, genuine_roi, mask[ty:ty+th, tx:tx+tw])
    tampered[ty:ty+th, tx:tx+tw] = blended

    # Global JPEG re-compression
    tampered = global_jpeg_compress(tampered)

    operation_params = {
        "foreign_passport_id": foreign_id,
        "target_region": target_name,
        "source_region": source_name,
        "warp_applied": False,
    }

    return TamperResult(
        tampered_bgr=tampered,
        mask_bgr=mask,
        operation_params=operation_params,
        tamper_type="Splicing",
    )


def apply_logo_edited(genuine_bgr: np.ndarray, metadata: PassportMetadata, seed: int) -> TamperResult:
    """Alter the national emblem/logo region."""
    rng = random.Random(seed)
    tampered = genuine_bgr.copy()

    lx, ly, lw, lh = metadata.logo_region
    logo_roi = tampered[ly:ly+lh, lx:lx+lw].copy()

    # Choose transformation
    ops = ["color_shift", "text_overlay", "geometric_distort", "partial_erase"]
    op = rng.choice(ops)

    if op == "color_shift":
        # Shift hue in HSV
        hsv = cv2.cvtColor(logo_roi, cv2.COLOR_BGR2HSV)
        hsv[:, :, 0] = (hsv[:, :, 0] + rng.randint(30, 90)) % 180
        logo_roi = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        params = {"operation": "color_shift", "hue_shift": True}

    elif op == "text_overlay":
        # Overlay text using PIL
        pil_roi = Image.fromarray(cv2.cvtColor(logo_roi, cv2.COLOR_BGR2RGB))
        draw = ImageDraw.Draw(pil_roi)
        font = get_font(12)
        draw.text((5, 5), "VOID", font=font, fill=(255, 0, 0))
        logo_roi = cv2.cvtColor(np.array(pil_roi), cv2.COLOR_RGB2BGR)
        params = {"operation": "text_overlay", "text": "VOID"}

    elif op == "geometric_distort":
        # Apply slight perspective transform
        h, w = logo_roi.shape[:2]
        src_pts = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
        offset = rng.randint(-5, 5)
        dst_pts = np.float32([[offset, offset], [w-offset, offset], [w-offset, h-offset], [offset, h-offset]])
        M = cv2.getPerspectiveTransform(src_pts, dst_pts)
        logo_roi = cv2.warpPerspective(logo_roi, M, (w, h), borderMode=cv2.BORDER_REFLECT)
        params = {"operation": "geometric_distort", "perspective": True}

    elif op == "partial_erase":
        # Erase a random sub-region
        ex, ey = rng.randint(0, lw//2), rng.randint(0, lh//2)
        ew, eh = rng.randint(lw//4, lw//2), rng.randint(lh//4, lh//2)
        logo_roi[ey:ey+eh, ex:ex+ew] = (200, 200, 200)  # gray
        params = {"operation": "partial_erase", "region": [ex, ey, ew, eh]}

    tampered[ly:ly+lh, lx:lx+lw] = logo_roi

    # Mask
    mask = np.zeros((IMG_H, IMG_W), dtype=np.uint8)
    cv2.rectangle(mask, (lx - MASK_DILATION_PX, ly - MASK_DILATION_PX),
                  (lx + lw + MASK_DILATION_PX, ly + lh + MASK_DILATION_PX), 255, -1)

    # Global JPEG re-compression
    tampered = global_jpeg_compress(tampered)

    operation_params = params

    return TamperResult(
        tampered_bgr=tampered,
        mask_bgr=mask,
        operation_params=operation_params,
        tamper_type="Logo Edited",
    )


# ---------------------------------------------------------------------
# Dataset Generation Pipeline
# ---------------------------------------------------------------------
def create_face_pool(n_faces: int = 20) -> List[np.ndarray]:
    """Create a pool of synthetic faces for photo replacement."""
    faces = []
    rng = random.Random(12345)  # Fixed seed for reproducible face pool
    for i in range(n_faces):
        # Simple synthetic face: colored oval with features
        face = np.zeros((250, 250, 3), dtype=np.uint8)
        color = (rng.randint(150, 220), rng.randint(150, 220), rng.randint(150, 220))
        cv2.ellipse(face, (125, 125), (100, 120), 0, 0, 360, color, -1)
        # Add simple features
        cv2.circle(face, (90, 100), 10, (50, 50, 50), -1)  # left eye
        cv2.circle(face, (160, 100), 10, (50, 50, 50), -1)  # right eye
        cv2.ellipse(face, (125, 150), (30, 15), 0, 0, 180, (100, 50, 50), -1)  # mouth
        faces.append(face)
    return faces


def split_passport_ids(passport_ids: List[str], seed: int = 42,
                       ratios: Tuple[float, float, float] = (0.7, 0.15, 0.15)) -> Dict[str, set]:
    """Split passport IDs into train/val/test by ID to prevent leakage."""
    rng = random.Random(seed)
    shuffled = passport_ids.copy()
    rng.shuffle(shuffled)
    n = len(shuffled)
    train_end = int(n * ratios[0])
    val_end = train_end + int(n * ratios[1])
    return {
        "train": set(shuffled[:train_end]),
        "val": set(shuffled[train_end:val_end]),
        "test": set(shuffled[val_end:]),
    }


def generate_dataset(
    n_passports: int = 500,
    n_test_passports: int = 20,
    layouts: List[str] = VALID_LAYOUTS,
    tamper_types: List[str] = TAMPER_TYPES,
    variants_per_type: int = 1,
    seed: int = 42,
    out_dir: str = "../../datasets",
    manifest_path: str = "../../manifests/dataset_manifest.csv",
) -> None:
    """Main dataset generation function."""
    out_root = Path(out_dir).resolve()
    manifest_file = Path(manifest_path).resolve()

    # Create output directories
    for split in ["train", "val", "test"]:
        # Classifier
        (out_root / "classifier" / split / "original").mkdir(parents=True, exist_ok=True)
        (out_root / "classifier" / split / "tampered").mkdir(parents=True, exist_ok=True)
        # Segmenter
        (out_root / "segmenter" / split / "images").mkdir(parents=True, exist_ok=True)
        (out_root / "segmenter" / split / "masks").mkdir(parents=True, exist_ok=True)
        # Type classifier
        for t in tamper_types:
            (out_root / "type_classifier" / split / t).mkdir(parents=True, exist_ok=True)

    (manifest_file.parent).mkdir(parents=True, exist_ok=True)

    # Global RNG for deterministic passport generation
    master_rng = random.Random(seed)

    # Generate face pool for photo replacement
    face_pool = create_face_pool(20)

    # Generate ALL passport IDs first (training + test)
    all_passport_ids = []
    all_passport_data = {}  # passport_id -> (bgr, metadata)

    # Generate training + validation passports (500 total)
    for i in range(n_passports):
        layout = master_rng.choice(layouts)
        pid = f"{layout}_{i:04d}"
        passport_seed = master_rng.randint(0, 2**32 - 1)
        bgr, metadata = generate_genuine_passport(pid, layout, passport_seed)
        all_passport_ids.append(pid)
        all_passport_data[pid] = (bgr, metadata)

    # Generate held-out test passports (separate, never used in training)
    test_passport_ids = []
    for i in range(n_test_passports):
        layout = master_rng.choice(layouts)
        pid = f"{layout}_TEST_{i:04d}"
        passport_seed = master_rng.randint(0, 2**32 - 1)
        bgr, metadata = generate_genuine_passport(pid, layout, passport_seed)
        test_passport_ids.append(pid)
        all_passport_data[pid] = (bgr, metadata)

    # Split the 500 training passports
    split_map = split_passport_ids(all_passport_ids, seed=seed)

    # Prepare manifest rows
    manifest_rows = []

    # Process each passport
    for pid in all_passport_ids:
        bgr, metadata = all_passport_data[pid]
        split = "train" if pid in split_map["train"] else ("val" if pid in split_map["val"] else "test")

        # Save genuine image
        genuine_filename = f"{pid}.jpg"
        genuine_rel = f"classifier/{split}/original/{genuine_filename}"
        cv2.imwrite(str(out_root / genuine_rel), bgr)

        # Manifest row for genuine
        manifest_rows.append({
            "passport_id": pid,
            "split": split,
            "layout": metadata.layout,
            "source_image": genuine_rel,
            "tampered_image": "",
            "tamper_type": "",
            "mask_path": "",
            "crop_path": "",
            "operation_params": json.dumps({}),
            "seed": metadata.seed,
            "is_genuine": True,
        })

        # Generate tampered variants
        for variant_idx, tamper_type in enumerate(tamper_types):
            for variant in range(variants_per_type):
                variant_seed = deterministic_hash(f"{pid}_{tamper_type}_{variant}")

                if tamper_type == "Text Edited":
                    result = apply_text_edited(bgr.copy(), metadata, variant_seed)
                elif tamper_type == "Photo Replaced":
                    result = apply_photo_replaced(bgr.copy(), metadata, variant_seed, face_pool)
                elif tamper_type == "Copy Move":
                    result = apply_copy_move(bgr.copy(), metadata, variant_seed)
                elif tamper_type == "Splicing":
                    # Build foreign passports dict (all except current)
                    foreign = {p: all_passport_data[p] for p in all_passport_ids if p != pid}
                    result = apply_splicing(bgr.copy(), metadata, variant_seed, foreign)
                elif tamper_type == "Logo Edited":
                    result = apply_logo_edited(bgr.copy(), metadata, variant_seed)
                else:
                    continue

                # Save tampered image
                tampered_filename = f"{pid}_{tamper_type.replace(' ', '_').lower()}_{variant}.jpg"
                tampered_rel = f"classifier/{split}/tampered/{tampered_filename}"
                cv2.imwrite(str(out_root / tampered_rel), result.tampered_bgr)

                # Save mask (PNG, binary 0/255)
                mask_filename = f"{pid}_{tamper_type.replace(' ', '_').lower()}_{variant}.png"
                mask_rel = f"segmenter/{split}/masks/{mask_filename}"
                cv2.imwrite(str(out_root / mask_rel), result.mask_bgr)

                # Save segmenter image (same as tampered)
                seg_img_rel = f"segmenter/{split}/images/{tampered_filename}"
                cv2.imwrite(str(out_root / seg_img_rel), result.tampered_bgr)

                # Generate crop for Model 3 using GROUND-TRUTH mask
                mask_bool = (result.mask_bgr > 127).astype(np.uint8)
                bbox = mask_to_bbox(mask_bool, orig_shape=(IMG_H, IMG_W), mask_shape=(IMG_H, IMG_W), min_area=50)
                if bbox is not None:
                    crop = crop_region(result.tampered_bgr, bbox, pad_ratio=0.15)
                else:
                    crop = result.tampered_bgr  # fallback

                crop_filename = f"{pid}_{tamper_type.replace(' ', '_').lower()}_{variant}.jpg"
                crop_rel = f"type_classifier/{split}/{tamper_type}/{crop_filename}"
                cv2.imwrite(str(out_root / crop_rel), crop)

                # Manifest row for tampered
                manifest_rows.append({
                    "passport_id": pid,
                    "split": split,
                    "layout": metadata.layout,
                    "source_image": genuine_rel,
                    "tampered_image": tampered_rel,
                    "tamper_type": tamper_type,
                    "mask_path": mask_rel,
                    "crop_path": crop_rel,
                    "operation_params": json.dumps(result.operation_params),
                    "seed": variant_seed,
                    "is_genuine": False,
                })

    # Write manifest
    import csv
    fieldnames = ["passport_id", "split", "layout", "source_image", "tampered_image",
                  "tamper_type", "mask_path", "crop_path", "operation_params", "seed", "is_genuine"]
    with open(manifest_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(manifest_rows)

    print(f"Generated dataset at {out_root}")
    print(f"Manifest written to {manifest_file}")
    print(f"Train passports: {len(split_map['train'])}, Val: {len(split_map['val'])}, Test: {len(split_map['test'])}")
    print(f"Held-out test passports: {len(test_passport_ids)} (never used in training)")


# ---------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Generate passport tampering dataset")
    parser.add_argument("--n_passports", type=int, default=500, help="Number of training/val passports")
    parser.add_argument("--n_test_passports", type=int, default=20, help="Number of held-out test passports")
    parser.add_argument("--seed", type=int, default=42, help="Master random seed")
    parser.add_argument("--out_dir", type=str, default="../../datasets", help="Output directory")
    parser.add_argument("--manifest", type=str, default="../../manifests/dataset_manifest.csv", help="Manifest CSV path")
    args = parser.parse_args()

    generate_dataset(
        n_passports=args.n_passports,
        n_test_passports=args.n_test_passports,
        seed=args.seed,
        out_dir=args.out_dir,
        manifest_path=args.manifest,
    )


if __name__ == "__main__":
    main()
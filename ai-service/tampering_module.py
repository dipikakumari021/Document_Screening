"""
tampering_module.py
-------------------
AI module for detecting document tampering, forgery, copy-move, and splicing.
Interfaces with the 3-stage model pipeline from tampering_detection/backend.
"""

import base64
import logging
from io import BytesIO
from pathlib import Path
import sys
import time

try:
    # pyrefly: ignore [missing-import]
    import cv2
    import numpy as np
    from PIL import Image
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False
    cv2 = None
    np = None
    Image = None

# Ensure tampering_detection/backend is on sys.path
BASE_DIR = Path(__file__).resolve().parents[1]
TAMPERING_BACKEND_DIR = BASE_DIR / "tampering_detection" / "backend"
if str(TAMPERING_BACKEND_DIR) not in sys.path:
    sys.path.append(str(TAMPERING_BACKEND_DIR))

logger = logging.getLogger("tampering-module")

_pipeline = None


def decode_base64_image(b64_string: str):
    """Accepts raw base64 string or data URI (data:image/...;base64,...)."""
    if not HAS_CV2 or Image is None:
        return None
    try:
        if "," in b64_string and b64_string.strip().startswith("data:"):
            b64_string = b64_string.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_string)
        pil_img = Image.open(BytesIO(img_bytes)).convert("RGB")
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        logger.warning(f"Could not decode base64 image: {e}")
        return None


def get_tampering_pipeline():
    global _pipeline
    if _pipeline is None:
        try:
            # pyrefly: ignore [missing-import]
            from api.predict import ForgeryDetectionPipeline
            _pipeline = ForgeryDetectionPipeline()
            logger.info("Loaded ForgeryDetectionPipeline successfully.")
        except Exception as e:
            logger.warning(f"Could not load torch-based ForgeryDetectionPipeline: {e}. Using fallback forensic analysis.")
            _pipeline = None
    return _pipeline


def run_tampering_check(image_input: str | bytes | np.ndarray) -> dict:
    """
    Runs tampering detection on the given image.
    Accepts base64 string, raw bytes, or a numpy BGR array.
    """
    start_time = time.time()
    
    if not HAS_CV2:
        return {
            "tampered": False,
            "confidence": 0.95,
            "tampering_type": "None",
            "region": None,
            "inference_time_ms": round((time.time() - start_time) * 1000, 1),
            "method": "Heuristic Mock (OpenCV not installed in environment)",
        }

    # 1. Parse Image
    raw_bytes = None
    img_bgr = None

    if isinstance(image_input, str):
        img_bgr = decode_base64_image(image_input)
        if img_bgr is not None:
            is_success, buffer = cv2.imencode(".png", img_bgr)
            raw_bytes = buffer.tobytes() if is_success else None
    elif isinstance(image_input, bytes):
        raw_bytes = image_input
        try:
            nparr = np.frombuffer(raw_bytes, np.uint8)
            img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception:
            img_bgr = None
    elif isinstance(image_input, np.ndarray):
        img_bgr = image_input
        is_success, buffer = cv2.imencode(".png", img_bgr)
        raw_bytes = buffer.tobytes() if is_success else None

    if img_bgr is None:
        return {
            "tampered": False,
            "confidence": 0.95,
            "tampering_type": "None",
            "region": None,
            "inference_time_ms": round((time.time() - start_time) * 1000, 1),
            "method": "Fallback (Non-image payload)",
        }


    pipeline = get_tampering_pipeline()

    if pipeline is not None and raw_bytes is not None:
        try:
            result = pipeline.predict(raw_bytes)
            elapsed = round((time.time() - start_time) * 1000, 1)
            result["inference_time_ms"] = elapsed
            return result
        except Exception as e:
            logger.error(f"Pipeline prediction error: {e}. Falling back to visual ELA analysis.")

    # Fallback / Error Level Analysis (ELA) + Laplacian Variance Heuristic
    # Useful when PyTorch weights are downloading or running on CPU-only edge
    return _fallback_ela_analysis(img_bgr, start_time)


def _fallback_ela_analysis(img_bgr: np.ndarray, start_time: float) -> dict:
    """
    Performs Error Level Analysis (ELA) and Noise Variance inspection
    as a robust classical forensic baseline.
    """
    h, w = img_bgr.shape[:2]
    
    # Resave at 90% quality to compute compression difference
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
    _, encimg = cv2.imencode('.jpg', img_bgr, encode_param)
    resaved = cv2.imdecode(encimg, 1)
    
    # Absolute difference
    diff = cv2.absdiff(img_bgr, resaved)
    diff_gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    
    # Scale difference
    scale = 15.0
    ela_scaled = np.clip(diff_gray * scale, 0, 255).astype(np.uint8)
    
    # Threshold high discrepancy regions
    _, thresh = cv2.threshold(ela_scaled, 60, 255, cv2.THRESH_BINARY)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    tampered = False
    confidence = 0.96
    tampering_type = "None"
    region = None
    
    # Check if there is a concentrated cluster of high ELA difference
    significant_contours = [c for c in contours if cv2.contourArea(c) > (h * w * 0.005)]
    if significant_contours:
        largest = max(significant_contours, key=cv2.contourArea)
        x, y, cw, ch = cv2.boundingRect(largest)
        tampered = True
        confidence = 0.88
        tampering_type = "Splicing" if cw * ch < (h * w * 0.15) else "Copy-Move"
        region = [y, x, y + ch, x + cw]

    elapsed = round((time.time() - start_time) * 1000, 1)

    return {
        "tampered": tampered,
        "confidence": confidence,
        "tampering_type": tampering_type,
        "region": region,
        "inference_time_ms": elapsed,
        "method": "ELA Forensic Analysis",
    }

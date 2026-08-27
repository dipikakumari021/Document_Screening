"""
face_module.py
----------------
Face verification module for the Document Screening AI service.

Responsibility (per the team's architecture contract):
    Given a passport/document image and a live photo, decide whether
    the same person appears in both.

Returns exactly:
    {
        "similarity": float,        # 0.0 - 1.0 (higher = more similar)
        "match": bool,
        "doc_face_detected": bool,
        "live_face_detected": bool
    }

This module is intentionally stateless and has no DB / business-logic
dependencies, per the "AI service = pure inference" design decision
in the architecture doc. All risk-scoring decisions stay in Node.
"""

import base64
import io
import logging
from typing import Optional

import numpy as np
from PIL import Image
from deepface import DeepFace

logger = logging.getLogger("face_module")

# ---------------------------------------------------------------------------
# Config — tune these during testing, don't hardcode magic numbers elsewhere
# ---------------------------------------------------------------------------

# ArcFace via DeepFace is a strong accuracy/speed tradeoff for this use case.
# Alternatives: "Facenet512", "SFace", "VGG-Face"
MODEL_NAME = "ArcFace"

# DeepFace's own detector backend. "retinaface" is the most accurate for
# document photos (small, sometimes low-res faces) but slower.
# "opencv" is fastest if you're CPU-constrained during the demo.
DETECTOR_BACKEND = "retinaface"

# Cosine distance threshold below which we call it a match.
# DeepFace's default ArcFace threshold is ~0.68 distance.
# We convert distance -> similarity below and expose our own threshold
# so you can tune it against your own test photos (see face_module_test.py).
SIMILARITY_MATCH_THRESHOLD = 0.55


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _decode_base64_image(b64_string: str) -> np.ndarray:
    """Decode a base64 image string (with or without data-URL prefix) into
    an RGB numpy array that DeepFace/OpenCV can consume."""
    if "," in b64_string and b64_string.strip().startswith("data:"):
        b64_string = b64_string.split(",", 1)[1]

    img_bytes = base64.b64decode(b64_string)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(img)


def _extract_embedding(img_array: np.ndarray) -> Optional[np.ndarray]:
    """Run detection + embedding extraction on a single image.
    Returns None if no face was detected."""
    try:
        reps = DeepFace.represent(
            img_path=img_array,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,   # raises if no face found — we catch it
            align=True,
        )
        # DeepFace returns a list (one entry per face found). If multiple
        # faces are found in a document photo, take the largest — it's
        # almost always the actual portrait, not a stray face in a stamp.
        if not reps:
            return None
        if len(reps) > 1:
            reps.sort(key=lambda r: r["facial_area"]["w"] * r["facial_area"]["h"], reverse=True)
        return np.array(reps[0]["embedding"])
    except ValueError:
        # DeepFace raises ValueError when enforce_detection=True and no
        # face is found — this is an expected outcome, not a bug.
        return None
    except Exception:
        logger.exception("Unexpected error during face embedding extraction")
        return None


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a_norm = a / np.linalg.norm(a)
    b_norm = b / np.linalg.norm(b)
    sim = float(np.dot(a_norm, b_norm))
    # cosine similarity is in [-1, 1]; clamp/rescale to [0, 1] for a
    # frontend-friendly "similarity score"
    return max(0.0, min(1.0, (sim + 1) / 2))


# ---------------------------------------------------------------------------
# Public entrypoint — this is what main.py calls
# ---------------------------------------------------------------------------

def run_face_verification(passport_image_b64: str, live_image_b64: str) -> dict:
    """
    Main entrypoint matching the contract in the architecture doc.
    Never raises — always returns the full result shape, with
    doc_face_detected / live_face_detected set to False on failure.
    """
    result = {
        "similarity": 0.0,
        "match": False,
        "doc_face_detected": False,
        "live_face_detected": False,
    }

    try:
        doc_img = _decode_base64_image(passport_image_b64)
        live_img = _decode_base64_image(live_image_b64)
    except Exception:
        logger.exception("Failed to decode input images")
        return result

    doc_embedding = _extract_embedding(doc_img)
    live_embedding = _extract_embedding(live_img)

    result["doc_face_detected"] = doc_embedding is not None
    result["live_face_detected"] = live_embedding is not None

    if doc_embedding is None or live_embedding is None:
        # Can't compare — leave similarity at 0.0, match False.
        # The risk engine on the Node side will read doc/live_face_detected
        # and can flag this as its own risk factor.
        return result

    similarity = _cosine_similarity(doc_embedding, live_embedding)
    result["similarity"] = round(similarity, 4)
    result["match"] = similarity >= SIMILARITY_MATCH_THRESHOLD

    return result

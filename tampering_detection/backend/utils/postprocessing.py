"""
utils/postprocessing.py

Turns raw model outputs into the JSON contract shown in the "Overall Flow"
and "API Response" diagrams:

{
  "tampered": true,
  "confidence": 0.97,
  "tampering_type": "Text Edited",
  "region": [[523, 182], [801, 248]]
}
"""

import cv2
import numpy as np


def mask_to_bbox(mask, orig_shape, mask_shape, min_area=50):
    """
    mask: 2D numpy array (H_mask, W_mask), values in [0,1] or {0,1}
    orig_shape: (H_orig, W_orig) of the source image, so the box can be
                rescaled back to original image coordinates.
    mask_shape: (H_mask, W_mask) the mask was produced at.

    Returns the largest connected component's bounding box as
    [[x1, y1], [x2, y2]] in ORIGINAL image coordinates, or None if nothing
    exceeds min_area.
    """
    binary = (mask > 0.5).astype(np.uint8)
    if binary.sum() == 0:
        return None

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    if num_labels <= 1:
        return None

    # stats[0] is background; pick the largest non-background component
    areas = stats[1:, cv2.CC_STAT_AREA]
    largest_idx = int(np.argmax(areas)) + 1
    if stats[largest_idx, cv2.CC_STAT_AREA] < min_area:
        return None

    x, y, w, h = stats[largest_idx, cv2.CC_STAT_LEFT], stats[largest_idx, cv2.CC_STAT_TOP], \
        stats[largest_idx, cv2.CC_STAT_WIDTH], stats[largest_idx, cv2.CC_STAT_HEIGHT]

    scale_x = orig_shape[1] / mask_shape[1]
    scale_y = orig_shape[0] / mask_shape[0]

    x1 = int(x * scale_x)
    y1 = int(y * scale_y)
    x2 = int((x + w) * scale_x)
    y2 = int((y + h) * scale_y)
    return [[x1, y1], [x2, y2]]


def crop_region(img_bgr, bbox, pad_ratio=0.15):
    """Crop the region defined by bbox=[[x1,y1],[x2,y2]] out of img_bgr, with a small padding margin
    so Model 3 sees context around the edited area."""
    h, w = img_bgr.shape[:2]
    (x1, y1), (x2, y2) = bbox
    box_w, box_h = x2 - x1, y2 - y1
    pad_x = int(box_w * pad_ratio)
    pad_y = int(box_h * pad_ratio)

    x1 = max(0, x1 - pad_x)
    y1 = max(0, y1 - pad_y)
    x2 = min(w, x2 + pad_x)
    y2 = min(h, y2 + pad_y)

    if x2 <= x1 or y2 <= y1:
        return img_bgr  # fallback: full image
    return img_bgr[y1:y2, x1:x2]


def build_response_json(tampered: bool, confidence: float,
                         tampering_type: str = None, region=None):
    """Matches the 'Overall Flow' example output schema."""
    response = {
        "tampered": bool(tampered),
        "confidence": round(float(confidence), 4),
    }
    if tampered:
        response["tampering_type"] = tampering_type
        response["region"] = region
    return response

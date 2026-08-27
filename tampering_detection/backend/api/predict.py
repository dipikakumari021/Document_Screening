"""
api/predict.py

The inference pipeline from "Step 4 — Create inference pipeline" and
"How the three models communicate":

    image
      -> classifier(image)              [Model 1]
      -> if Original: return
      -> mask = segmenter(image)        [Model 2]
      -> cropped_region = crop(mask)
      -> tampering_type = classifier2(cropped_region)   [Model 3]
      -> return JSON
"""

from pathlib import Path
import sys

import cv2
import numpy as np
import torch

sys.path.append(str(Path(__file__).resolve().parents[1]))  # backend/
from models.classifier.model import build_model as build_classifier
from models.segmenter.model import build_model as build_segmenter
from models.type_classifier.model import build_model as build_type_classifier, CLASS_NAMES
from utils.preprocessing import load_image_bgr, bgr_to_rgb, denoise_and_normalize, classifier_transform, segmenter_transform
from utils.postprocessing import mask_to_bbox, crop_region, build_response_json

DEFAULT_CLASSIFIER_THRESHOLD = 0.5
DEFAULT_WEIGHTS_DIR = Path(__file__).resolve().parents[1] / "models"


class ForgeryDetectionPipeline:
    """
    Loads all three checkpoints once and exposes a single `.predict(image)`
    call used by the FastAPI backend. This is the object that turns the
    "Backend Integration" diagram (Upload Image -> OpenCV -> Model 1 ->
    Model 2 -> Crop ROI -> Model 3 -> Response) into real code.
    """

    def __init__(
        self,
        classifier_ckpt: str = None,
        segmenter_ckpt: str = None,
        type_ckpt: str = None,
        device: str = None,
        classifier_threshold: float = DEFAULT_CLASSIFIER_THRESHOLD,
        classifier_image_size: int = 224,
        segmenter_image_size: int = 256,
    ):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.classifier_threshold = classifier_threshold
        self.classifier_image_size = classifier_image_size
        self.segmenter_image_size = segmenter_image_size

        classifier_ckpt = classifier_ckpt or str(DEFAULT_WEIGHTS_DIR / "classifier" / "best_classifier.pt")
        segmenter_ckpt = segmenter_ckpt or str(DEFAULT_WEIGHTS_DIR / "segmenter" / "best_unet.pt")
        type_ckpt = type_ckpt or str(DEFAULT_WEIGHTS_DIR / "type_classifier" / "best_type.pt")

        # ---- Model 1 ----
        self.classifier = build_classifier(pretrained=False).to(self.device)
        self._load_weights(self.classifier, classifier_ckpt, "classifier")
        self.classifier.eval()

        # ---- Model 2 ----
        self.segmenter_arch = "unet"
        seg_state = self._safe_load(segmenter_ckpt)
        if seg_state is not None and "arch" in seg_state:
            self.segmenter_arch = seg_state["arch"]
        self.segmenter = build_segmenter(arch=self.segmenter_arch, pretrained=False).to(self.device)
        self._load_weights(self.segmenter, segmenter_ckpt, "segmenter", preloaded=seg_state)
        self.segmenter.eval()

        # ---- Model 3 ----
        self.type_arch = "resnet50"
        type_state = self._safe_load(type_ckpt)
        if type_state is not None and "arch" in type_state:
            self.type_arch = type_state["arch"]
        self.type_classifier = build_type_classifier(arch=self.type_arch, pretrained=False).to(self.device)
        self._load_weights(self.type_classifier, type_ckpt, "type_classifier", preloaded=type_state)
        self.type_classifier.eval()

        self.classifier_tfm = classifier_transform(self.classifier_image_size)
        self.segmenter_tfm = segmenter_transform(self.segmenter_image_size)

    @staticmethod
    def _safe_load(ckpt_path):
        p = Path(ckpt_path)
        if not p.exists():
            return None
        return torch.load(p, map_location="cpu")

    def _load_weights(self, model, ckpt_path, name, preloaded=None):
        state = preloaded if preloaded is not None else self._safe_load(ckpt_path)
        if state is None:
            print(f"[WARN] No checkpoint found for {name} at {ckpt_path}. "
                  f"Using randomly-initialized / ImageNet-pretrained-only weights.")
            return
        state_dict = state.get("model_state_dict", state)
        model.load_state_dict(state_dict)
        print(f"[INFO] Loaded {name} weights from {ckpt_path}")

    def predict(self, image_bytes_or_path, apply_opencv_preprocessing: bool = True):
        """
        Runs the full pipeline on one image and returns a JSON-serializable dict
        matching the "Overall Flow" example output / "API Response" schema.
        """
        img_bgr = load_image_bgr(image_bytes_or_path)
        orig_h, orig_w = img_bgr.shape[:2]

        proc_bgr = denoise_and_normalize(img_bgr) if apply_opencv_preprocessing else img_bgr

        # ---- Model 1: Tampered or Not ----
        tampered_prob = self._run_classifier(proc_bgr)
        if tampered_prob < self.classifier_threshold:
            return build_response_json(tampered=False, confidence=1 - tampered_prob)

        # ---- Model 2: Locate Tampered Area ----
        mask = self._run_segmenter(proc_bgr)  # (H_mask, W_mask) in [0,1]
        bbox = mask_to_bbox(mask, orig_shape=(orig_h, orig_w), mask_shape=mask.shape)

        if bbox is None:
            # Model 1 said tampered but Model 2 found no coherent region;
            # fall back to reporting without a bounding box / type.
            return build_response_json(tampered=True, confidence=tampered_prob,
                                        tampering_type="Unknown", region=None)

        # ---- Crop ROI ----
        cropped = crop_region(img_bgr, bbox)

        # ---- Model 3: Classify Tampering Type ----
        tampering_type, type_conf = self._run_type_classifier(cropped)

        return build_response_json(
            tampered=True,
            confidence=tampered_prob,
            tampering_type=tampering_type,
            region=bbox,
        )

    def _run_classifier(self, img_bgr) -> float:
        rgb = bgr_to_rgb(img_bgr)
        tensor = self.classifier_tfm(rgb).unsqueeze(0).to(self.device)
        with torch.no_grad():
            prob = torch.sigmoid(self.classifier(tensor)).item()
        return prob

    def _run_segmenter(self, img_bgr) -> np.ndarray:
        rgb = bgr_to_rgb(img_bgr)
        tensor = self.segmenter_tfm(rgb).unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self.segmenter(tensor)
            probs = torch.sigmoid(logits)
        return probs.squeeze(0).squeeze(0).cpu().numpy()

    def _run_type_classifier(self, cropped_bgr):
        rgb = bgr_to_rgb(cropped_bgr)
        tensor = self.classifier_tfm(rgb).unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self.type_classifier(tensor)
            probs = torch.softmax(logits, dim=1)
            conf, idx = probs.max(dim=1)
        return CLASS_NAMES[idx.item()], conf.item()


_pipeline_singleton = None


def get_pipeline() -> ForgeryDetectionPipeline:
    """Lazily builds and caches a single pipeline instance for the FastAPI app."""
    global _pipeline_singleton
    if _pipeline_singleton is None:
        _pipeline_singleton = ForgeryDetectionPipeline()
    return _pipeline_singleton


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser()
    parser.add_argument("image_path")
    args = parser.parse_args()

    pipeline = ForgeryDetectionPipeline()
    result = pipeline.predict(args.image_path)
    print(json.dumps(result, indent=2))

"""
models/segmenter/dataset.py

Expects a directory layout like:

    datasets/segmenter/
        train/
            images/
                0001.jpg
                0002.jpg
            masks/
                0001.png     <- white(255) = tampered region, black(0) = untouched
                0002.png
        val/
            images/
            masks/

IMD2020, Fantastic Reality and the CASIA ground-truth masks all ship as
image/mask pairs; a `scripts/prepare_segmenter_data.py` normalizer (see
README) renames/converts each dataset's native mask format into this
binary PNG layout.
"""

from pathlib import Path
import sys

import cv2
import numpy as np
import torch
from torch.utils.data import Dataset

sys.path.append(str(Path(__file__).resolve().parents[2]))  # backend/
from utils.preprocessing import load_image_bgr, bgr_to_rgb, segmenter_transform  # noqa: E402

VALID_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


class SegmentationDataset(Dataset):
    def __init__(self, root_dir, image_size=256):
        self.root_dir = Path(root_dir)
        self.image_size = image_size
        self.transform = segmenter_transform(image_size)

        img_dir = self.root_dir / "images"
        mask_dir = self.root_dir / "masks"
        if not img_dir.exists() or not mask_dir.exists():
            raise RuntimeError(f"Expected {img_dir} and {mask_dir} to both exist.")

        self.pairs = []
        for img_path in sorted(img_dir.iterdir()):
            if img_path.suffix.lower() not in VALID_EXT:
                continue
            mask_path = mask_dir / img_path.name
            if not mask_path.exists():
                # try alternate extension (e.g. jpg image, png mask)
                candidates = list(mask_dir.glob(img_path.stem + ".*"))
                if not candidates:
                    continue
                mask_path = candidates[0]
            self.pairs.append((str(img_path), str(mask_path)))

        if len(self.pairs) == 0:
            raise RuntimeError(f"No image/mask pairs found under {self.root_dir}.")

    def __len__(self):
        return len(self.pairs)

    def __getitem__(self, idx):
        img_path, mask_path = self.pairs[idx]

        img_bgr = load_image_bgr(img_path)
        img_rgb = bgr_to_rgb(img_bgr)
        img_tensor = self.transform(img_rgb)

        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        mask = cv2.resize(mask, (self.image_size, self.image_size), interpolation=cv2.INTER_NEAREST)
        mask = (mask > 127).astype(np.float32)
        mask_tensor = torch.from_numpy(mask).unsqueeze(0)  # (1, H, W)

        return img_tensor, mask_tensor

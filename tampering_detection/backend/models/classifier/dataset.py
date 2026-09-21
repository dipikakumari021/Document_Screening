"""
models/classifier/dataset.py

Expects a directory layout like:

    datasets/classifier/
        train/
            original/
                *.jpg
            tampered/
                *.jpg
        val/
            original/
            tampered/

This works directly with CASIA, Coverage, Columbia, and a passport dataset
once you've split each into original/ vs tampered/ (their standard release
layout differs slightly, so a small `scripts/prepare_classifier_data.py`
is where you'd normalize file names into this structure — see README).
"""

import os
from pathlib import Path
from torch.utils.data import Dataset
import sys

sys.path.append(str(Path(__file__).resolve().parents[2]))  # backend/
from utils.preprocessing import load_image_bgr, bgr_to_rgb, classifier_transform  # noqa: E402

VALID_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


class ForgeryDataset(Dataset):
    def __init__(self, root_dir, image_size=224, train=True):
        self.root_dir = Path(root_dir)
        self.image_size = image_size
        self.transform = classifier_transform(image_size)
        self.samples = []  # (path, label) label=1 -> tampered, 0 -> original

        for label_name, label in (("original", 0), ("tampered", 1)):
            folder = self.root_dir / label_name
            if not folder.exists():
                continue
            for f in folder.iterdir():
                if f.suffix.lower() in VALID_EXT:
                    self.samples.append((str(f), label))

        if len(self.samples) == 0:
            raise RuntimeError(
                f"No images found under {self.root_dir}. Expected 'original/' and 'tampered/' subfolders."
            )

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img_bgr = load_image_bgr(path)
        img_rgb = bgr_to_rgb(img_bgr)
        tensor = self.transform(img_rgb)
        return tensor, float(label)

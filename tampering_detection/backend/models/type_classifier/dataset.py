"""
models/type_classifier/dataset.py

Expects a directory layout like:

    datasets/type_classifier/
        train/
            Text Edited/
            Photo Replaced/
            Copy Move/
            Splicing/
            Logo Edited/
            Stamp Edited/
        val/
            Text Edited/
            ...

Ideally each image here is already CROPPED to the tampered region (i.e.
the output of Model 2's mask -> bbox -> crop step), so this model learns
the same input distribution it will see at inference time.
"""

from pathlib import Path
import sys

from torch.utils.data import Dataset

sys.path.append(str(Path(__file__).resolve().parents[2]))  # backend/
from utils.preprocessing import load_image_bgr, bgr_to_rgb, classifier_transform  # noqa: E402
from models.type_classifier.model import CLASS_NAMES  # noqa: E402

VALID_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


class TypeDataset(Dataset):
    def __init__(self, root_dir, image_size=224):
        self.root_dir = Path(root_dir)
        self.image_size = image_size
        self.transform = classifier_transform(image_size)
        self.class_to_idx = {name: i for i, name in enumerate(CLASS_NAMES)}

        self.samples = []
        for class_name in CLASS_NAMES:
            folder = self.root_dir / class_name
            if not folder.exists():
                continue
            for f in folder.iterdir():
                if f.suffix.lower() in VALID_EXT:
                    self.samples.append((str(f), self.class_to_idx[class_name]))

        if len(self.samples) == 0:
            raise RuntimeError(
                f"No images found under {self.root_dir}. Expected one subfolder per class: {CLASS_NAMES}"
            )

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img_bgr = load_image_bgr(path)
        img_rgb = bgr_to_rgb(img_bgr)
        tensor = self.transform(img_rgb)
        return tensor, label

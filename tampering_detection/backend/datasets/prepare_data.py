"""
datasets/prepare_data.py

Small helper for splitting a flat folder of images into train/val, used
to bootstrap each of the three expected layouts:

    Classifier:      original/ , tampered/
    Segmenter:        images/ , masks/   (filenames must match)
    Type classifier:  one folder per class name

Usage examples:

    # 80/20 split of a binary original/tampered dataset
    python prepare_data.py split-classifier \
        --original_dir raw/CASIA/original \
        --tampered_dir raw/CASIA/tampered \
        --out_dir classifier

    # 80/20 split of an images/masks dataset
    python prepare_data.py split-segmenter \
        --images_dir raw/IMD2020/images \
        --masks_dir raw/IMD2020/masks \
        --out_dir segmenter

    # 80/20 split of a per-class folder dataset
    python prepare_data.py split-type \
        --source_dir raw/tampering_types \
        --out_dir type_classifier
"""

import argparse
import random
import shutil
from pathlib import Path

VALID_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}
SPLIT_RATIO = 0.8


def _list_images(folder: Path):
    return sorted([f for f in folder.iterdir() if f.suffix.lower() in VALID_EXT])


def _split(files, ratio=SPLIT_RATIO, seed=42):
    files = list(files)
    random.Random(seed).shuffle(files)
    cut = int(len(files) * ratio)
    return files[:cut], files[cut:]


def split_classifier(original_dir, tampered_dir, out_dir):
    original_dir, tampered_dir, out_dir = Path(original_dir), Path(tampered_dir), Path(out_dir)
    for split_name, files_by_label in _build_classifier_splits(original_dir, tampered_dir):
        for label, files in files_by_label.items():
            dest = out_dir / split_name / label
            dest.mkdir(parents=True, exist_ok=True)
            for f in files:
                shutil.copy2(f, dest / f.name)
    print(f"Done. Wrote train/val splits to {out_dir}")


def _build_classifier_splits(original_dir, tampered_dir):
    orig_train, orig_val = _split(_list_images(original_dir))
    tamp_train, tamp_val = _split(_list_images(tampered_dir))
    yield "train", {"original": orig_train, "tampered": tamp_train}
    yield "val", {"original": orig_val, "tampered": tamp_val}


def split_segmenter(images_dir, masks_dir, out_dir):
    images_dir, masks_dir, out_dir = Path(images_dir), Path(masks_dir), Path(out_dir)
    images = _list_images(images_dir)
    train_files, val_files = _split(images)

    for split_name, files in (("train", train_files), ("val", val_files)):
        img_dest = out_dir / split_name / "images"
        mask_dest = out_dir / split_name / "masks"
        img_dest.mkdir(parents=True, exist_ok=True)
        mask_dest.mkdir(parents=True, exist_ok=True)
        for f in files:
            mask_candidates = list(masks_dir.glob(f.stem + ".*"))
            if not mask_candidates:
                print(f"[skip] no mask found for {f.name}")
                continue
            shutil.copy2(f, img_dest / f.name)
            shutil.copy2(mask_candidates[0], mask_dest / mask_candidates[0].name)
    print(f"Done. Wrote train/val splits to {out_dir}")


def split_type(source_dir, out_dir):
    source_dir, out_dir = Path(source_dir), Path(out_dir)
    for class_dir in sorted(source_dir.iterdir()):
        if not class_dir.is_dir():
            continue
        train_files, val_files = _split(_list_images(class_dir))
        for split_name, files in (("train", train_files), ("val", val_files)):
            dest = out_dir / split_name / class_dir.name
            dest.mkdir(parents=True, exist_ok=True)
            for f in files:
                shutil.copy2(f, dest / f.name)
    print(f"Done. Wrote train/val splits to {out_dir}")


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)

    p1 = sub.add_parser("split-classifier")
    p1.add_argument("--original_dir", required=True)
    p1.add_argument("--tampered_dir", required=True)
    p1.add_argument("--out_dir", required=True)

    p2 = sub.add_parser("split-segmenter")
    p2.add_argument("--images_dir", required=True)
    p2.add_argument("--masks_dir", required=True)
    p2.add_argument("--out_dir", required=True)

    p3 = sub.add_parser("split-type")
    p3.add_argument("--source_dir", required=True)
    p3.add_argument("--out_dir", required=True)

    args = parser.parse_args()
    if args.command == "split-classifier":
        split_classifier(args.original_dir, args.tampered_dir, args.out_dir)
    elif args.command == "split-segmenter":
        split_segmenter(args.images_dir, args.masks_dir, args.out_dir)
    elif args.command == "split-type":
        split_type(args.source_dir, args.out_dir)


if __name__ == "__main__":
    main()

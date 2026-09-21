"""
models/segmenter/train.py

Trains Model 2 (U-Net tampered-region segmenter) and saves the best
checkpoint to best_unet.pt, matching the "Folder Structure" diagram.

Usage:
    python train.py --data_dir ../../datasets/segmenter --epochs 40
"""

import argparse
import sys
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

sys.path.append(str(Path(__file__).resolve().parent))
from model import build_model  # noqa: E402
from dataset import SegmentationDataset  # noqa: E402


def dice_loss(probs, targets, eps=1e-6):
    probs = probs.contiguous().view(probs.size(0), -1)
    targets = targets.contiguous().view(targets.size(0), -1)
    intersection = (probs * targets).sum(dim=1)
    union = probs.sum(dim=1) + targets.sum(dim=1)
    dice = (2 * intersection + eps) / (union + eps)
    return 1 - dice.mean()


def iou_score(probs, targets, threshold=0.5, eps=1e-6):
    preds = (probs > threshold).float()
    intersection = (preds * targets).sum(dim=(1, 2, 3))
    union = ((preds + targets) > 0).float().sum(dim=(1, 2, 3))
    return ((intersection + eps) / (union + eps)).mean().item()


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--data_dir", type=str, default="../../datasets/segmenter")
    p.add_argument("--epochs", type=int, default=40)
    p.add_argument("--batch_size", type=int, default=8)
    p.add_argument("--lr", type=float, default=1e-4)
    p.add_argument("--image_size", type=int, default=256)
    p.add_argument("--arch", type=str, default="unet", choices=["unet", "deeplabv3plus"])
    p.add_argument("--out", type=str, default="best_unet.pt")
    p.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    return p.parse_args()


def run_epoch(model, loader, bce, optimizer, device, train=True):
    model.train() if train else model.eval()
    total_loss, total_iou = 0.0, 0.0

    context = torch.enable_grad() if train else torch.no_grad()
    with context:
        for images, masks in loader:
            images, masks = images.to(device), masks.to(device)

            if train:
                optimizer.zero_grad()

            logits = model(images)
            probs = torch.sigmoid(logits)

            loss = bce(logits, masks) + dice_loss(probs, masks)

            if train:
                loss.backward()
                optimizer.step()

            total_loss += loss.item() * images.size(0)
            total_iou += iou_score(probs.detach(), masks) * images.size(0)

    n = len(loader.dataset)
    return total_loss / n, total_iou / n


def main():
    args = parse_args()
    device = torch.device(args.device)

    train_ds = SegmentationDataset(Path(args.data_dir) / "train", image_size=args.image_size)
    val_ds = SegmentationDataset(Path(args.data_dir) / "val", image_size=args.image_size)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=4)

    model = build_model(arch=args.arch, pretrained=True).to(device)
    bce = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_iou = -1.0
    for epoch in range(1, args.epochs + 1):
        train_loss, train_iou = run_epoch(model, train_loader, bce, optimizer, device, train=True)
        val_loss, val_iou = run_epoch(model, val_loader, bce, optimizer, device, train=False)
        scheduler.step()

        print(f"[Epoch {epoch}/{args.epochs}] "
              f"train_loss={train_loss:.4f} train_iou={train_iou:.4f} | "
              f"val_loss={val_loss:.4f} val_iou={val_iou:.4f}")

        if val_iou > best_iou:
            best_iou = val_iou
            torch.save({
                "model_state_dict": model.state_dict(),
                "arch": args.arch,
                "val_iou": val_iou,
                "epoch": epoch,
            }, args.out)
            print(f"  -> saved new best checkpoint to {args.out} (val_iou={val_iou:.4f})")

    print(f"Training complete. Best val IoU: {best_iou:.4f}. Checkpoint: {args.out}")


if __name__ == "__main__":
    main()

"""
models/classifier/train.py

Trains Model 1 (EfficientNet-B0 tampered/original classifier) and saves
the best checkpoint to best_classifier.pt, matching the "Folder Structure"
diagram.

Usage:
    python train.py --data_dir ../../datasets/classifier --epochs 20
"""

import argparse
import sys
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import accuracy_score, roc_auc_score

sys.path.append(str(Path(__file__).resolve().parent))
from model import build_model  # noqa: E402
from dataset import ForgeryDataset  # noqa: E402


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--data_dir", type=str, default="../../datasets/classifier",
                    help="Contains train/ and val/ subfolders, each with original/ and tampered/")
    p.add_argument("--epochs", type=int, default=20)
    p.add_argument("--batch_size", type=int, default=32)
    p.add_argument("--lr", type=float, default=3e-4)
    p.add_argument("--image_size", type=int, default=224)
    p.add_argument("--out", type=str, default="best_classifier.pt")
    p.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    return p.parse_args()


def run_epoch(model, loader, criterion, optimizer, device, train=True):
    model.train() if train else model.eval()
    total_loss, all_labels, all_probs = 0.0, [], []

    context = torch.enable_grad() if train else torch.no_grad()
    with context:
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device).float()

            if train:
                optimizer.zero_grad()

            logits = model(images).squeeze(1)
            loss = criterion(logits, labels)

            if train:
                loss.backward()
                optimizer.step()

            total_loss += loss.item() * images.size(0)
            probs = torch.sigmoid(logits).detach().cpu().numpy()
            all_probs.extend(probs.tolist())
            all_labels.extend(labels.cpu().numpy().tolist())

    avg_loss = total_loss / len(loader.dataset)
    preds = [1 if p >= 0.5 else 0 for p in all_probs]
    acc = accuracy_score(all_labels, preds)
    try:
        auc = roc_auc_score(all_labels, all_probs)
    except ValueError:
        auc = float("nan")  # only one class present in a small val split
    return avg_loss, acc, auc


def main():
    args = parse_args()
    device = torch.device(args.device)

    train_ds = ForgeryDataset(Path(args.data_dir) / "train", image_size=args.image_size)
    val_ds = ForgeryDataset(Path(args.data_dir) / "val", image_size=args.image_size)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=4)

    model = build_model(pretrained=True).to(device)
    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_auc = -1.0
    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc, train_auc = run_epoch(model, train_loader, criterion, optimizer, device, train=True)
        val_loss, val_acc, val_auc = run_epoch(model, val_loader, criterion, optimizer, device, train=False)
        scheduler.step()

        print(f"[Epoch {epoch}/{args.epochs}] "
              f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} train_auc={train_auc:.4f} | "
              f"val_loss={val_loss:.4f} val_acc={val_acc:.4f} val_auc={val_auc:.4f}")

        if val_auc > best_auc:
            best_auc = val_auc
            torch.save({
                "model_state_dict": model.state_dict(),
                "val_auc": val_auc,
                "val_acc": val_acc,
                "epoch": epoch,
            }, args.out)
            print(f"  -> saved new best checkpoint to {args.out} (val_auc={val_auc:.4f})")

    print(f"Training complete. Best val AUC: {best_auc:.4f}. Checkpoint: {args.out}")


if __name__ == "__main__":
    main()

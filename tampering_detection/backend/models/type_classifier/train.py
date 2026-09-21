"""
models/type_classifier/train.py

Trains Model 3 (tampering-type classifier) and saves the best checkpoint
to best_type.pt, matching the "Folder Structure" diagram.

Usage:
    python train.py --data_dir ../../datasets/type_classifier --epochs 25
"""

import argparse
import sys
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import accuracy_score, f1_score

sys.path.append(str(Path(__file__).resolve().parent))
from model import build_model, CLASS_NAMES  # noqa: E402
from dataset import TypeDataset  # noqa: E402


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--data_dir", type=str, default="../../datasets/type_classifier")
    p.add_argument("--epochs", type=int, default=25)
    p.add_argument("--batch_size", type=int, default=32)
    p.add_argument("--lr", type=float, default=3e-4)
    p.add_argument("--image_size", type=int, default=224)
    p.add_argument("--arch", type=str, default="resnet50", choices=["resnet50", "efficientnet"])
    p.add_argument("--out", type=str, default="best_type.pt")
    p.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    return p.parse_args()


def run_epoch(model, loader, criterion, optimizer, device, train=True):
    model.train() if train else model.eval()
    total_loss, all_labels, all_preds = 0.0, [], []

    context = torch.enable_grad() if train else torch.no_grad()
    with context:
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)

            if train:
                optimizer.zero_grad()

            logits = model(images)
            loss = criterion(logits, labels)

            if train:
                loss.backward()
                optimizer.step()

            total_loss += loss.item() * images.size(0)
            preds = logits.argmax(dim=1).detach().cpu().tolist()
            all_preds.extend(preds)
            all_labels.extend(labels.cpu().tolist())

    avg_loss = total_loss / len(loader.dataset)
    acc = accuracy_score(all_labels, all_preds)
    f1 = f1_score(all_labels, all_preds, average="macro")
    return avg_loss, acc, f1


def main():
    args = parse_args()
    device = torch.device(args.device)

    train_ds = TypeDataset(Path(args.data_dir) / "train", image_size=args.image_size)
    val_ds = TypeDataset(Path(args.data_dir) / "val", image_size=args.image_size)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=4)

    model = build_model(arch=args.arch, pretrained=True).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_f1 = -1.0
    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc, train_f1 = run_epoch(model, train_loader, criterion, optimizer, device, train=True)
        val_loss, val_acc, val_f1 = run_epoch(model, val_loader, criterion, optimizer, device, train=False)
        scheduler.step()

        print(f"[Epoch {epoch}/{args.epochs}] "
              f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} train_f1={train_f1:.4f} | "
              f"val_loss={val_loss:.4f} val_acc={val_acc:.4f} val_f1={val_f1:.4f}")

        if val_f1 > best_f1:
            best_f1 = val_f1
            torch.save({
                "model_state_dict": model.state_dict(),
                "arch": args.arch,
                "class_names": CLASS_NAMES,
                "val_f1": val_f1,
                "epoch": epoch,
            }, args.out)
            print(f"  -> saved new best checkpoint to {args.out} (val_f1={val_f1:.4f})")

    print(f"Training complete. Best val macro-F1: {best_f1:.4f}. Checkpoint: {args.out}")


if __name__ == "__main__":
    main()

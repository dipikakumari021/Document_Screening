"""
models/type_classifier/model.py

Model 3 — Classify Tampering Type.
Backbone: ResNet50 by default (EfficientNet-B0 offered as an alternative),
multiclass head over the 6 classes from the diagram.
"""

import torch
import torch.nn as nn
from torchvision.models import resnet50, ResNet50_Weights, efficientnet_b0, EfficientNet_B0_Weights

CLASS_NAMES = [
    "Text Edited",
    "Photo Replaced",
    "Copy Move",
    "Splicing",
    "Logo Edited",
    "Stamp Edited",
]


class TamperingTypeClassifier(nn.Module):
    def __init__(self, num_classes: int = len(CLASS_NAMES), arch: str = "resnet50", pretrained: bool = True):
        super().__init__()
        self.arch = arch
        if arch == "resnet50":
            weights = ResNet50_Weights.DEFAULT if pretrained else None
            self.backbone = resnet50(weights=weights)
            in_features = self.backbone.fc.in_features
            self.backbone.fc = nn.Sequential(
                nn.Dropout(p=0.3),
                nn.Linear(in_features, num_classes),
            )
        elif arch == "efficientnet":
            weights = EfficientNet_B0_Weights.DEFAULT if pretrained else None
            self.backbone = efficientnet_b0(weights=weights)
            in_features = self.backbone.classifier[1].in_features
            self.backbone.classifier = nn.Sequential(
                nn.Dropout(p=0.3, inplace=True),
                nn.Linear(in_features, num_classes),
            )
        else:
            raise ValueError(f"Unknown arch: {arch}")

    def forward(self, x):
        return self.backbone(x)  # raw logits, shape (B, num_classes)

    @torch.no_grad()
    def predict(self, x):
        self.eval()
        logits = self.forward(x)
        probs = torch.softmax(logits, dim=1)
        conf, idx = probs.max(dim=1)
        return [CLASS_NAMES[i] for i in idx.tolist()], conf.tolist()


def build_model(arch: str = "resnet50", pretrained: bool = True) -> TamperingTypeClassifier:
    return TamperingTypeClassifier(arch=arch, pretrained=pretrained)

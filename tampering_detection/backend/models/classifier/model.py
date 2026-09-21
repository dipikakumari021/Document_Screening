"""
models/classifier/model.py

Model 1 — Tampered or Not.
Backbone: EfficientNet-B0 (torchvision), binary output (sigmoid probability
that the document is TAMPERED).
"""

import torch
import torch.nn as nn
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights


class ForgeryClassifier(nn.Module):
    def __init__(self, pretrained: bool = True):
        super().__init__()
        weights = EfficientNet_B0_Weights.DEFAULT if pretrained else None
        self.backbone = efficientnet_b0(weights=weights)

        in_features = self.backbone.classifier[1].in_features
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(p=0.3, inplace=True),
            nn.Linear(in_features, 1),  # single logit: P(tampered)
        )

    def forward(self, x):
        return self.backbone(x)  # raw logit; apply sigmoid outside for probability

    @torch.no_grad()
    def predict_proba(self, x):
        self.eval()
        logit = self.forward(x)
        return torch.sigmoid(logit)


def build_model(pretrained: bool = True) -> ForgeryClassifier:
    return ForgeryClassifier(pretrained=pretrained)

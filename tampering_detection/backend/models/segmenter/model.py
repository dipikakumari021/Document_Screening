"""
models/segmenter/model.py

Model 2 — Locate Tampered Area.
A standard U-Net producing a single-channel binary mask (probability that
each pixel belongs to a tampered/edited region). DeepLabV3+ is offered as
a drop-in alternative below via build_model(arch="deeplabv3plus"), using
torchvision's DeepLabV3 with a ResNet50 backbone re-headed to 1 channel.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision.models.segmentation import deeplabv3_resnet50, DeepLabV3_ResNet50_Weights


class DoubleConv(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.block(x)


class Down(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.pool_conv = nn.Sequential(nn.MaxPool2d(2), DoubleConv(in_ch, out_ch))

    def forward(self, x):
        return self.pool_conv(x)


class Up(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.up = nn.ConvTranspose2d(in_ch, in_ch // 2, kernel_size=2, stride=2)
        self.conv = DoubleConv(in_ch, out_ch)

    def forward(self, x1, x2):
        x1 = self.up(x1)
        diff_y = x2.size(2) - x1.size(2)
        diff_x = x2.size(3) - x1.size(3)
        x1 = F.pad(x1, [diff_x // 2, diff_x - diff_x // 2, diff_y // 2, diff_y - diff_y // 2])
        x = torch.cat([x2, x1], dim=1)
        return self.conv(x)


class UNet(nn.Module):
    """Classic U-Net, 3-channel input -> 1-channel logit mask."""

    def __init__(self, in_channels=3, out_channels=1, base_ch=64):
        super().__init__()
        self.inc = DoubleConv(in_channels, base_ch)
        self.down1 = Down(base_ch, base_ch * 2)
        self.down2 = Down(base_ch * 2, base_ch * 4)
        self.down3 = Down(base_ch * 4, base_ch * 8)
        self.down4 = Down(base_ch * 8, base_ch * 16)

        self.up1 = Up(base_ch * 16, base_ch * 8)
        self.up2 = Up(base_ch * 8, base_ch * 4)
        self.up3 = Up(base_ch * 4, base_ch * 2)
        self.up4 = Up(base_ch * 2, base_ch)
        self.outc = nn.Conv2d(base_ch, out_channels, kernel_size=1)

    def forward(self, x):
        x1 = self.inc(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        x4 = self.down3(x3)
        x5 = self.down4(x4)

        x = self.up1(x5, x4)
        x = self.up2(x, x3)
        x = self.up3(x, x2)
        x = self.up4(x, x1)
        return self.outc(x)  # raw logits, shape (B, 1, H, W)

    @torch.no_grad()
    def predict_mask(self, x):
        self.eval()
        logits = self.forward(x)
        return torch.sigmoid(logits)


class DeepLabV3PlusWrapper(nn.Module):
    """Alternative backbone: torchvision DeepLabV3 (ResNet50), re-headed to 1 output channel."""

    def __init__(self, pretrained: bool = True):
        super().__init__()
        weights = DeepLabV3_ResNet50_Weights.DEFAULT if pretrained else None
        self.net = deeplabv3_resnet50(weights=weights)
        self.net.classifier[4] = nn.Conv2d(256, 1, kernel_size=1)
        if self.net.aux_classifier is not None:
            self.net.aux_classifier[4] = nn.Conv2d(256, 1, kernel_size=1)

    def forward(self, x):
        return self.net(x)["out"]  # (B, 1, H, W) raw logits

    @torch.no_grad()
    def predict_mask(self, x):
        self.eval()
        logits = self.forward(x)
        return torch.sigmoid(logits)


def build_model(arch: str = "unet", pretrained: bool = True):
    if arch == "unet":
        return UNet()
    elif arch == "deeplabv3plus":
        return DeepLabV3PlusWrapper(pretrained=pretrained)
    raise ValueError(f"Unknown arch: {arch}")

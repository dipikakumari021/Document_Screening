"""
utils/preprocessing.py

Shared image preprocessing utilities used by Model 1 (classifier),
Model 2 (segmenter) and Model 3 (type classifier), and by the FastAPI
backend at inference time.
"""

import cv2
import numpy as np
import torch
from torchvision import transforms

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def load_image_bgr(path_or_bytes):
    """Load an image from a file path or raw bytes into a BGR numpy array (OpenCV convention)."""
    if isinstance(path_or_bytes, (bytes, bytearray)):
        arr = np.frombuffer(path_or_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    else:
        img = cv2.imread(str(path_or_bytes), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Could not decode image: {path_or_bytes}")
    return img


def bgr_to_rgb(img_bgr):
    return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)


def denoise_and_normalize(img_bgr):
    """
    Light OpenCV preprocessing pass applied before any model sees the image:
    mild denoise + contrast normalization. Keeps geometry unchanged so that
    Model 2's output mask coordinates stay valid on the original image.
    """
    img = cv2.fastNlMeansDenoisingColored(img_bgr, None, h=3, hColor=3,
                                           templateWindowSize=7, searchWindowSize=21)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    lab = cv2.merge((l, a, b))
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def classifier_transform(image_size=224):
    """Transform for Model 1 (EfficientNet-B0) and Model 3 (ResNet50/EfficientNet)."""
    return transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def segmenter_transform(image_size=256):
    """Transform for Model 2 (U-Net). Masks are resized with nearest-neighbor separately."""
    return transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def to_model_input(img_bgr, image_size=224):
    """Convenience: raw BGR image -> normalized tensor batch of size 1, ready for model.forward()."""
    rgb = bgr_to_rgb(img_bgr)
    tfm = classifier_transform(image_size)
    tensor = tfm(rgb)
    return tensor.unsqueeze(0)

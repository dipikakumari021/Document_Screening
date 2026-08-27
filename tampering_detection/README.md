# Document Forgery Detection Pipeline

A 3-model pipeline that takes a document image and returns whether it was
tampered with, where, and how.

```
Upload Image -> OpenCV preprocessing -> Model 1 (Tampered/Original)
  -> [if tampered] Model 2 (Locate Region) -> Crop ROI
  -> Model 3 (Tampering Type) -> JSON response
```

## Folder structure

```
project/
  backend/
    models/
      classifier/        Model 1 — EfficientNet-B0, tampered vs original
        model.py
        dataset.py
        train.py           -> produces best_classifier.pt
      segmenter/          Model 2 — U-Net (or DeepLabV3+), region mask
        model.py
        dataset.py
        train.py           -> produces best_unet.pt
      type_classifier/    Model 3 — ResNet50 (or EfficientNet), 6-way type
        model.py
        dataset.py
        train.py           -> produces best_type.pt
    api/
      predict.py         chains all 3 models into one pipeline
      main.py             FastAPI app (POST /predict)
    utils/
      preprocessing.py    OpenCV denoise/CLAHE + tensor transforms
      postprocessing.py   mask -> bbox, crop, JSON assembly
    datasets/
      prepare_data.py     splits raw datasets into train/val layouts
    requirements.txt
```

## 1. Install

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## 2. Prepare datasets

Each model expects its own directory layout under `datasets/`. Use the
helper script to turn a raw dataset (CASIA, Coverage, Columbia, IMD2020,
Fantastic Reality, etc.) into the expected train/val split:

```bash
# Model 1 data (binary): CASIA/Coverage/Columbia/passport dataset
python datasets/prepare_data.py split-classifier \
    --original_dir /path/to/raw/original \
    --tampered_dir /path/to/raw/tampered \
    --out_dir datasets/classifier

# Model 2 data (masks): IMD2020 / Fantastic Reality / CASIA masks
python datasets/prepare_data.py split-segmenter \
    --images_dir /path/to/raw/images \
    --masks_dir /path/to/raw/masks \
    --out_dir datasets/segmenter

# Model 3 data (typed crops), one folder per class:
#   Text Edited / Photo Replaced / Copy Move / Splicing / Logo Edited / Stamp Edited
python datasets/prepare_data.py split-type \
    --source_dir /path/to/raw/tampering_types \
    --out_dir datasets/type_classifier
```

## 3. Train each model (Steps 1–3)

```bash
cd models/classifier
python train.py --data_dir ../../datasets/classifier --epochs 20
# -> best_classifier.pt

cd ../segmenter
python train.py --data_dir ../../datasets/segmenter --epochs 40
# -> best_unet.pt      (use --arch deeplabv3plus for the DeepLabV3+ alternative)

cd ../type_classifier
python train.py --data_dir ../../datasets/type_classifier --epochs 25
# -> best_type.pt      (use --arch efficientnet for the EfficientNet alternative)
```

Copy each `best_*.pt` into its model folder if you trained elsewhere —
`api/predict.py` looks for them at:

```
models/classifier/best_classifier.pt
models/segmenter/best_unet.pt
models/type_classifier/best_type.pt
```

## 4. Run inference directly (no server)

```bash
cd backend
python api/predict.py path/to/document.jpg
```

```json
{
  "tampered": true,
  "confidence": 0.974,
  "tampering_type": "Photo Replaced",
  "region": [[420, 180], [670, 450]]
}
```

## 5. Run the API

```bash
cd backend
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

```bash
curl -X POST http://localhost:8000/predict \
  -F "file=@document.jpg"
```

```json
{
  "tampered": true,
  "confidence": 0.984,
  "tampering_type": "Photo Replaced",
  "region": [[420, 180], [670, 450]],
  "inference_time_ms": 187.3
}
```

## Tech stack

| Module              | Model                     |
|---------------------|---------------------------|
| Binary Detection     | EfficientNet-B0           |
| Localization         | U-Net / DeepLabV3+        |
| Tampering Type       | ResNet50 or EfficientNet  |
| Image Processing     | OpenCV                    |
| Backend              | FastAPI                   |
| Framework            | PyTorch                   |

## Notes / production considerations

- **Threshold tuning**: `ForgeryDetectionPipeline(classifier_threshold=...)`
  controls the Model 1 cutoff (default 0.5) — raise it to reduce false
  positives, lower it to catch subtler edits.
- **No-checkpoint fallback**: if a `best_*.pt` file is missing, the pipeline
  still loads (ImageNet-pretrained backbone, untrained head) so you can
  smoke-test the API wiring before any training finishes — it will just
  produce meaningless predictions until real weights are in place.
- **Bounding box fallback**: if Model 1 says tampered but Model 2's mask has
  no connected region above `min_area`, the API returns
  `"tampering_type": "Unknown", "region": null` rather than guessing.
- **GPU vs CPU**: all three `build_model()`/pipeline constructors auto-detect
  CUDA; override with `--device cpu` (training) or `device="cpu"`
  (`ForgeryDetectionPipeline`) to force CPU.

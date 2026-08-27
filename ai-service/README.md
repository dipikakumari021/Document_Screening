# AI Service — OCR Module

Your piece of the ID-Shield architecture: OCR + MRZ extraction and checksum
validation, exposed as a FastAPI microservice the Node backend calls over
HTTP. No business logic (risk scoring, DB lookups) lives here on purpose —
that stays in Node, per the team's architecture doc.

## What's in here

| File | Purpose |
|---|---|
| `mrz_parser.py` | Pure logic: parses TD3 (2x44) passport MRZ text, validates ICAO 9303 check digits. No image/OCR dependency — unit-testable on its own. |
| `ocr_module.py` | Image preprocessing + Tesseract calls. Crops the MRZ band, OCRs it, cross-checks the printed name against the MRZ. Returns the agreed contract shape. |
| `main.py` | FastAPI app. `POST /ocr` — the endpoint your teammates'/Node's code calls. `GET /health` for a liveness check. |
| `requirements.txt` / `Dockerfile` | Deployment. |
| `tests/` | Synthetic-passport generator + full pipeline test (no real passport image needed to verify the logic). |

The Next.js side lives at `src/app/api/ocr/route.ts` in the repo root — it
proxies to this service's `POST /ocr` endpoint (set `AI_SERVICE_URL` in
`.env.local`, see `.env.example`).

## Running it

```bash
cd ai-service
pip install -r requirements.txt --break-system-packages   # or use a venv
python3 tests/test_ocr_pipeline.py                        # sanity check: should print ALL TESTS PASSED
uvicorn main:app --reload --port 8000
```

Then either open `http://localhost:8000/docs` (FastAPI's interactive
Swagger UI — great for demoing this module standalone to mentors before
the full pipeline is wired up), or:

```bash
curl -s http://localhost:8000/health
```

## Testing without a real passport image

`tests/generate_synthetic_passport.py` renders a fake passport bio-page PNG
with a **correctly checksummed MRZ** baked in (via `mrz_parser.compute_check_digit`,
so it's the real ICAO algorithm, not made up). `tests/test_ocr_pipeline.py`
runs that image through the *actual* `run_ocr()` function — full pipeline,
not mocked — and asserts the extracted fields match what was rendered.

This proves the parsing/checksum logic is correct independent of image
quality. It does **not** prove real-world OCR robustness (glare, blur, skewed
photos, low-res phone camera shots) — for that you need real or dummy sample
passport images. Ask your mentor/team if SIH provides a sample dataset, or
generate a few more synthetic variants (different names/countries) plus a
couple of intentionally-blurred/rotated ones to stress-test before the demo.

## The `/ocr` contract (what Node receives)

```json
{
  "name": "RAHUL SHARMA",
  "passport_no": "R1234567",
  "dob": "1999-08-14",
  "expiry": "2030-08-14",
  "nationality": "IND",
  "confidence": 0.664,
  "mrz": {
    "parsed_fields": { "...": "..." },
    "valid_checksum": true,
    "field_checks": { "passport_no": true, "dob": true, "expiry": true, "personal_no": true, "composite": true },
    "mrz_found": true,
    "raw_lines": ["P<INDSHARMA<<RAHUL<<...", "R1234567<5IND9908143M3008144<..."]
  },
  "printed_vs_mrz_match": true
}
```

Notes for whoever wires this into the risk engine:

- **`confidence`** is *not* raw Tesseract confidence — MRZ lines have no
  spaces so Tesseract's per-word confidence is noisy on them. It's a blend
  of OCR engine confidence and MRZ checksum validity (checksum passing is
  the stronger signal). Treat it as "how much should the officer trust this
  read," not "how sure was the OCR engine."
- **`mrz.valid_checksum`** is the single most important field for tampering
  detection — a forged/altered document number or DOB will fail the ICAO
  check digit even if the OCR read the altered text perfectly. Feed this
  into `mrzMismatch` in `calculateRisk()`.
- **`printed_vs_mrz_match`** catches a specific forgery pattern: someone
  altering the printed name but not (or incorrectly) updating the MRZ, or
  vice versa. Fuzzy-matched (not exact), since font/OCR noise makes exact
  string equality unreliable.
- All date fields are ISO `YYYY-MM-DD` strings or `null` — safe to pass
  straight into `new Date(...)` on the Node side, or store `null` when a
  field wasn't extracted.

## Integrating into the merged `/analyze` endpoint

Once your teammates' `tampering_module.py` and `face_module.py` exist,
`main.py` has a commented block showing exactly how to merge the three into
the single `/analyze` endpoint the architecture doc specifies. Until then,
`/ocr` is a fully working standalone service — the backend team can start
integrating against it today instead of waiting on the other two modules.

## Benchmarking against the Kaggle/HF dataset

We're using **[TrainingDataPro's "OCR GENERATED Machine-Readable Zone (MRZ) Text Detection" dataset](https://www.kaggle.com/datasets/trainingdatapro/ocr-machine-readable-zone-mrz-detection)** (also mirrored on [Hugging Face](https://huggingface.co/datasets/TrainingDataPro/ocr-generated-machine-readable-zone-mrz-text-detection)) — synthetic MRZ crops, CC-BY-NC-ND-4.0 licensed (non-commercial use with attribution — fine for this project, just credit TrainingDataPro if this goes in your report/slides).

1. Download the dataset zip from the Kaggle page (needs a Kaggle login) and extract it.
2. Put it at `ai-service/tests/kaggle_mrz_dataset/` so the layout looks like:
   ```
   tests/kaggle_mrz_dataset/
     images/
       0.png
       1.png
       ...
     annotations.xml
   ```
3. Run the benchmark:
   ```bash
   python3 tests/evaluate_kaggle_dataset.py --dataset-dir tests/kaggle_mrz_dataset
   ```

This reports character-level OCR accuracy and exact-line-match rate across every image, and writes a per-image `benchmark_results.csv` you can screenshot or graph for your SIH report/demo.

**Actual result on the full 40-image dataset (Aug 2026):**

| Metric | Result |
|---|---|
| Mean character-level accuracy | **99.7%** |
| Exact both-line match rate | **92.5%** (37/40) |

The 3 misses are all single-character confusions typical of monospace OCR at small pixel scale — worth knowing in case a judge asks about error cases:
- `images/14.png`: **U** misread as **Y** in the passport number (`UGBWB` → `YGBWB`)
- `images/24.png`: **SIEM** misread as **SITEM** (spurious inserted character)
- `images/20.png`: OCR actually read `NLD` correctly — the *dataset's own ground truth* has a typo (`NDL`) inconsistent with every other entry, so this one arguably isn't an OCR error at all

This first run also caught one real pipeline bug worth mentioning in your report as evidence of proper testing: the initial 50/50 line-split assumed MRZ text fills the whole crop, but this dataset's images have both MRZ lines sitting in the top ~43% of the frame with blank space below — cutting a naive half-split into that whitespace was losing line 2 entirely (48.6% accuracy). Fixed by detecting the actual text-row band via pixel density before splitting into lines (`_find_text_row_band()` in `ocr_module.py`).

**Important nuance to know before you present this:** this dataset's ground-truth MRZ strings are generated for OCR-detection benchmarking, not as valid ICAO 9303 documents — their check digits don't actually validate and some date fields aren't real calendar dates. So this benchmark measures **raw OCR read accuracy** (can Tesseract correctly read the pixels), not checksum-validation correctness. Checksum validation is proven separately by `tests/test_ocr_pipeline.py`, which uses a synthetic passport with a *properly* computed ICAO checksum. Between the two, you can honestly claim: "OCR read accuracy benchmarked against N external images; checksum/tamper-detection logic verified against the ICAO 9303 standard" — both real claims, from two different tests, for two different reasons.

## Docker

Already fits the team's `docker-compose.yml` `ai-service` block as-is —
this `Dockerfile` installs the `tesseract-ocr` system package (it's a
binary, not a pip package) plus the Python deps.

## Known limitations / things to mention in your SIH presentation

- Only TD3 (passport booklet, 2-line MRZ) is supported — not TD1 (ID-card,
  3-line MRZ) formats. Fine for a passport-screening MVP.
- Date pivot for 2-digit MRZ years assumes 00-30 → 2000s, 31-99 → 1900s.
  Standard heuristic, but worth a one-line disclaimer if asked.
- Real-world accuracy depends heavily on image quality — glare, skew, and
  low resolution all degrade Tesseract's read. If you have time left after
  the core pipeline works, adding a deskew/glare-check preprocessing step
  (or falling back to EasyOCR, which handles noisier images better than
  Tesseract at the cost of a much heavier install) is the highest-value
  next improvement, in that order.

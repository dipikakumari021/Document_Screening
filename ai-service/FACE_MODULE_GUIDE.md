# Face Verification Module — Build Guide

Your piece of the pipeline: given a passport/document photo + a live photo,
detect faces in both and decide if they're the same person. This matches
step 4 ("Face Verification") in the architecture diagram and the
`face_module.py` contract your team already agreed on.

---

## 1. Set up your environment

```bash
cd ai-service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

First run will be slow — `deepface` downloads the ArcFace model weights
(~ a few hundred MB) to `~/.deepface/weights/` on first use. Do this once,
ahead of time, not live during your demo.

If `pip install deepface` fails on `tensorflow`, that's almost always a
Python-version mismatch — DeepFace needs Python 3.9–3.11. Check with
`python --version` before debugging further.

---

## 2. Files you're getting

```
ai-service/
├── face_module.py                       # the module itself — drop-in
├── test_face_module.py                  # standalone CLI test
├── main_face_integration_example.py     # shows how it wires into /analyze
└── requirements.txt
```

`face_module.py` is self-contained and has no dependency on your
teammates' OCR/tampering code — you can develop and test it completely
independently, which matters a lot with only a week.

---

## 3. Test it standalone first

Don't wire anything into FastAPI yet. Grab a couple of test photos and run:

```bash
python test_face_module.py path/to/passport_photo.jpg path/to/selfie.jpg
```

You should see something like:

```json
{
  "similarity": 0.81,
  "match": true,
  "doc_face_detected": true,
  "live_face_detected": true
}
```

Run it against:
- **Same person, doc photo vs selfie** → should match, similarity usually 0.6–0.9
- **Different people** → should NOT match, similarity usually under 0.4
- **A photo with no face at all** → `doc_face_detected: false`, no crash
- **A dark/blurry selfie** → check it still detects a face; if not, that's
  useful to know now, not during the demo

Log the similarity scores you get across ~10 test pairs. That data is what
you'll use to sanity-check `SIMILARITY_MATCH_THRESHOLD` in `face_module.py`
— 0.55 is a reasonable starting point but real threshold tuning depends on
which model/detector you land on and your actual test photos.

---

## 4. Wire it into the shared service

Once OCR and tampering modules exist, `main.py` (owned collectively) should
look like `main_face_integration_example.py`'s `/analyze` handler — each
teammate's module gets called and its result merged into one response dict.
Until then, use the standalone `/verify-face` endpoint to keep testing over
HTTP:

```bash
uvicorn main_face_integration_example:app --reload --port 8000
```

```bash
curl -X POST http://localhost:8000/verify-face \
  -H "Content-Type: application/json" \
  -d '{
    "passport_image_base64": "'"$(base64 -i passport.jpg)"'",
    "live_image_base64": "'"$(base64 -i selfie.jpg)"'"
  }'
```

---

## 5. Design decisions baked into `face_module.py` (and why)

- **`enforce_detection=True`** — if DeepFace can't find a face, it raises
  instead of silently returning garbage. We catch that and turn it into
  `doc_face_detected: false` / `live_face_detected: false`, which your
  Node risk engine can treat as its own risk signal (a passport with no
  detectable face is itself suspicious).
- **Largest face wins** — passport images sometimes have a second small
  face (e.g. in a hologram or stamp). If DeepFace detects multiple faces,
  we take the one with the largest bounding box, since that's reliably the
  portrait.
- **Cosine similarity rescaled to [0, 1]** — raw cosine similarity is
  [-1, 1]; rescaling makes it a clean 0–100% "similarity score" for your
  Result page UI without extra logic on the frontend.
- **The module never raises** — `run_face_verification` always returns the
  full shape, even on decode failure or garbage input. This matters because
  it's called from an orchestration endpoint (`/analyze`) where one bad
  image shouldn't 500 the whole screening.

---

## 6. Known edge cases worth handling before the demo

- **EXIF rotation** — phone selfies are frequently stored sideways with an
  EXIF orientation flag. `PIL.Image.open()` doesn't auto-rotate. If you see
  detection randomly failing on phone-captured selfies, add
  `ImageOps.exif_transpose(img)` after opening. Worth testing with actual
  phone photos, not just downloaded sample images.
- **Passport photos are small and low-res** — that's exactly why
  `retinaface` (rather than the faster but weaker `opencv` backend) is set
  as the default detector. If detection is too slow on your dev machine,
  swap to `"mtcnn"` as a middle ground before dropping to `"opencv"`.
- **Glasses / masks / heavy shadows** — expect similarity scores to drop
  even for genuine matches. Worth testing at least once so you're not
  caught off guard mid-demo.
- **Threshold is a business decision, not just a technical one** — a lower
  threshold means fewer false rejections (legit travelers flagged) but more
  false accepts (impostors waved through). For a hackathon demo, err toward
  a threshold that reliably matches your own test photos rather than
  chasing a "textbook" number.

---

## 7. If you have a spare day: upgrading to InsightFace

Your team's diagram lists InsightFace alongside DeepFace — it's the
better choice for a real deployment (faster, and specifically tuned for
this kind of identity-verification use case). It's more setup, so treat it
as a stretch goal, not the priority.

```bash
pip install insightface onnxruntime
```

```python
import insightface
from insightface.app import FaceAnalysis

face_app = FaceAnalysis(name="buffalo_l")
face_app.prepare(ctx_id=0, det_size=(640, 640))   # ctx_id=-1 for CPU-only

def get_embedding(img_array):
    faces = face_app.get(img_array)
    if not faces:
        return None
    faces.sort(key=lambda f: f.bbox[2] * f.bbox[3], reverse=True)
    return faces[0].embedding   # already L2-normalizable, 512-dim
```

The rest of `face_module.py` — decoding, cosine similarity, the public
`run_face_verification` contract — stays identical. Only `_extract_embedding`
changes. That's by design: keep the module's public interface stable so
swapping the underlying model doesn't ripple into main.py or Node.

---

## 8. Docker note

Your team's `docker-compose.yml` already has an `ai-service` container.
One thing to add to the ai-service `Dockerfile` (not shown in the compose
snippet, but needed): DeepFace/OpenCV need `libgl1` on slim Debian images,
or you'll hit an `ImportError: libGL.so.1` at container startup:

```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Also mount or bake in the DeepFace weights cache so the container isn't
re-downloading ~300MB on every rebuild — either `COPY` your local
`~/.deepface` cache into the image, or add a volume for it in compose.

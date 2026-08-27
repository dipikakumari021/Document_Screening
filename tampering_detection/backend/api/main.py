"""
api/main.py

FastAPI backend implementing the "Backend Integration" diagram:

    Upload Image -> OpenCV -> Model 1 -> Model 2 -> Crop ROI -> Model 3 -> Response

Run with:
    uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
(run from inside backend/, so the `api` package resolves)
"""

from pathlib import Path
import sys
import time

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

sys.path.append(str(Path(__file__).resolve().parents[1]))  # backend/
from api.predict import get_pipeline  # noqa: E402

app = FastAPI(
    title="Document Forgery Detection API",
    description="3-model pipeline: forgery classification -> tampered region "
                "localization -> tampering type classification.",
    version="1.0.0",
)

# Adjust origins for your actual frontend in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/bmp", "image/tiff", "image/webp"}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB


@app.on_event("startup")
def load_models():
    # Warms up / caches the pipeline (and all 3 checkpoints) once at startup
    # instead of on the first request.
    app.state.pipeline = get_pipeline()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported content type: {file.content_type}")

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 15MB).")
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    pipeline = app.state.pipeline
    start = time.time()
    try:
        result = pipeline.predict(raw)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")
    result["inference_time_ms"] = round((time.time() - start) * 1000, 1)

    return JSONResponse(content=result)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)

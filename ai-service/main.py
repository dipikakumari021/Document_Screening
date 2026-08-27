"""
main.py
-------
FastAPI entrypoint for the AI service.

Right now this exposes OCR as its own standalone endpoint
(POST /ocr) so you can build, test, and demo your module in complete
isolation from your teammates' tampering-detection and face-verification
work.

When the three of you are ready to merge, the combined endpoint looks
like this (per the architecture doc) — uncomment / adapt once the other
two modules exist:

    from tampering_module import run_tampering_check
    from face_module import run_face_verification

    @app.post("/analyze")
    async def analyze(payload: AnalyzeRequest):
        ocr_result = run_ocr(payload.passport_image_base64)
        tampering_result = run_tampering_check(payload.passport_image_base64)
        face_result = run_face_verification(
            payload.passport_image_base64, payload.live_image_base64
        )
        return {"ocr": ocr_result, "tampering": tampering_result, "face": face_result}

Until then, /ocr alone is a fully working, independently testable service
that the Node backend can already start integrating against.
"""

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ocr_module import run_ocr

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

app = FastAPI(title="ID-Shield AI Service", version="0.1.0")

# Wide-open CORS for hackathon dev speed. Tighten before any real deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class OCRRequest(BaseModel):
    passport_image_base64: str = Field(..., description="Base64-encoded passport image (raw or data URI)")


class OCRResponse(BaseModel):
    name: str | None
    passport_no: str | None
    dob: str | None
    expiry: str | None
    nationality: str | None
    confidence: float
    mrz: dict
    printed_vs_mrz_match: bool


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service", "module": "ocr"}


@app.post("/ocr", response_model=OCRResponse)
async def ocr_endpoint(payload: OCRRequest):
    try:
        result = run_ocr(payload.passport_image_base64)
        return result
    except Exception as exc:  # noqa: BLE001 - want a clean 500 for any decode/OCR failure
        logger.exception("OCR failed")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

"""
main_face_integration_example.py
----------------------------------
This is NOT meant to replace your teammates' main.py wholesale — it shows
exactly how face_module.py plugs into the shared /analyze endpoint they're
building (ocr_module + tampering_module + face_module), plus a standalone
/verify-face endpoint you can use to test JUST your piece over HTTP while
the others are still finishing theirs.

Merge the relevant bits into the real main.py once everyone's modules exist.
"""

from fastapi import FastAPI
from pydantic import BaseModel

from face_module import run_face_verification

# from ocr_module import run_ocr                      # teammate's module
# from tampering_module import run_tampering_check    # teammate's module

app = FastAPI()


class AnalyzeRequest(BaseModel):
    passport_image_base64: str
    live_image_base64: str


class VerifyFaceRequest(BaseModel):
    passport_image_base64: str
    live_image_base64: str


@app.post("/analyze")
async def analyze(payload: AnalyzeRequest):
    """The single orchestrating endpoint Node calls, per the architecture doc."""
    # ocr_result = run_ocr(payload.passport_image_base64)
    # tampering_result = run_tampering_check(payload.passport_image_base64)
    face_result = run_face_verification(
        payload.passport_image_base64, payload.live_image_base64
    )

    return {
        # "ocr": ocr_result,
        # "tampering": tampering_result,
        "face": face_result,
    }


@app.post("/verify-face")
async def verify_face(payload: VerifyFaceRequest):
    """Standalone endpoint — lets you test your module in isolation with
    curl/Postman without waiting on OCR or tampering to be ready."""
    return run_face_verification(
        payload.passport_image_base64, payload.live_image_base64
    )


@app.get("/health")
async def health():
    return {"status": "ok"}

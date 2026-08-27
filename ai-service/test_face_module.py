"""
test_face_module.py
--------------------
Quick standalone test for face_module.py — run this BEFORE wiring
anything into FastAPI, so you're debugging one thing at a time.

Usage:
    python test_face_module.py path/to/passport.jpg path/to/live_photo.jpg

What to test with:
    1. A photo of yourself as "passport" + a selfie as "live" -> should MATCH
    2. A photo of a friend as "passport" + your selfie as "live" -> should NOT match
    3. A photo with no visible face (e.g. a landscape) -> doc_face_detected: False
    4. A blurry / low-light selfie -> check similarity doesn't collapse to 0

Run several of these and note the similarity scores. Use them to sanity-check
(and if needed adjust) SIMILARITY_MATCH_THRESHOLD in face_module.py.
"""

import base64
import sys
import json

from face_module import run_face_verification


def image_to_b64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def main():
    if len(sys.argv) != 3:
        print("Usage: python test_face_module.py <passport_image> <live_image>")
        sys.exit(1)

    passport_path, live_path = sys.argv[1], sys.argv[2]

    passport_b64 = image_to_b64(passport_path)
    live_b64 = image_to_b64(live_path)

    result = run_face_verification(passport_b64, live_b64)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

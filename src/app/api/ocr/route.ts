import { NextResponse } from "next/server";

// Points at the Python AI microservice in /ai-service (FastAPI, exposes POST /ocr).
// Set AI_SERVICE_URL in .env.local for local dev; defaults to the standard
// localhost port ai-service's own README/Dockerfile use.
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * POST /api/ocr
 *
 * Proxies a passport image to the AI service's OCR module and returns its
 * result untouched. This route does the real OCR + MRZ checksum work —
 * see /ai-service/README.md for what's actually happening on the Python
 * side and the accuracy numbers behind it.
 *
 * Accepts EITHER:
 *   - multipart/form-data with a file field named "passportImage", or
 *   - application/json with { "passportImageBase64": "<base64 or data URI>" }
 *
 * Returns: { success: true, ocr: <OCR contract from ai-service/main.py> }
 *
 * Integration note for wiring this into the real screening flow: the
 * current POST /api/screenings handler (src/app/api/screenings/route.ts)
 * still generates OCR-shaped data with Math.random() as a placeholder —
 * this route is what should replace that once the upload UI in
 * dashboard/new/page.tsx actually sends an image instead of the hardcoded
 * { documentType: "Passport", name: "Rajesh Kumar" } payload it sends today.
 * Left as a separate, independently testable endpoint rather than rewriting
 * those files directly, since that flow is still in progress elsewhere.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let passportImageBase64: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("passportImage");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { success: false, error: "Missing 'passportImage' file in form data" },
          { status: 400 }
        );
      }
      const bytes = await file.arrayBuffer();
      passportImageBase64 = Buffer.from(bytes).toString("base64");
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      passportImageBase64 = body.passportImageBase64 ?? null;
    } else {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported content type — send multipart/form-data with a 'passportImage' file, or application/json with 'passportImageBase64'.",
        },
        { status: 415 }
      );
    }

    if (!passportImageBase64) {
      return NextResponse.json(
        { success: false, error: "No passport image provided" },
        { status: 400 }
      );
    }

    let aiResponse: Response;
    try {
      aiResponse = await fetch(`${AI_SERVICE_URL}/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passport_image_base64: passportImageBase64 }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (fetchError) {
      console.error("Could not reach ai-service:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not reach the AI OCR service. Is it running? (see /ai-service/README.md — `uvicorn main:app --port 8000`)",
        },
        { status: 503 }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("ai-service /ocr returned an error:", aiResponse.status, errorText);
      return NextResponse.json(
        { success: false, error: "OCR service failed to process the document" },
        { status: 502 }
      );
    }

    const ocrResult = await aiResponse.json();
    return NextResponse.json({ success: true, ocr: ocrResult });
  } catch (error) {
    console.error("OCR proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Unexpected error while processing the document" },
      { status: 500 }
    );
  }
}

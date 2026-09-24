import { NextResponse } from "next/server";

// Points at the Python AI microservice in /ai-service (FastAPI, exposes POST /tampering)
// or the standalone tampering backend.
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * POST /api/tampering
 *
 * Proxies a document image to the AI service's Tampering Detection module
 * (or tampering_detection pipeline) and returns:
 * {
 *   success: true,
 *   tampering: {
 *     tampered: boolean,
 *     confidence: number,
 *     tampering_type: string,
 *     region: [ymin, xmin, ymax, xmax] | null,
 *     inference_time_ms: number
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let passportImageBase64: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("passportImage") || formData.get("file");
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
            "Unsupported content type — send multipart/form-data or application/json with 'passportImageBase64'.",
        },
        { status: 415 }
      );
    }

    if (!passportImageBase64) {
      return NextResponse.json(
        { success: false, error: "No document image provided" },
        { status: 400 }
      );
    }

    const aiResponse = await fetch(`${AI_SERVICE_URL}/tampering`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passport_image_base64: passportImageBase64 }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI tampering service error:", aiResponse.status, errorText);
      return NextResponse.json(
        { success: false, error: "Tampering detection service unavailable" },
        { status: 503 }
      );
    }

    const tamperingResult = await aiResponse.json();
    return NextResponse.json({ success: true, tampering: tamperingResult, isLiveService: true });
  } catch (error) {
    console.error("Tampering proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Unexpected error while inspecting document tampering" },
      { status: 500 }
    );
  }
}

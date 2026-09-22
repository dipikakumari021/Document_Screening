import { NextResponse } from "next/server";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || "http://localhost:8000";

export async function POST(request: Request) {
  try {
    // Read the uploaded files from the browser request
    const formData = await request.formData();

    const passportImage = formData.get("passportImage");
    const selfieImage = formData.get("selfieImage");

    // Make sure both files were actually provided
    if (!(passportImage instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Passport image is required" },
        { status: 400 }
      );
    }

    if (!(selfieImage instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Selfie image is required" },
        { status: 400 }
      );
    }

    // Convert the uploaded passport image into Base64
    const passportBuffer = Buffer.from(await passportImage.arrayBuffer());
    const passportBase64 = passportBuffer.toString("base64");

    // Convert the uploaded selfie into Base64
    const selfieBuffer = Buffer.from(await selfieImage.arrayBuffer());
    const selfieBase64 = selfieBuffer.toString("base64");

    // Send both images to the Python FastAPI ArcFace service
    const aiResponse = await fetch(`${AI_SERVICE_URL}/verify-face`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        passport_image_base64: passportBase64,
        live_image_base64: selfieBase64,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    // Read the response from the AI service
    const aiResult = await aiResponse.json();

    // If ArcFace returned an error, pass it back to the frontend
    if (!aiResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: aiResult.detail || "Face verification failed",
        },
        { status: aiResponse.status }
      );
    }

    // Return the real ArcFace result to the website
    return NextResponse.json({
      success: true,
      ...aiResult,
    });
  } catch (error) {
    console.error("Face verification API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to connect to the face verification service",
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Screening } from "@/models/Screening";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import { ensureDatabaseSeeded } from "@/lib/seed";
import { sendHighRiskAlert, sendScreeningResult } from "@/lib/email";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    let officerName = "Authorized Officer";

    if (sessionToken) {
      const payload = await decrypt(sessionToken);

      if (payload?.name) {
        officerName = payload.name as string;
      }
    }

    await connectDB();

    // Keep the existing dashboard seed for now.
    // We will remove/replace this later when we make dashboard statistics
    // completely database-driven.
    await ensureDatabaseSeeded(officerName);

    const rawScreenings = await Screening.find()
      .sort({ time: -1 })
      .limit(50)
      .lean();

    const allScreenings = rawScreenings.map((s: any) => ({
      ...s,
      id: s._id ? s._id.toString() : s.screeningId,
    }));

    const priorityCases = allScreenings
      .filter(
        (s) =>
          s.status === "PENDING REVIEW" ||
          s.riskLevel === "HIGH" ||
          s.riskLevel === "MEDIUM"
      )
      .slice(0, 3);

    const recentScreenings = allScreenings.slice(0, 8);

    // Existing dashboard statistics.
    // We will make these fully database-driven in a later step.
    const totalCount = 1248 + (allScreenings.length - 8);

    const highRiskCount =
      18 +
      allScreenings.filter(
        (s) => s.riskLevel === "HIGH" && !["SCR-10482"].includes(s.screeningId)
      ).length;

    const mediumRiskCount =
      46 +
      allScreenings.filter(
        (s) =>
          s.riskLevel === "MEDIUM" &&
          !["SCR-10477", "SCR-10465", "SCR-10479"].includes(s.screeningId)
      ).length;

    const lowRiskCount = totalCount - (highRiskCount + mediumRiskCount);

    const stats = {
      total: totalCount,
      todayGrowth: "+12%",
      highRisk: highRiskCount,
      mediumRisk: mediumRiskCount,
      lowRisk: lowRiskCount,

      activityData: [
        { name: "7 Days Ago", screenings: 100, highRisk: 14 },
        { name: "6 Days Ago", screenings: 210, highRisk: 22 },
        { name: "5 Days Ago", screenings: 120, highRisk: 16 },
        { name: "4 Days Ago", screenings: 190, highRisk: 21 },
        { name: "3 Days Ago", screenings: 310, highRisk: 29 },
        { name: "2 Days Ago", screenings: 180, highRisk: 18 },
        {
          name: "Today",
          screenings: 120 + allScreenings.length - 8,
          highRisk: 11,
        },
      ],

      riskDistribution: [
        {
          name: "High Risk",
          value: highRiskCount,
          percentage: ((highRiskCount / totalCount) * 100).toFixed(1),
          color: "#ef4444",
        },
        {
          name: "Medium Risk",
          value: mediumRiskCount,
          percentage: ((mediumRiskCount / totalCount) * 100).toFixed(1),
          color: "#f59e0b",
        },
        {
          name: "Low Risk",
          value: lowRiskCount,
          percentage: ((lowRiskCount / totalCount) * 100).toFixed(1),
          color: "#22c55e",
        },
      ],
    };

    return NextResponse.json({
      screenings: recentScreenings,
      priorityCases,
      stats,
      currentOfficer: officerName,
    });
  } catch (error) {
    console.error("Screenings GET error:", error);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}


// -----------------------------------------------------------------------------
// AI result types
// -----------------------------------------------------------------------------

interface OcrResult {
  name?: string | null;
  passport_no?: string | null;
  dob?: string | null;
  expiry?: string | null;
  nationality?: string | null;
  gender?: string | null;
  confidence?: number;

  mrz?: {
    valid_checksum?: boolean;
    raw_lines?: string[];
  };

  printed_vs_mrz_match?: boolean;
}

interface TamperingResult {
  tampered?: boolean;
  confidence?: number;
  tampering_type?: string | null;
  region?: number[] | null;
  method?: string | null;
}

interface FaceVerificationResult {
  similarity?: number;
  match?: boolean;
  doc_face_detected?: boolean;
  live_face_detected?: boolean;
}


// -----------------------------------------------------------------------------
// Risk calculation
// -----------------------------------------------------------------------------
//
// IMPORTANT:
// This is application-level risk scoring for our screening demo.
// It is NOT an official government/border-security risk standard.
//
// The score combines independent screening signals:
//
// Face mismatch       +60
// Tampering detected  +30
// MRZ invalid         +20
// Name mismatch       +15
// Expired document    +20
//
// Maximum = 100
//
// Risk bands:
//
// 0 - 20   LOW
// 21 - 50  MEDIUM
// 51 - 100 HIGH
// -----------------------------------------------------------------------------

function calculateRiskScore({
  faceResult,
  tamperingResult,
  ocrResult,
}: {
  faceResult: FaceVerificationResult | null;
  tamperingResult: TamperingResult | null;
  ocrResult: OcrResult | null;
}) {
  let riskScore = 0;

  const concerns: string[] = [];

  // ---------------------------------------------------------
  // 1. Face verification
  // ---------------------------------------------------------

  if (faceResult) {
    const faceDetected =
      faceResult.doc_face_detected === true &&
      faceResult.live_face_detected === true;

    if (!faceDetected) {
      riskScore += 60;
      concerns.push("Face could not be verified");
    } else if (faceResult.match !== true) {
      riskScore += 60;
      concerns.push("Face mismatch with document photo");
    }
  }

  // ---------------------------------------------------------
  // 2. Tampering detection
  // ---------------------------------------------------------

  if (tamperingResult?.tampered === true) {
    riskScore += 30;

    const type =
      tamperingResult.tampering_type &&
      tamperingResult.tampering_type !== "None"
        ? tamperingResult.tampering_type
        : "Visual Forgery";

    concerns.push(`Document tampering detected (${type})`);
  }

  // ---------------------------------------------------------
  // 3. MRZ checksum
  // ---------------------------------------------------------

  const hasChecksumError =
    ocrResult?.mrz?.valid_checksum === false;

  if (hasChecksumError) {
    riskScore += 20;
    concerns.push("MRZ checksum validation failure");
  }

  // ---------------------------------------------------------
  // 4. Printed data vs MRZ
  // ---------------------------------------------------------

  const hasNameMismatch =
    ocrResult?.printed_vs_mrz_match === false;

  if (hasNameMismatch) {
    riskScore += 15;
    concerns.push("Bio-page name vs MRZ mismatch");
  }

  // ---------------------------------------------------------
  // 5. Passport expiry
  // ---------------------------------------------------------

  if (ocrResult?.expiry) {
    const expiryDate = new Date(ocrResult.expiry);

    if (
      !Number.isNaN(expiryDate.getTime()) &&
      expiryDate.getTime() < Date.now()
    ) {
      riskScore += 20;
      concerns.push("Passport has expired");
    }
  }

  // Never allow score above 100.
  riskScore = Math.min(100, riskScore);

  let riskLevel: "LOW" | "MEDIUM" | "HIGH";

  if (riskScore <= 20) {
    riskLevel = "LOW";
  } else if (riskScore <= 50) {
    riskLevel = "MEDIUM";
  } else {
    riskLevel = "HIGH";
  }

  // Critical verification failures should never be treated as cleared.
  const criticalFailure =
    faceResult?.match === false ||
    faceResult?.doc_face_detected === false ||
    faceResult?.live_face_detected === false ||
    tamperingResult?.tampered === true ||
    hasChecksumError ||
    hasNameMismatch ||
    concerns.includes("Passport has expired");

  const status =
    criticalFailure || riskLevel !== "LOW"
      ? "PENDING REVIEW"
      : "CLEARED";

  return {
    riskScore,
    riskLevel,
    status,
    primaryConcern:
      concerns.length > 0 ? concerns.join("; ") : null,
  };
}


// -----------------------------------------------------------------------------
// POST /api/screenings
// -----------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    let officerName = "Authorized Officer";

    if (sessionToken) {
      const payload = await decrypt(sessionToken);

      if (payload?.name) {
        officerName = payload.name as string;
      }
    }

    await connectDB();

    // -------------------------------------------------------------------------
    // Get real AI results sent by the frontend
    // -------------------------------------------------------------------------

    const ocrResult: OcrResult | null = body.ocrResult ?? null;

    const tamperingResult: TamperingResult | null =
      body.tamperingResult ?? null;

    const faceVerificationResult: FaceVerificationResult | null =
      body.faceVerificationResult ?? null;


    // -------------------------------------------------------------------------
    // Determine document information
    // -------------------------------------------------------------------------

    const docType = ocrResult?.passport_no
      ? "Passport"
      : body.documentType || "Passport";

    const passengerName =
      ocrResult?.name ||
      body.name ||
      "Uploaded Document";


    // -------------------------------------------------------------------------
    // Calculate risk from REAL AI results
    // -------------------------------------------------------------------------

    const {
      riskScore,
      riskLevel,
      status,
      primaryConcern,
    } = calculateRiskScore({
      faceResult: faceVerificationResult,
      tamperingResult,
      ocrResult,
    });


    // -------------------------------------------------------------------------
    // Tampering information
    // -------------------------------------------------------------------------

    const isTampered =
      tamperingResult?.tampered === true;

    const tamperingScore =
      typeof tamperingResult?.confidence === "number"
        ? Math.round(tamperingResult.confidence * 100)
        : null;

    const tamperingType =
      tamperingResult?.tampering_type ?? null;

    const tamperedRegion =
      tamperingResult?.region
        ? JSON.stringify(tamperingResult.region)
        : null;


    // -------------------------------------------------------------------------
    // Face similarity
    // -------------------------------------------------------------------------
    //
    // IMPORTANT:
    // This is the REAL ArcFace similarity returned by Python.
    // We are no longer generating a random number.
    // -------------------------------------------------------------------------

    const faceMatchScore =
      typeof faceVerificationResult?.similarity === "number"
        ? Math.round(faceVerificationResult.similarity * 100)
        : null;


    // -------------------------------------------------------------------------
    // OCR data
    // -------------------------------------------------------------------------

    const finalOcrData = {
      passportNo: ocrResult?.passport_no ?? null,
      nationality: ocrResult?.nationality ?? null,
      dob: ocrResult?.dob ?? null,
      expiry: ocrResult?.expiry ?? null,
      gender: ocrResult?.gender ?? null,

      mrzLine1:
        ocrResult?.mrz?.raw_lines?.[0] ?? "",

      mrzLine2:
        ocrResult?.mrz?.raw_lines?.[1] ?? "",

      mrzValid:
        ocrResult?.mrz?.valid_checksum ?? null,

      ocrConfidence:
        typeof ocrResult?.confidence === "number"
          ? ocrResult.confidence
          : null,

      printedVsMrzMatch:
        ocrResult?.printed_vs_mrz_match ?? null,
    };


    // -------------------------------------------------------------------------
    // Generate screening ID
    // -------------------------------------------------------------------------
    //
    // Still generated here, but no random risk values are generated.
    // -------------------------------------------------------------------------

    const screeningId = `SCR-${Date.now()}`;


    // -------------------------------------------------------------------------
    // Save complete screening result to MongoDB
    // -------------------------------------------------------------------------

    const newScreening = await Screening.create({
      screeningId,

      documentType: docType,

      name: passengerName,

      riskScore,
      riskLevel,
      status,

      officerId: officerName,

      primaryConcern,

      ocrData: JSON.stringify(finalOcrData),

      faceMatchScore,

      tamperingScore,
      isTampered,
      tamperingType,
      tamperedRegion,
    });


    // -------------------------------------------------------------------------
    // Email notification
    // -------------------------------------------------------------------------

    const recipientEmail =
      process.env.GMAIL_USER ||
      "dipikakumari0021@gmail.com";

    if (recipientEmail) {
      if (riskLevel === "HIGH") {
        sendHighRiskAlert({
          to: recipientEmail,
          officerName,
          screeningId,
          passengerName,
          documentType: docType,
          riskScore,
          riskLevel,
          primaryConcern,
          isTampered,
          tamperingType,
          timestamp: new Date(),
        }).catch((err) =>
          console.error(
            "High risk email alert error:",
            err
          )
        );
      } else {
        sendScreeningResult({
          to: recipientEmail,
          officerName,
          screeningId,
          passengerName,
          documentType: docType,
          riskScore,
          riskLevel,
          status,
          timestamp: new Date(),
        }).catch((err) =>
          console.error(
            "Screening result email error:",
            err
          )
        );
      }
    }


    // -------------------------------------------------------------------------
    // Return saved screening
    // -------------------------------------------------------------------------

    return NextResponse.json(newScreening);

  } catch (error) {
    console.error("Screenings POST error:", error);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
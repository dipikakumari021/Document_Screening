import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Screening } from "@/models/Screening";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import { ensureDatabaseSeeded } from "@/lib/seed";

export async function GET(request: NextRequest) {
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
    await ensureDatabaseSeeded(officerName);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const risk = searchParams.get("risk") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));

    // Build MongoDB query
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { screeningId: { $regex: search, $options: "i" } },
        { documentType: { $regex: search, $options: "i" } },
      ];
    }

    if (risk && ["LOW", "MEDIUM", "HIGH"].includes(risk.toUpperCase())) {
      query.riskLevel = risk.toUpperCase();
    }

    if (status) {
      query.status = { $regex: `^${status}$`, $options: "i" };
    }

    const total = await Screening.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const rawScreenings = await Screening.find(query)
      .sort({ time: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const screenings = rawScreenings.map((s: any) => ({
      ...s,
      id: s._id ? s._id.toString() : s.screeningId,
    }));

    return NextResponse.json({
      screenings,
      total,
      page,
      totalPages,
      limit,
    });
  } catch (error) {
    console.error("History GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch history" }, { status: 500 });
  }
}

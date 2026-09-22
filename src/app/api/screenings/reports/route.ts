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
    const days = parseInt(searchParams.get("days") || "30", 10);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const allScreenings = await Screening.find({ time: { $gte: cutoffDate } })
      .sort({ time: -1 })
      .lean();

    // --- Summary stats ---
    const total = allScreenings.length;
    const cleared = allScreenings.filter((s: any) => s.status === "CLEARED").length;
    const flagged = allScreenings.filter((s: any) => s.status !== "CLEARED").length;
    const avgRiskScore = total > 0
      ? Math.round(allScreenings.reduce((sum: number, s: any) => sum + (s.riskScore || 0), 0) / total)
      : 0;

    // --- Risk breakdown ---
    const highRisk = allScreenings.filter((s: any) => s.riskLevel === "HIGH").length;
    const mediumRisk = allScreenings.filter((s: any) => s.riskLevel === "MEDIUM").length;
    const lowRisk = allScreenings.filter((s: any) => s.riskLevel === "LOW").length;

    // --- Document type breakdown ---
    const docTypeCounts: Record<string, number> = {};
    allScreenings.forEach((s: any) => {
      const dt = s.documentType || "Unknown";
      docTypeCounts[dt] = (docTypeCounts[dt] || 0) + 1;
    });
    const documentTypes = Object.entries(docTypeCounts).map(([name, value]) => ({ name, value }));

    // --- Tampering stats ---
    const tampered = allScreenings.filter((s: any) => s.isTampered === true).length;
    const clean = total - tampered;

    const tamperingTypeCounts: Record<string, number> = {};
    allScreenings
      .filter((s: any) => s.isTampered && s.tamperingType)
      .forEach((s: any) => {
        tamperingTypeCounts[s.tamperingType] = (tamperingTypeCounts[s.tamperingType] || 0) + 1;
      });
    const tamperingTypes = Object.entries(tamperingTypeCounts).map(([name, value]) => ({ name, value }));

    // --- Daily trend (group by date) ---
    const dailyMap: Record<string, { total: number; high: number; cleared: number }> = {};
    allScreenings.forEach((s: any) => {
      const dateKey = new Date(s.time).toISOString().split("T")[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { total: 0, high: 0, cleared: 0 };
      }
      dailyMap[dateKey].total++;
      if (s.riskLevel === "HIGH") dailyMap[dateKey].high++;
      if (s.status === "CLEARED") dailyMap[dateKey].cleared++;
    });

    const dailyTrend = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        total: data.total,
        highRisk: data.high,
        cleared: data.cleared,
      }));

    // --- Top concerns ---
    const concernCounts: Record<string, number> = {};
    allScreenings
      .filter((s: any) => s.primaryConcern)
      .forEach((s: any) => {
        concernCounts[s.primaryConcern] = (concernCounts[s.primaryConcern] || 0) + 1;
      });
    const topConcerns = Object.entries(concernCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([concern, count]) => ({ concern, count }));

    return NextResponse.json({
      summary: {
        total,
        cleared,
        flagged,
        avgRiskScore,
        clearedPercent: total > 0 ? ((cleared / total) * 100).toFixed(1) : "0",
        flaggedPercent: total > 0 ? ((flagged / total) * 100).toFixed(1) : "0",
      },
      riskBreakdown: {
        high: highRisk,
        medium: mediumRisk,
        low: lowRisk,
      },
      documentTypes,
      tampering: {
        tampered,
        clean,
        types: tamperingTypes,
      },
      dailyTrend,
      topConcerns,
      days,
    });
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate report" }, { status: 500 });
  }
}

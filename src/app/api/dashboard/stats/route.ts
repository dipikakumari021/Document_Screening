import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Screening } from "@/models/Screening";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

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

    const now = new Date();
    const startToday = startOfDay(now);
    const startTomorrow = startOfDay(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    const startYesterday = startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const endYesterday = endOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const sevenDaysAgo = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));

    const [
      totalScreenings,
      todayScreenings,
      yesterdayScreenings,
      riskAgg,
      statusAgg,
      activityAgg,
      recentScreeningsRaw,
      priorityCasesRaw,
      tamperingAgg,
      faceMatchAgg,
    ] = await Promise.all([
      Screening.countDocuments({}),
      Screening.countDocuments({ time: { $gte: startToday, $lt: startTomorrow } }),
      Screening.countDocuments({ time: { $gte: startYesterday, $lte: endYesterday } }),
      Screening.aggregate([
        { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
      ]),
      Screening.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Screening.aggregate([
        { $match: { time: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$time" } },
            total: { $sum: 1 },
            highRisk: {
              $sum: { $cond: [{ $eq: ["$riskLevel", "HIGH"] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Screening.find()
        .sort({ time: -1 })
        .limit(10)
        .lean(),
      Screening.find({
        $or: [
          { status: "PENDING REVIEW" },
          { riskLevel: "HIGH" },
          { riskLevel: "MEDIUM" },
        ],
      })
        .sort({ time: -1 })
        .limit(3)
        .lean(),
      Screening.aggregate([
        {
          $group: {
            _id: "$isTampered",
            count: { $sum: 1 },
          },
        },
      ]),
      Screening.aggregate([
        {
          $group: {
            _id: null,
            totalWithFaceScore: {
              $sum: { $cond: [{ $ne: ["$faceMatchScore", null] }, 1, 0] },
            },
            avgFaceMatchScore: { $avg: "$faceMatchScore" },
            matched: {
              $sum: { $cond: [{ $gte: ["$faceMatchScore", 65] }, 1, 0] },
            },
            noMatch: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ["$faceMatchScore", null] }, { $lt: ["$faceMatchScore", 65] }] },
                  1,
                  0,
                ],
              },
            },
            notAvailable: {
              $sum: { $cond: [{ $eq: ["$faceMatchScore", null] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const riskMap = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    riskAgg.forEach((r) => {
      if (r._id in riskMap) {
        riskMap[r._id as keyof typeof riskMap] = r.count;
      }
    });

    const statusMap: Record<string, number> = {};
    statusAgg.forEach((s) => {
      statusMap[s._id] = s.count;
    });

    const activityMap = new Map<string, { total: number; highRisk: number }>();
    activityAgg.forEach((a) => {
      activityMap.set(a._id, { total: a.total, highRisk: a.highRisk });
    });

    const activityData: Array<{ date: string; label: string; total: number; highRisk: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = formatDateKey(d);
      const data = activityMap.get(key) || { total: 0, highRisk: 0 };
      activityData.push({
        date: key,
        label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        total: data.total,
        highRisk: data.highRisk,
      });
    }

    let todayGrowth: string | null = null;
    if (yesterdayScreenings > 0) {
      const pct = ((todayScreenings - yesterdayScreenings) / yesterdayScreenings) * 100;
      const sign = pct >= 0 ? "+" : "";
      todayGrowth = `${sign}${pct.toFixed(0)}%`;
    }

    const tamperingStats = { tampered: 0, clean: 0 };
    tamperingAgg.forEach((t) => {
      if (t._id === true) tamperingStats.tampered = t.count;
      else if (t._id === false) tamperingStats.clean = t.count;
    });

    const faceStats = faceMatchAgg[0] || {
      totalWithFaceScore: 0,
      avgFaceMatchScore: 0,
      matched: 0,
      noMatch: 0,
      notAvailable: 0,
    };

    const recentScreenings = recentScreeningsRaw.map((s: any) => ({
      id: s._id ? s._id.toString() : s.screeningId,
      screeningId: s.screeningId,
      time: s.time,
      documentType: s.documentType,
      name: s.name,
      riskScore: s.riskScore,
      riskLevel: s.riskLevel,
      status: s.status,
      officerId: s.officerId,
      primaryConcern: s.primaryConcern,
      faceMatchScore: s.faceMatchScore,
      isTampered: s.isTampered,
      tamperingType: s.tamperingType,
    }));

    const priorityCases = priorityCasesRaw.map((s: any) => ({
      id: s._id ? s._id.toString() : s.screeningId,
      screeningId: s.screeningId,
      time: s.time,
      documentType: s.documentType,
      name: s.name,
      riskScore: s.riskScore,
      riskLevel: s.riskLevel,
      status: s.status,
      officerId: s.officerId,
      primaryConcern: s.primaryConcern,
      faceMatchScore: s.faceMatchScore,
      isTampered: s.isTampered,
      tamperingType: s.tamperingType,
    }));

    const riskDistribution = [
      { name: "High Risk", value: riskMap.HIGH, color: "#ef4444" },
      { name: "Medium Risk", value: riskMap.MEDIUM, color: "#f59e0b" },
      { name: "Low Risk", value: riskMap.LOW, color: "#22c55e" },
    ];

    const totalWithRisk = riskMap.LOW + riskMap.MEDIUM + riskMap.HIGH;
    const riskDistributionWithPct = riskDistribution.map((r) => ({
      ...r,
      percentage: totalWithRisk > 0 ? ((r.value / totalWithRisk) * 100).toFixed(1) : "0.0",
    }));

    return NextResponse.json({
      totalScreenings,
      todayScreenings,
      todayGrowth,
      risk: {
        low: riskMap.LOW,
        medium: riskMap.MEDIUM,
        high: riskMap.HIGH,
      },
      decisions: {
        cleared: statusMap["CLEARED"] || 0,
        pending: statusMap["PENDING REVIEW"] || 0,
        escalated: statusMap["ESCALATED"] || 0,
      },
      activity: activityData,
      riskDistribution: riskDistributionWithPct,
      recentScreenings,
      priorityCases,
      tampering: tamperingStats,
      faceVerification: {
        matched: faceStats.matched,
        noMatch: faceStats.noMatch,
        notAvailable: faceStats.notAvailable,
        avgScore: faceStats.avgFaceMatchScore ? Math.round(faceStats.avgFaceMatchScore) : null,
      },
      currentOfficer: officerName,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load dashboard data" },
      { status: 500 }
    );
  }
}
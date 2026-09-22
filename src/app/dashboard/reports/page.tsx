"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FileBarChart,
  Download,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Activity,
  Crosshair,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const PIE_COLORS = ["#ef4444", "#f59e0b", "#22c55e"];
const TAMPER_COLORS = ["#ef4444", "#22c55e"];

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/screenings/reports?days=${days}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Reports fetch error:", err);
        setLoading(false);
      });
  }, [days]);

  const exportReport = () => {
    if (!data) return;

    const lines = [
      `PRAMAAN AI — Screening Report (Last ${days} Days)`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "=== SUMMARY ===",
      `Total Screenings: ${data.summary.total}`,
      `Cleared: ${data.summary.cleared} (${data.summary.clearedPercent}%)`,
      `Flagged: ${data.summary.flagged} (${data.summary.flaggedPercent}%)`,
      `Average Risk Score: ${data.summary.avgRiskScore}/100`,
      "",
      "=== RISK BREAKDOWN ===",
      `High Risk: ${data.riskBreakdown.high}`,
      `Medium Risk: ${data.riskBreakdown.medium}`,
      `Low Risk: ${data.riskBreakdown.low}`,
      "",
      "=== TAMPERING ===",
      `Tampered Documents: ${data.tampering.tampered}`,
      `Clean Documents: ${data.tampering.clean}`,
      "",
      "=== TOP CONCERNS ===",
      ...data.topConcerns.map((c: any, i: number) => `${i + 1}. ${c.concern} (${c.count} cases)`),
      "",
      "=== DAILY TREND ===",
      "Date,Total,High Risk,Cleared",
      ...data.dailyTrend.map((d: any) => `${d.date},${d.total},${d.highRisk},${d.cleared}`),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pramaan_report_${days}d_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const dayOptions = [
    { label: "7 Days", value: 7 },
    { label: "30 Days", value: 30 },
    { label: "90 Days", value: 90 },
  ];

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Generating analytics report...</p>
        </div>
      </div>
    );
  }

  const riskPieData = [
    { name: "High Risk", value: data.riskBreakdown.high },
    { name: "Medium Risk", value: data.riskBreakdown.medium },
    { name: "Low Risk", value: data.riskBreakdown.low },
  ];

  const tamperPieData = [
    { name: "Tampered", value: data.tampering.tampered },
    { name: "Clean", value: data.tampering.clean },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <FileBarChart className="w-7 h-7 text-blue-600" />
            Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Comprehensive screening analytics and exportable reports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 bg-slate-100 rounded-lg p-1">
            {dayOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  days === opt.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button
            onClick={exportReport}
            variant="outline"
            className="h-9 px-4 flex items-center gap-2 text-sm font-semibold"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Total Screenings
                </p>
                <h3 className="text-3xl font-black text-slate-900">
                  {data.summary.total.toLocaleString()}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-2">
                  Last {days} days
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-200/80 bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Cleared Rate
                </p>
                <h3 className="text-3xl font-black text-emerald-600">
                  {data.summary.clearedPercent}%
                </h3>
                <p className="text-xs font-semibold text-emerald-600 mt-2">
                  {data.summary.cleared} cleared
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-red-200/80 bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Flagged Rate
                </p>
                <h3 className="text-3xl font-black text-red-600">
                  {data.summary.flaggedPercent}%
                </h3>
                <p className="text-xs font-semibold text-red-600 mt-2">
                  {data.summary.flagged} flagged
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Avg Risk Score
                </p>
                <h3 className="text-3xl font-black text-slate-900">
                  {data.summary.avgRiskScore}
                  <span className="text-lg font-normal text-slate-500">/100</span>
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-2">
                  Across all screenings
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Volume Bar Chart */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Daily Screening Volume
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.dailyTrend}
                  margin={{ top: 10, right: 20, bottom: 5, left: 0 }}
                >
                  <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2)",
                    }}
                  />
                  <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="highRisk" name="High Risk" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-sm inline-block"></span> Total
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-sm inline-block"></span> High Risk
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card className="shadow-sm border-slate-200 bg-white flex flex-col justify-between">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800">
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center justify-center flex-1">
            <div className="h-40 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskPieData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {riskPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-800 leading-none">
                  {data.summary.total}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Total
                </span>
              </div>
            </div>
            <div className="w-full mt-4 space-y-2 border-t border-slate-100 pt-3">
              {riskPieData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i] }}
                    ></span>
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Tampering + Top Concerns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tampering Stats */}
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-purple-600" />
              Tampering Detection
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center gap-6">
              <div className="h-36 w-36 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tamperPieData}
                      innerRadius={40}
                      outerRadius={55}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {tamperPieData.map((_, index) => (
                        <Cell key={`tc-${index}`} fill={TAMPER_COLORS[index]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-black text-slate-800">{data.tampering.tampered}</span>
                  <span className="text-[9px] font-bold text-red-500 uppercase">Tampered</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
                  <div className="flex items-center gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="font-semibold text-red-800">Tampered Documents</span>
                  </div>
                  <span className="font-black text-red-600 text-sm">{data.tampering.tampered}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-emerald-800">Clean Documents</span>
                  </div>
                  <span className="font-black text-emerald-600 text-sm">{data.tampering.clean}</span>
                </div>
                {data.tampering.types.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Forgery Methods
                    </p>
                    {data.tampering.types.map((t: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 font-medium">{t.name}</span>
                        <Badge variant="destructive" className="text-[10px]">
                          {t.value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Concerns */}
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Top Security Concerns
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {data.topConcerns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <CheckCircle className="w-10 h-10 mb-3 opacity-40" />
                <p className="font-semibold text-sm">No concerns in this period</p>
                <p className="text-xs mt-1">All screenings passed verification checks.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.topConcerns.map((c: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black shrink-0">
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.concern}</p>
                    </div>
                    <Badge variant="warning" className="text-[10px] font-bold shrink-0">
                      {c.count} cases
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

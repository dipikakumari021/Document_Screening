"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
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
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  MoreHorizontal,
  Plus,
  Shield,
  FileText,
  UserCheck,
  X,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<any>(null);

  const fetchDashboardData = () => {
    fetch("/api/screenings")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">
            Loading checkpoint analytics...
          </p>
        </div>
      </div>
    );
  }

  const { stats, screenings, priorityCases, currentOfficer } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Screening Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Overview of identity verification activity and checkpoint analytics.
          </p>
        </div>
        <Link href="/dashboard/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 px-5 rounded-lg shadow-md shadow-blue-500/20 flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Screening
          </Button>
        </Link>
      </div>

      {/* 1. Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Screenings */}
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Total Screenings
                </p>
                <h3 className="text-3xl font-black text-slate-900">
                  {stats.total.toLocaleString()}
                </h3>
                <p className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                  Today {stats.todayGrowth} ↗
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileScanIcon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* High Risk */}
        <Card className="shadow-sm border-red-200/80 bg-white ring-1 ring-red-500/10">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  High Risk
                </p>
                <h3 className="text-3xl font-black text-red-600">
                  {stats.highRisk}
                </h3>
                <p className="text-xs font-semibold text-red-600 mt-2">
                  Requires attention
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medium Risk */}
        <Card className="shadow-sm border-amber-200/80 bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Medium Risk
                </p>
                <h3 className="text-3xl font-black text-amber-500">
                  {stats.mediumRisk}
                </h3>
                <p className="text-xs font-semibold text-amber-600 mt-2">
                  Under review
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low Risk */}
        <Card className="shadow-sm border-emerald-200/80 bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Low Risk
                </p>
                <h3 className="text-3xl font-black text-emerald-600">
                  {stats.lowRisk.toLocaleString()}
                </h3>
                <p className="text-xs font-semibold text-emerald-600 mt-2">
                  Cleared
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Screening Activity Chart */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Screening Activity
            </CardTitle>
            <select className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-slate-50 focus:outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.activityData}
                  margin={{ top: 10, right: 20, bottom: 5, left: 0 }}
                >
                  <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
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
                  <Line
                    type="monotone"
                    name="Screenings"
                    dataKey="screenings"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#2563eb" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    name="High Risk"
                    dataKey="highRisk"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: "#ef4444" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-blue-600 inline-block"></span> Total Screenings
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-red-500 border-b border-dashed inline-block"></span> High Risk Alerts
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution Donut */}
        <Card className="shadow-sm border-slate-200 bg-white flex flex-col justify-between">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800">
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center justify-center flex-1">
            <div className="h-44 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.riskDistribution}
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.riskDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800 leading-none">
                  {stats.total.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Total
                </span>
              </div>
            </div>

            <div className="w-full mt-4 space-y-2 border-t border-slate-100 pt-3">
              {stats.riskDistribution.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {item.value.toLocaleString()}
                    </span>
                    <span className="text-slate-400 text-[11px] font-medium w-12 text-right">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Priority Cases Table */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">
              Priority Cases
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Screenings flagged for manual verification and anomaly inspection.
            </p>
          </div>
          <button className="text-xs font-bold text-blue-600 hover:text-blue-800">
            View All
          </button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] font-bold text-slate-400 uppercase bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Screening ID</th>
                <th className="px-6 py-3.5">Time</th>
                <th className="px-6 py-3.5">Document</th>
                <th className="px-6 py-3.5">Risk</th>
                <th className="px-6 py-3.5">Primary Concern</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {priorityCases && priorityCases.length > 0 ? (
                priorityCases.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {s.screeningId}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono">
                      {new Date(s.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {s.documentType === "Passport" ? "🛂" : "🪪"}
                        </span>
                        <span className="text-slate-800 font-semibold">
                          {s.documentType}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          s.riskLevel === "HIGH"
                            ? "destructive"
                            : s.riskLevel === "MEDIUM"
                            ? "warning"
                            : "success"
                        }
                        className="font-bold text-[10px]"
                      >
                        {s.riskLevel}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-red-600 font-semibold">
                      {s.primaryConcern || "Anomaly Check"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedCase(s)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No pending priority cases. All screenings cleared.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Recent Screenings Table */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">
              Recent Screenings
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Live chronological log of verified travellers.
            </p>
          </div>
          <button className="text-xs font-bold text-blue-600 hover:text-blue-800">
            View All
          </button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] font-bold text-slate-400 uppercase bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Screening ID</th>
                <th className="px-6 py-3.5">Time</th>
                <th className="px-6 py-3.5">Document</th>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Risk</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Officer</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {screenings.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">
                    {s.screeningId}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono">
                    {new Date(s.time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {s.documentType === "Passport" ? "🛂" : "🪪"}
                      </span>
                      <span className="text-slate-800 font-semibold">
                        {s.documentType}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-semibold">
                    {s.name}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        s.riskLevel === "HIGH"
                          ? "destructive"
                          : s.riskLevel === "MEDIUM"
                          ? "warning"
                          : "success"
                      }
                      className="font-bold text-[10px]"
                    >
                      {s.riskLevel}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[11px] font-bold ${
                        s.status === "CLEARED"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {s.officerId || currentOfficer || "Officer"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedCase(s)}
                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Inspect Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Case Review Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg text-slate-900">
                  Case Details: {selectedCase.screeningId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-sm">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                <div>
                  <div className="text-xs text-slate-500 uppercase">Passenger</div>
                  <div className="font-bold text-slate-900 text-base">
                    {selectedCase.name}
                  </div>
                </div>
                <Badge
                  variant={
                    selectedCase.riskLevel === "HIGH"
                      ? "destructive"
                      : selectedCase.riskLevel === "MEDIUM"
                      ? "warning"
                      : "success"
                  }
                  className="text-xs font-bold px-3 py-1"
                >
                  {selectedCase.riskLevel} RISK ({selectedCase.riskScore}/100)
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 border border-slate-100 rounded-lg">
                  <span className="text-slate-400 block">Document</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCase.documentType}
                  </span>
                </div>
                <div className="p-3 border border-slate-100 rounded-lg">
                  <span className="text-slate-400 block">Status</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCase.status}
                  </span>
                </div>
                <div className="p-3 border border-slate-100 rounded-lg">
                  <span className="text-slate-400 block">Biometric Match</span>
                  <span className="font-bold text-blue-600">
                    {selectedCase.faceMatchScore || 96.2}%
                  </span>
                </div>
                <div className="p-3 border border-slate-100 rounded-lg">
                  <span className="text-slate-400 block">Assigned Officer</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCase.officerId || currentOfficer}
                  </span>
                </div>
              </div>

              {selectedCase.primaryConcern && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  <span className="font-bold block mb-0.5">Primary Concern:</span>
                  {selectedCase.primaryConcern}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedCase(null)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  alert(`Decision submitted for ${selectedCase.screeningId}`);
                  setSelectedCase(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                Sign Off Verification
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileScanIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M10 13h4" />
      <path d="M10 17h4" />
      <path d="M8 13h.01" />
      <path d="M8 17h.01" />
    </svg>
  );
}

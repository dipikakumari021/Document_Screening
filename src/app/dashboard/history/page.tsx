"use client";

import { useEffect, useState, useCallback } from "react";
import {
  History,
  Search,
  Filter,
  Download,
  Eye,
  X,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

export default function HistoryPage() {
  const [screenings, setScreenings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (riskFilter) params.set("risk", riskFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", "15");

      const res = await fetch(`/api/screenings/history?${params.toString()}`);
      const data = await res.json();

      setScreenings(data.screenings || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, riskFilter, statusFilter, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, riskFilter, statusFilter]);

  const exportCSV = () => {
    if (screenings.length === 0) return;

    const headers = ["Screening ID", "Time", "Document Type", "Name", "Risk Level", "Risk Score", "Status", "Officer", "Primary Concern"];
    const rows = screenings.map((s) => [
      s.screeningId,
      new Date(s.time).toLocaleString(),
      s.documentType,
      s.name,
      s.riskLevel,
      s.riskScore,
      s.status,
      s.officerId || "",
      s.primaryConcern || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((v: any) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `screening_history_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const riskChips = [
    { label: "All", value: "" },
    { label: "High", value: "HIGH" },
    { label: "Medium", value: "MEDIUM" },
    { label: "Low", value: "LOW" },
  ];

  const statusChips = [
    { label: "All", value: "" },
    { label: "Cleared", value: "CLEARED" },
    { label: "Pending Review", value: "PENDING REVIEW" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <History className="w-7 h-7 text-blue-600" />
            Screening History
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Complete log of all identity verification screenings.
          </p>
        </div>
        <Button
          onClick={exportCSV}
          variant="outline"
          className="h-10 px-4 flex items-center gap-2 text-sm font-semibold"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardContent className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, screening ID, or document type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase">Risk:</span>
              <div className="flex gap-1.5">
                {riskChips.map((chip) => (
                  <button
                    key={chip.value}
                    onClick={() => setRiskFilter(chip.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      riskFilter === chip.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
              <div className="flex gap-1.5">
                {statusChips.map((chip) => (
                  <button
                    key={chip.value}
                    onClick={() => setStatusFilter(chip.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      statusFilter === chip.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">
              {loading ? "Loading..." : `${total} Screening${total !== 1 ? "s" : ""} Found`}
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Page {page} of {totalPages}
            </p>
          </div>
        </CardHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : screenings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Search className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-semibold">No screenings found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] font-bold text-slate-400 uppercase bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Screening ID</th>
                  <th className="px-5 py-3.5">Time</th>
                  <th className="px-5 py-3.5">Document</th>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Risk</th>
                  <th className="px-5 py-3.5">Score</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Officer</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {screenings.map((s: any) => (
                  <tr key={s.id || s.screeningId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      {s.screeningId}
                    </td>
                    <td className="px-5 py-4 text-slate-500 font-mono">
                      {new Date(s.time).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      {new Date(s.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {s.documentType === "Passport" ? "🛂" : "🪪"}
                        </span>
                        <span className="text-slate-800 font-semibold">{s.documentType}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-900 font-semibold">{s.name}</td>
                    <td className="px-5 py-4">
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
                    <td className="px-5 py-4">
                      <span
                        className={`font-bold ${
                          s.riskScore > 60
                            ? "text-red-600"
                            : s.riskScore > 30
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {s.riskScore}/100
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-[11px] font-bold ${
                          s.status === "CLEARED" ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-medium truncate max-w-[120px]">
                      {s.officerId || "Officer"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedCase(s)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-3"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                      page === pageNum
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 px-3"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
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
                  <div className="font-bold text-slate-900 text-base">{selectedCase.name}</div>
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                  <span className="text-slate-400 block">Document</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {selectedCase.documentType}
                  </span>
                </div>
                <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                  <span className="text-slate-400 block">Status</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {selectedCase.status}
                  </span>
                </div>
                <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                  <span className="text-slate-400 block">Biometric Match</span>
                  <span className="font-bold text-blue-600 truncate block">
                    {selectedCase.faceMatchScore || 96.2}%
                  </span>
                </div>
                <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                  <span className="text-slate-400 block">Tampering AI</span>
                  <span
                    className={`font-bold truncate block ${
                      selectedCase.isTampered ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {selectedCase.isTampered ? "Tampered" : "Clean"}
                  </span>
                </div>
              </div>

              <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 text-xs">
                <span className="text-slate-400 block">Screened At</span>
                <span className="font-semibold text-slate-800">
                  {new Date(selectedCase.time).toLocaleString()}
                </span>
              </div>

              {selectedCase.tamperingType && selectedCase.isTampered && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs">
                  <span className="font-bold block mb-0.5">Tampering Classification:</span>
                  Detected Method:{" "}
                  <span className="font-semibold text-purple-700">
                    {selectedCase.tamperingType}
                  </span>
                </div>
              )}

              {selectedCase.primaryConcern && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  <span className="font-bold block mb-0.5">Primary Concern:</span>
                  {selectedCase.primaryConcern}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedCase(null)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

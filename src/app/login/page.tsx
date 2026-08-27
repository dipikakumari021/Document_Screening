"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, Eye, EyeOff, AlertTriangle, CheckCircle2, UserCheck, ShieldAlert, Award } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const PRESET_OFFICERS = [
  {
    role: "Immigration Inspector",
    name: "Inspector Arjun Singh",
    email: "arjun.singh@pramaan.gov.in",
    password: "password123",
    icon: UserCheck,
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    role: "Border Security Officer",
    name: "Officer Priya Sharma",
    email: "priya.sharma@pramaan.gov.in",
    password: "password123",
    icon: Shield,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    role: "Checkpoint Supervisor",
    name: "Supervisor Vikram Rao",
    email: "vikram.rao@pramaan.gov.in",
    password: "password123",
    icon: Award,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState("arjun.singh@pramaan.gov.in");
  const [password, setPassword] = useState("password123");
  const [selectedRole, setSelectedRole] = useState("Immigration Inspector");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSelectOfficer = (officer: typeof PRESET_OFFICERS[0]) => {
    setEmail(officer.email);
    setPassword(officer.password);
    setSelectedRole(officer.role);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Welcome, ${data.user?.name || "Officer"}. Redirecting to console...`);
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      } else {
        setError(data.message || "Invalid credentials. Please verify your Officer ID & password.");
      }
    } catch (err) {
      setError("An error occurred during authentication. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Left Pane - Dark Mode Verification Graphic */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0A1128] text-white flex-col relative overflow-hidden p-12 justify-between">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl"></div>
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+Cgk8cGF0aCBkPSJNMCAwaDQwdjQwaC00MHoiIGZpbGw9Im5vbmUiLz4KCTxwYXRoIGQ9Ik0wIDBoNDB2NDBoLTQweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utb3BhY2l0eT0iMC4wNSIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjwvc3ZnPg==')] opacity-20"></div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-400" />
          <span className="font-bold text-xl tracking-tight text-white">PRAMAAN AI</span>
          <span className="ml-2 text-xs text-slate-400 uppercase tracking-widest hidden xl:inline-block border-l border-white/20 pl-2">
            Intelligent Identity & Document Screening
          </span>
        </div>

        {/* Center Graphic */}
        <div className="relative z-10 my-8 flex items-center justify-center">
          <div className="relative w-full max-w-lg aspect-[16/10] bg-slate-900 border border-blue-500/30 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center">
            {/* Scanning Line Animation */}
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_3s_ease-in-out_infinite_alternate]"></div>

            {/* Passport Mockup */}
            <div className="flex gap-6 w-full items-center">
              <div className="w-1/2 h-48 bg-slate-800 rounded-lg border border-slate-700 relative overflow-hidden flex items-center justify-center flex-col p-4">
                <div className="w-12 h-16 bg-amber-500/80 rounded mb-4 shadow-md"></div>
                <div className="h-2 w-16 bg-slate-600 rounded mb-2"></div>
                <div className="h-1.5 w-24 bg-slate-700 rounded"></div>
              </div>
              <div className="w-1/2 space-y-4">
                <div className="flex justify-between items-end border-b border-slate-700 pb-2">
                  <div className="space-y-1">
                    <div className="text-[9px] text-slate-500 uppercase">Surname</div>
                    <div className="text-sm font-semibold text-slate-200">KUMAR</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-[9px] text-slate-500 uppercase">Nationality</div>
                    <div className="text-sm font-semibold text-slate-200">INDIAN</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] text-slate-500 uppercase">Document No.</div>
                  <div className="text-sm font-mono text-slate-200 tracking-wider">R1234567</div>
                </div>
                <div className="flex gap-2 items-center text-emerald-400 text-xs font-medium pt-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  VERIFICATION READY
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl xl:text-4xl font-bold mb-3 text-white">
            Intelligent Verification.<br />
            <span className="text-blue-400">Trusted Decisions.</span>
          </h2>
          <p className="text-slate-400 max-w-md text-base leading-relaxed">
            Secure AI-assisted identity and travel document screening for authorized border personnel.
          </p>
        </div>

        {/* Custom Scan Animation styles */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
        `,
          }}
        />
      </div>

      {/* Right Pane - Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 md:p-12 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-auto">
          {/* Header */}
          <div className="p-6 md:p-8 text-center pb-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 text-blue-600 mb-3 shadow-sm border border-blue-100">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              Officer Portal Sign In
            </h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Select an authorized officer profile below or sign in with your official ID.
            </p>
          </div>

          {/* Quick Role Selector for Demo */}
          <div className="px-6 md:px-8 pb-3">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Select Officer Role (Demo Profiles)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_OFFICERS.map((off) => {
                const isSelected = email === off.email;
                const IconComponent = off.icon;
                return (
                  <button
                    key={off.role}
                    type="button"
                    onClick={() => handleSelectOfficer(off)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "bg-blue-50/90 border-blue-500 shadow-sm ring-1 ring-blue-500"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    <IconComponent
                      className={`w-4 h-4 mb-1.5 ${
                        isSelected ? "text-blue-600" : "text-slate-500"
                      }`}
                    />
                    <span
                      className={`text-[11px] font-bold leading-tight ${
                        isSelected ? "text-blue-900" : "text-slate-800"
                      }`}
                    >
                      {off.role.replace(" Officer", "")}
                    </span>

                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <div className="px-6 md:px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* Officer ID / Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Officer ID / Official Email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="e.g. arjun.singh@pramaan.gov.in"
                    className="pl-9 h-11 bg-slate-50 border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus-visible:ring-blue-500 focus-visible:bg-white text-xs"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter official password"
                    className="pl-9 pr-10 h-11 bg-slate-50 border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus-visible:ring-blue-500 focus-visible:bg-white text-xs"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    id="remember"
                    defaultChecked
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember session on this device</span>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-200 flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Message */}
              {successMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs border border-emerald-200 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-blue-500/20 transition-all mt-2"
                disabled={loading}
              >
                {loading ? "Authenticating Officer..." : "Sign In to Console →"}
              </Button>
            </form>
          </div>

          {/* Footer Security Badges */}
          <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex justify-center items-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <Shield className="w-3.5 h-3.5" /> Secure connection
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Protected session
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}



"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, Eye, EyeOff, AlertTriangle, BadgeCheck, CheckCircle2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Border Security Officer");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setSuccessMsg("Account registered successfully! Redirecting...");
          setTimeout(() => {
            router.push("/dashboard");
          }, 800);
        } else {
          setError(data.message || "Registration failed. Please try again.");
        }
      } catch (err) {
        setError("An unexpected network error occurred.");
      } finally {
        setLoading(false);
      }
    } else {
      // Sign In mode
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          router.push("/dashboard");
        } else {
          setError(data.message || "Invalid credentials. Please verify your ID & password.");
        }
      } catch (err) {
        setError("An error occurred during authentication. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Left Pane - Dark Mode Animation/Graphic */}
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
          <div className="p-6 md:p-8 text-center pb-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 text-blue-600 mb-4 shadow-sm">
              {mode === "login" ? <Shield className="w-7 h-7" /> : <UserPlus className="w-7 h-7" />}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {mode === "login" ? "Officer Sign In" : "Register Officer"}
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              {mode === "login"
                ? "Access the PRAMAAN AI screening console."
                : "Create authorized credentials for document screening."}
            </p>

            {/* Toggle Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl mt-6 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${
                  mode === "login"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${
                  mode === "register"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Register Officer
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="px-6 md:px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* Full Name for Register Mode */}
              {mode === "register" && (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="e.g. Officer Vikram Sharma"
                      className="pl-9 h-11 bg-slate-50 border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus-visible:ring-blue-500 focus-visible:bg-white"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={mode === "register"}
                    />
                  </div>
                </div>
              )}

              {/* Officer ID / Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {mode === "login" ? "Officer ID / Email" : "Official Email / Officer ID"}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Enter officer ID or email"
                    className="pl-9 h-11 bg-slate-50 border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus-visible:ring-blue-500 focus-visible:bg-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Role / Designation for Register Mode */}
              {mode === "register" && (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Designation / Department
                  </label>
                  <div className="relative">
                    <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full pl-9 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    >
                      <option value="Border Security Officer">Border Security Officer</option>
                      <option value="Document Verification Specialist">Document Verification Specialist</option>
                      <option value="Immigration Inspector">Immigration Inspector</option>
                      <option value="Checkpoint Supervisor">Checkpoint Supervisor</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter secure password"
                    className="pl-9 pr-10 h-11 bg-slate-50 border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus-visible:ring-blue-500 focus-visible:bg-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
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

              {/* Confirm Password for Register Mode */}
              {mode === "register" && (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      className="pl-9 pr-10 h-11 bg-slate-50 border-slate-200 text-slate-900 font-medium placeholder:text-slate-400 focus-visible:ring-blue-500 focus-visible:bg-white"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={mode === "register"}
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "login" && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      id="remember"
                      defaultChecked
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Remember this device</span>
                  </label>
                  <span className="text-blue-600 hover:underline cursor-pointer">Forgot ID?</span>
                </div>
              )}

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
                {loading
                  ? mode === "login"
                    ? "Authenticating..."
                    : "Registering Officer..."
                  : mode === "login"
                  ? "Sign In →"
                  : "Complete Registration →"}
              </Button>
            </form>

            {/* Switch Mode Prompt */}
            <div className="mt-6 text-center text-xs text-slate-500">
              {mode === "login" ? (
                <p>
                  Need new officer credentials?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setError("");
                    }}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Register here
                  </button>
                </p>
              ) : (
                <p>
                  Already have an authorized account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError("");
                    }}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
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

        <p className="mt-6 text-xs text-slate-400 text-center">
          Authorized personnel only. (Quick demo login: <code className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">demo@example.com</code> / <code className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">password123</code>)
        </p>
      </div>
    </div>
  );
}

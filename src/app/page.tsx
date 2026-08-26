"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  Shield,
  FileText,
  CheckCircle,
  Search,
  UserCheck,
  Fingerprint,
  UploadCloud,
  Cpu,
  Clock,
  User,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060D1F] text-slate-50 selection:bg-blue-500/30 font-sans">
      {/* 1. Header / Navbar */}
      <nav className="border-b border-white/10 bg-[#060D1F]/90 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              PRAMAAN AI
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-10 text-sm font-medium text-slate-300">
            <a href="#overview" className="hover:text-white transition-colors">
              Overview
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#capabilities" className="hover:text-white transition-colors">
              Capabilities
            </a>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Secure System
            </div>
            <Link href="/login">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-5 h-10 rounded-lg shadow-md shadow-blue-500/20 transition-all">
                Officer Log In →
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section
        id="overview"
        className="pt-36 pb-24 px-6 max-w-7xl mx-auto relative overflow-hidden"
      >
        {/* Glows */}
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="grid lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Hero Left Content */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wider uppercase">
              AI-Powered Border Screening
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.15] text-white">
              Verify Identity.
              <br />
              Detect Anomalies.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-300">
                Make Informed Decisions.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">
              PRAMAAN AI assists border officers by analyzing travel documents,
              verifying identity information and detecting potential anomalies
              through multiple AI-assisted screening layers.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-12 px-7 text-base rounded-xl shadow-lg shadow-blue-600/25 transition-all"
                >
                  Officer Login →
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-medium h-12 px-6 text-base rounded-xl"
                >
                  Explore How It Works <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-8 text-xs sm:text-sm text-slate-400 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                <span>AI-assisted screening</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-400" />
                <span>Human-in-the-loop decision making</span>
              </div>
            </div>
          </div>

          {/* Hero Right Visual (Scanner Frame) */}
          <div className="lg:col-span-6 relative">
            <div className="relative aspect-[4/3] rounded-3xl border border-blue-500/30 bg-[#0A132C]/80 backdrop-blur-xl p-6 md:p-8 shadow-2xl overflow-hidden flex items-center justify-center">
              {/* Subtle Grid Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px]"></div>

              {/* Passport Graphic */}
              <div className="relative z-10 w-56 sm:w-64 h-72 sm:h-80 bg-[#142142] border border-blue-400/20 rounded-2xl shadow-2xl p-5 flex flex-col justify-between transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="flex justify-center pt-2">
                  <div className="w-12 h-16 bg-gradient-to-b from-amber-400 to-amber-600 rounded-sm shadow-md flex items-center justify-center">
                    <Shield className="w-6 h-6 text-slate-950" />
                  </div>
                </div>

                <div className="text-center space-y-1.5">
                  <div className="text-[9px] text-amber-400 uppercase tracking-widest font-semibold">
                    Republic of India
                  </div>
                  <div className="text-base font-serif text-slate-200 tracking-widest font-bold">
                    PASSPORT
                  </div>
                </div>

                <div className="space-y-1.5 opacity-60">
                  <div className="h-1 bg-slate-600 w-full rounded"></div>
                  <div className="h-1 bg-slate-600 w-3/4 rounded"></div>
                  <div className="h-1 bg-slate-600 w-full rounded"></div>
                </div>
              </div>

              {/* Floating Card 1: OCR Extracted Data (Top Right) */}
              <div className="absolute top-6 right-6 sm:top-8 sm:right-8 bg-[#0F1B38]/95 backdrop-blur-md border border-blue-500/40 p-4 rounded-xl shadow-2xl z-20 w-52 sm:w-60 text-xs">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                  <span className="text-[10px] font-mono font-bold text-blue-400 tracking-wider">
                    OCR EXTRACTED DATA
                  </span>
                </div>
                <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-500">Name:</span>
                    <span className="text-slate-100 font-semibold">Aarav Mehta</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-500">Passport No:</span>
                    <span className="text-slate-100 font-semibold">P7910041</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-500">Nationality:</span>
                    <span className="text-slate-100 font-semibold">IND</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-500">DOB:</span>
                    <span className="text-slate-100 font-semibold">14 MAR 1990</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Expiry:</span>
                    <span className="text-slate-100 font-semibold">12 MAR 2031</span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 font-bold tracking-wider">
                    ✓ EXTRACTED
                  </span>
                </div>
              </div>

              {/* Floating Card 2: Face Match (Bottom Right) */}
              <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 bg-[#0F1B38]/95 backdrop-blur-md border border-cyan-500/40 p-4 rounded-xl shadow-2xl z-20 w-48 sm:w-56 text-xs">
                <div className="flex items-center gap-1.5 mb-2">
                  <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider">
                    FACE MATCH
                  </span>
                </div>
                <div className="flex items-center justify-between my-2">
                  <div>
                    <div className="text-[9px] text-slate-400 uppercase">Match Score</div>
                    <div className="text-xl font-extrabold text-white font-mono">
                      92.4%
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[10px]">
                    ✓ MATCH
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section: "One Screening. Multiple Verification Layers." */}
      <section
        id="capabilities"
        className="py-24 bg-white text-slate-900 border-t border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              One Screening. Multiple Verification Layers.
            </h2>
            <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 01 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    01
                  </div>
                  <FileText className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">OCR & MRZ</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Extract and verify identity information from travel documents.
                </p>
              </div>
              <div className="bg-slate-900 rounded-xl p-3.5 text-[10px] font-mono text-slate-300 space-y-1">
                <div className="truncate text-blue-400">P&lt;INDMEHTA&lt;&lt;AARAV&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
                <div className="truncate text-slate-400">P7910041M9003147IND&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
              </div>
            </div>

            {/* Card 02 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    02
                  </div>
                  <CheckCircle className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Document Validation
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Check expiry, format, consistency and reference records.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="w-20 h-2 bg-slate-300 rounded"></div>
                  <div className="w-28 h-2 bg-slate-200 rounded"></div>
                </div>
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Card 03 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    03
                  </div>
                  <Search className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Tampering Detection
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Identify suspicious alterations and document anomalies.
                </p>
              </div>
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between">
                <div className="text-[11px] font-mono text-slate-800 font-semibold">
                  DATE OF ISSUE <br />
                  <span className="text-slate-600">14 MAR 1990</span>
                </div>
                <div className="w-7 h-7 rounded-full border border-red-500 text-red-600 text-[11px] font-bold flex items-center justify-center bg-red-50">
                  93
                </div>
              </div>
            </div>

            {/* Card 04 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    04
                  </div>
                  <UserCheck className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Face Verification
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Compare the document photograph with the presented individual.
                </p>
              </div>
              <div className="bg-slate-900 rounded-xl p-3 flex items-center justify-between">
                <div className="w-8 h-10 bg-slate-700 rounded border border-slate-600 flex items-center justify-center text-xs text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 mx-3 h-0.5 bg-blue-500 relative flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                </div>
                <div className="w-8 h-10 bg-slate-800 rounded border border-cyan-400 flex items-center justify-center text-xs text-cyan-300">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section: "From Document to Decision" Pipeline Timeline */}
      <section
        id="how-it-works"
        className="py-20 bg-slate-50 text-slate-900 border-t border-slate-200 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              From Document to Decision
            </h2>
          </div>

          <div className="relative">
            {/* Horizontal connecting line */}
            <div className="hidden lg:block absolute top-7 left-12 right-12 h-0.5 bg-slate-200 z-0"></div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-6 relative z-10">
              {[
                { name: "Document Upload", icon: UploadCloud, active: false },
                { name: "OCR", icon: FileText, active: false },
                { name: "Validation", icon: CheckCircle, active: false },
                { name: "AI Analysis", icon: Cpu, active: true },
                { name: "Face Verification", icon: UserCheck, active: false },
                { name: "Risk Assessment", icon: Clock, active: false },
                { name: "Officer Decision", icon: User, active: false },
              ].map((step, idx) => (
                <div key={idx} className="flex flex-col items-center text-center">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm mb-3 transition-all ${
                      step.active
                        ? "bg-[#060D1F] text-blue-400 ring-4 ring-blue-500/30 shadow-lg shadow-blue-500/30 scale-110"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      step.active ? "text-blue-600 font-bold" : "text-slate-700"
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section: "AI-Assisted. Human-Decided." Callout Box */}
      <section className="py-16 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#0A132C] border border-blue-500/20 rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl">
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:28px_28px]"></div>

            <div className="grid lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-8 space-y-4 text-left">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  AI-Assisted.{" "}
                  <span className="text-blue-400">Human-Decided.</span>
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                  PRAMAAN AI does not replace the authorized officer. It consolidates
                  verification signals, highlights anomalies and provides
                  explainable risk indicators so officers can make faster and more
                  informed decisions.
                </p>
              </div>

              <div className="lg:col-span-4 flex items-center justify-center lg:justify-end">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-inner">
                    <Shield className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section: "Ready to begin screening?" Call to Action Bar */}
      <section className="pb-16 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-3 text-slate-900 font-bold text-lg sm:text-xl">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <span>Ready to begin screening?</span>
            </div>

            <Link href="/dashboard">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 h-12 rounded-xl shadow-md shadow-blue-500/20">
                Enter Officer Console →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Comprehensive Dark Footer */}
      <footer className="bg-[#040A18] text-slate-400 pt-16 pb-12 border-t border-white/10 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10">
            {/* Brand column */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2.5">
                <Shield className="w-6 h-6 text-blue-500" />
                <span className="font-bold text-lg tracking-tight text-white">
                  PRAMAAN AI
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
                Intelligent Verification. Trusted Decisions.
              </p>
            </div>

            {/* Column 1 */}
            <div className="lg:col-span-3 space-y-3 text-xs sm:text-sm">
              <div className="font-bold text-white text-xs uppercase tracking-wider">
                Secure Screening
              </div>
              <ul className="space-y-2">
                <li>
                  <a href="#overview" className="hover:text-white transition-colors">
                    Overview
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-white transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#capabilities" className="hover:text-white transition-colors">
                    Capabilities
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 2 */}
            <div className="lg:col-span-2 space-y-3 text-xs sm:text-sm">
              <div className="font-bold text-white text-xs uppercase tracking-wider">
                Privacy
              </div>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Data Protection
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Usage Policy
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3 */}
            <div className="lg:col-span-3 space-y-3 text-xs sm:text-sm">
              <div className="font-bold text-white text-xs uppercase tracking-wider">
                System Information
              </div>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About PRAMAAN AI
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Security
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Support
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© 2026 PRAMAAN AI. All rights reserved.</p>
            <p className="text-[11px] text-slate-600">
              For Authorized Government & Border Security Use
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

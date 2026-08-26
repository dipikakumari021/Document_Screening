"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shield, LayoutDashboard, FileScan, History, FileBarChart, Settings, LogOut, Bell, User } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [officer, setOfficer] = useState<{ name: string; role: string; email?: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.user) {
          setOfficer(data.user);
        } else {
          // Fallback to a default name or redirect to login
          setOfficer({ name: "Authorized Officer", role: "OFFICER" });
        }
      })
      .catch(() => {
        setOfficer({ name: "Authorized Officer", role: "OFFICER" });
      });
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error(err);
    }
    router.push("/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "AO";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "New Screening", href: "/dashboard/new", icon: FileScan },
    { name: "Screening History", href: "/dashboard/history", icon: History },
    { name: "Reports", href: "/dashboard/reports", icon: FileBarChart },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#0A1128] text-slate-300 flex flex-col md:min-h-screen flex-shrink-0">
        <Link href="/" className="p-6 flex items-center gap-3 border-b border-slate-800 hover:opacity-90 transition-opacity">
          <Shield className="w-8 h-8 text-blue-500" />
          <span className="font-bold text-xl text-white tracking-tight">PRAMAAN AI</span>
        </Link>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-600/10 text-blue-400 font-medium border-l-2 border-blue-500"
                    : "hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>

        <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>SECURE SYSTEM</span>
          </div>
          <span className="text-[10px] text-slate-600">v2.4</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8 shrink-0">
          <div className="text-sm text-slate-500 font-medium flex items-center gap-2">
            <Link href="/" className="text-blue-600 hover:underline">
              PRAMAAN AI
            </Link>
            <span>/</span>
            <span className="text-slate-800 capitalize font-semibold">
              {pathname === "/dashboard" ? "Dashboard" : pathname.split("/").pop()}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {getInitials(officer?.name)}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-semibold text-slate-900 leading-tight">
                  {officer?.name || "Loading..."}
                </div>
                <div className="text-[11px] text-slate-500 font-medium capitalize">
                  {officer?.role?.toLowerCase() || "Officer"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6 lg:p-8 bg-slate-50/60">
          {children}
        </div>
      </main>
    </div>
  );
}

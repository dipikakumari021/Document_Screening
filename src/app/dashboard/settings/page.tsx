"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  User,
  Lock,
  Bell,
  Shield,
  CheckCircle,
  AlertTriangle,
  Server,
  Save,
  Eye,
  EyeOff,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile editing
  const [editName, setEditName] = useState("");
  const [nameStatus, setNameStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{
    state: "idle" | "saving" | "saved" | "error";
    message: string;
  }>({ state: "idle", message: "" });

  // Notification preferences (localStorage & SMTP test)
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [highRiskAlerts, setHighRiskAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<{
    state: "idle" | "sending" | "sent" | "error";
    message: string;
  }>({ state: "idle", message: "" });

  const handleTestEmail = async () => {
    setTestEmailStatus({ state: "sending", message: "Sending test alert email via Gmail SMTP..." });
    try {
      const res = await fetch("/api/settings", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTestEmailStatus({ state: "sent", message: data.message || "Test email sent successfully!" });
      } else {
        setTestEmailStatus({ state: "error", message: data.error || "Failed to send test email." });
      }
    } catch {
      setTestEmailStatus({ state: "error", message: "Network error sending test email." });
    }
  };

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.user);
        setEditName(data.user?.name || "");
        setLoading(false);
      })
      .catch(() => {
        setProfile({ name: "Authorized Officer", role: "OFFICER", email: "" });
        setEditName("Authorized Officer");
        setLoading(false);
      });

    // Load notification prefs from localStorage
    if (typeof window !== "undefined") {
      const prefs = localStorage.getItem("pramaan_notification_prefs");
      if (prefs) {
        try {
          const parsed = JSON.parse(prefs);
          setEmailAlerts(parsed.emailAlerts ?? true);
          setHighRiskAlerts(parsed.highRiskAlerts ?? true);
          setDailyDigest(parsed.dailyDigest ?? false);
        } catch {
          // use defaults
        }
      }
    }
  }, []);

  const saveNotificationPrefs = (updates: Partial<{ emailAlerts: boolean; highRiskAlerts: boolean; dailyDigest: boolean }>) => {
    const newPrefs = {
      emailAlerts: updates.emailAlerts ?? emailAlerts,
      highRiskAlerts: updates.highRiskAlerts ?? highRiskAlerts,
      dailyDigest: updates.dailyDigest ?? dailyDigest,
    };
    localStorage.setItem("pramaan_notification_prefs", JSON.stringify(newPrefs));
  };

  const handleUpdateName = async () => {
    if (!editName.trim() || editName.trim() === profile?.name) return;

    setNameStatus("saving");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile((prev: any) => ({ ...prev, name: data.user.name }));
        setNameStatus("saved");
        setTimeout(() => setNameStatus("idle"), 2500);
      } else {
        setNameStatus("error");
        setTimeout(() => setNameStatus("idle"), 3000);
      }
    } catch {
      setNameStatus("error");
      setTimeout(() => setNameStatus("idle"), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordStatus({ state: "error", message: "All fields are required." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ state: "error", message: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ state: "error", message: "New passwords do not match." });
      return;
    }

    setPasswordStatus({ state: "saving", message: "" });
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordStatus({ state: "saved", message: "Password updated successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordStatus({ state: "idle", message: "" }), 3000);
      } else {
        setPasswordStatus({ state: "error", message: data.error || "Failed to update password." });
      }
    } catch {
      setPasswordStatus({ state: "error", message: "Network error. Please try again." });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <Settings className="w-7 h-7 text-blue-600" />
          Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your profile, security, and notification preferences.
        </p>
      </div>

      {/* Profile Section */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Officer Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-lg">
              {profile?.name
                ? profile.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "AO"}
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">{profile?.name}</h3>
              <p className="text-sm text-slate-500">{profile?.email || "No email on file"}</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 mt-1">
                {profile?.role || "OFFICER"}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Display Name
            </label>
            <div className="flex gap-3">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your display name"
                className="flex-1"
              />
              <Button
                onClick={handleUpdateName}
                disabled={nameStatus === "saving" || !editName.trim() || editName.trim() === profile?.name}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 flex items-center gap-2"
              >
                {nameStatus === "saving" ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : nameStatus === "saved" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {nameStatus === "saved" ? "Saved" : "Update"}
              </Button>
            </div>
            {nameStatus === "error" && (
              <p className="text-xs text-red-600 font-semibold">Failed to update name. Please try again.</p>
            )}
          </div>

          {profile?.createdAt && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Account created: {new Date(profile.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Current Password
            </label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Confirm Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          {passwordStatus.message && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                passwordStatus.state === "saved"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {passwordStatus.state === "saved" ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {passwordStatus.message}
            </div>
          )}

          <Button
            onClick={handleChangePassword}
            disabled={passwordStatus.state === "saving"}
            className="bg-amber-600 hover:bg-amber-700 text-white px-5 flex items-center gap-2"
          >
            {passwordStatus.state === "saving" ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Lock className="w-4 h-4" />
            )}
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-600" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <ToggleRow
            label="Email Alerts"
            description="Receive email notifications for all screening results."
            checked={emailAlerts}
            onChange={(val) => {
              setEmailAlerts(val);
              saveNotificationPrefs({ emailAlerts: val });
            }}
          />
          <ToggleRow
            label="High-Risk Alerts"
            description="Get instant alerts when a high-risk screening is flagged."
            checked={highRiskAlerts}
            onChange={(val) => {
              setHighRiskAlerts(val);
              saveNotificationPrefs({ highRiskAlerts: val });
            }}
          />
          <ToggleRow
            label="Daily Digest"
            description="Receive a daily summary of all screening activity."
            checked={dailyDigest}
            onChange={(val) => {
              setDailyDigest(val);
              saveNotificationPrefs({ dailyDigest: val });
            }}
          />

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-700">Configured Notification Email</p>
              <p className="text-xs text-slate-500 font-mono">dipikakumari0021@gmail.com (Gmail SMTP Active)</p>
            </div>
            <Button
              onClick={handleTestEmail}
              disabled={testEmailStatus.state === "sending"}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold flex items-center gap-2 rounded-xl transition-all shadow-sm"
            >
              {testEmailStatus.state === "sending" ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              {testEmailStatus.state === "sending" ? "Sending Alert..." : "Send Test Alert Email"}
            </Button>
          </div>

          {testEmailStatus.message && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                testEmailStatus.state === "sent"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : testEmailStatus.state === "sending"
                  ? "bg-blue-50 border border-blue-200 text-blue-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {testEmailStatus.state === "sent" ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : testEmailStatus.state === "sending" ? (
                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              {testEmailStatus.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-500" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Application
              </p>
              <p className="font-bold text-slate-900 mt-1">PRAMAAN AI</p>
              <p className="text-xs text-slate-500">v2.4</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Database
              </p>
              <p className="font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected
              </p>
              <p className="text-xs text-slate-500">MongoDB Atlas</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                AI Engine
              </p>
              <p className="font-bold text-blue-600 mt-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Active
              </p>
              <p className="text-xs text-slate-500">3-Model Tampering Pipeline</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Toggle switch component
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        aria-checked={checked}
        role="switch"
        className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 overflow-hidden flex-shrink-0 ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        ></span>
      </button>
    </div>
  );
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { cookies } from "next/headers";
import { decrypt, encrypt } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { verifyEmailConnection, sendHighRiskAlert } from "@/lib/email";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({
        user: { name: "Authorized Officer", role: "OFFICER", email: "" },
        preferences: { emailAlerts: false, highRiskAlerts: true, dailyDigest: false, notificationEmail: "" },
      });
    }

    const payload = await decrypt(sessionToken);
    if (!payload) {
      return NextResponse.json({
        user: { name: "Authorized Officer", role: "OFFICER", email: "" },
        preferences: { emailAlerts: false, highRiskAlerts: true, dailyDigest: false, notificationEmail: "" },
      });
    }

    await connectDB();
    const user = await User.findById(payload.userId).lean() as any;

    if (user) {
      return NextResponse.json({
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
        preferences: {
          emailAlerts: user.emailAlerts ?? false,
          highRiskAlerts: user.highRiskAlerts ?? true,
          dailyDigest: user.dailyDigest ?? false,
          notificationEmail: user.notificationEmail || user.email || "",
        },
      });
    }

    return NextResponse.json({
      user: { name: payload.name || "Authorized Officer", role: payload.role || "OFFICER", email: "" },
      preferences: { emailAlerts: false, highRiskAlerts: true, dailyDigest: false, notificationEmail: "" },
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const payload = await decrypt(sessionToken);
    if (!payload?.userId) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const { name, currentPassword, newPassword, emailAlerts, highRiskAlerts, dailyDigest, notificationEmail } = body;

    await connectDB();
    const user = await User.findById(payload.userId);

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Update name
    if (name && name.trim()) {
      user.name = name.trim();
    }

    // Update password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ success: false, error: "Current password required" }, { status: 400 });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ success: false, error: "Current password is incorrect" }, { status: 400 });
      }
      user.password = await bcrypt.hash(newPassword, 12);
    }

    // Update notification preferences
    if (typeof emailAlerts === "boolean") user.emailAlerts = emailAlerts;
    if (typeof highRiskAlerts === "boolean") user.highRiskAlerts = highRiskAlerts;
    if (typeof dailyDigest === "boolean") user.dailyDigest = dailyDigest;
    if (notificationEmail !== undefined) user.notificationEmail = notificationEmail.trim() || user.email;

    await user.save();

    // Refresh JWT with new name
    const newToken = await encrypt({
      userId: payload.userId,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: { name: user.name, email: user.email, role: user.role },
      preferences: {
        emailAlerts: user.emailAlerts,
        highRiskAlerts: user.highRiskAlerts,
        dailyDigest: user.dailyDigest,
        notificationEmail: user.notificationEmail || user.email,
      },
    });

    response.cookies.set("session", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 });
  }
}

// Test email connection and send test email
export async function POST() {
  try {
    const isConnected = await verifyEmailConnection();
    if (!isConnected) {
      return NextResponse.json({ success: false, error: "SMTP connection failed. Check credentials." }, { status: 400 });
    }

    const recipientEmail = process.env.GMAIL_USER || "dipikakumari0021@gmail.com";
    await sendHighRiskAlert({
      to: recipientEmail,
      officerName: "Authorized Officer",
      screeningId: "SCR-TEST-001",
      passengerName: "Test Passenger (System Check)",
      documentType: "Passport",
      riskScore: 94,
      riskLevel: "HIGH",
      primaryConcern: "System Verification Test - High Risk Notification Pipeline",
      isTampered: true,
      tamperingType: "Digital Photo Substitution Test",
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Gmail SMTP connected! Test alert email sent successfully to ${recipientEmail}`,
    });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

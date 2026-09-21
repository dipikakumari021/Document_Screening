import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { encrypt } from "@/lib/auth";
import { ensureOfficersSeeded } from "@/lib/seed";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const PRESET_CREDENTIALS: Record<string, { id: string; name: string; role: string; password: string }> = {
  "arjun.singh@pramaan.gov.in": {
    id: "off-arjun-01",
    name: "Inspector Arjun Singh",
    role: "Immigration Inspector",
    password: "password123",
  },
  "priya.sharma@pramaan.gov.in": {
    id: "off-priya-02",
    name: "Officer Priya Sharma",
    role: "Border Security Officer",
    password: "password123",
  },
  "vikram.rao@pramaan.gov.in": {
    id: "off-vikram-03",
    name: "Supervisor Vikram Rao",
    role: "Checkpoint Supervisor",
    password: "password123",
  },
  "demo@example.com": {
    id: "off-demo-04",
    name: "Officer Arjun Singh",
    role: "Border Security Officer",
    password: "password123",
  },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Please enter your Officer ID/Email and Password." },
        { status: 400 }
      );
    }

    const normalizedIdentifier = email.trim().toLowerCase();
    let authenticatedUser: { id: string; name: string; role: string } | null = null;

    // 1. Attempt database authentication
    try {
      await connectDB();
      await ensureOfficersSeeded();

      const user = await User.findOne({ email: normalizedIdentifier });
      if (user) {
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (passwordMatch) {
          authenticatedUser = {
            id: user._id ? user._id.toString() : user.id,
            name: user.name,
            role: user.role,
          };
        }
      }
    } catch (dbError) {
      console.warn("Database lookup failed during auth, checking fallback credentials:", dbError);
    }

    // 2. Fallback to preset credentials if DB was offline or user not yet in DB
    if (!authenticatedUser) {
      const preset = PRESET_CREDENTIALS[normalizedIdentifier];
      if (preset && preset.password === password) {
        authenticatedUser = {
          id: preset.id,
          name: preset.name,
          role: preset.role,
        };
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials. Please verify your Officer ID & password." },
        { status: 401 }
      );
    }

    // Generate JWT Session
    const sessionToken = await encrypt({
      userId: authenticatedUser.id,
      name: authenticatedUser.name,
      role: authenticatedUser.role,
    });

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: authenticatedUser,
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { encrypt } from "@/lib/auth";
import { ensureOfficersSeeded } from "@/lib/seed";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Please enter your Officer ID/Email and Password." },
        { status: 400 }
      );
    }

    await connectDB();
    await ensureOfficersSeeded();

    const normalizedIdentifier = email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedIdentifier });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const userId = user._id ? user._id.toString() : user.id;

    // Generate JWT
    const sessionToken = await encrypt({
      userId,
      name: user.name,
      role: user.role,
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const payload = await decrypt(sessionToken);
    if (!payload || !payload.userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    await connectDB();

    // Fetch latest user details from MongoDB
    const user = await User.findById(payload.userId).select("name email role").lean();

    if (!user) {
      return NextResponse.json({
        user: {
          id: payload.userId,
          name: payload.name || "Officer",
          role: payload.role || "OFFICER",
        },
      });
    }

    return NextResponse.json({
      user: {
        id: (user as any)._id ? (user as any)._id.toString() : payload.userId,
        name: (user as any).name,
        email: (user as any).email,
        role: (user as any).role,
      },
    });
  } catch (error) {
    console.error("Session verification error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Public registration is disabled. Officer accounts are pre-configured in the database by Department Administration.",
    },
    { status: 403 }
  );
}


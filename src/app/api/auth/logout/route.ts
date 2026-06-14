import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/errors/handler";

export async function POST() {
  try {
    await deleteSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

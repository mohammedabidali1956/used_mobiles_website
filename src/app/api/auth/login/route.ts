import { NextResponse } from "next/server";
import { userRepo } from "@/lib/repositories";
import { zLoginCredentials } from "@/lib/validators/user";
import { createSession } from "@/lib/auth/session";
import { getRoleHomeUrl } from "@/lib/auth/permissions";
import { handleRouteError } from "@/lib/errors/handler";
import { AppError } from "@/lib/errors/AppError";
import bcryptjs from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const credentials = zLoginCredentials.parse(body);

    const user = await userRepo.findByEmail(credentials.email);
    if (!user) {
      // Generic error message to prevent email enumeration
      throw new AppError("UNAUTHORIZED", "Invalid email or password.");
    }

    if (!user.isActive) {
      throw new AppError(
        "UNAUTHORIZED",
        "Your account has been deactivated. Please contact an administrator."
      );
    }

    const isPasswordValid = await bcryptjs.compare(
      credentials.password,
      user.passwordHash
    );
    
    if (!isPasswordValid) {
      throw new AppError("UNAUTHORIZED", "Invalid email or password.");
    }

    // Update last login timestamp in database
    await userRepo.updateLastLogin(user.id);

    // Create session cookie
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      user: {
        name: user.name,
        role: user.role,
      },
      redirectUrl: getRoleHomeUrl(user.role),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

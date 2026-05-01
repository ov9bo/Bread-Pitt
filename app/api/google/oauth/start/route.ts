import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { buildAuthUrl, googleConfigured } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.redirect(new URL("/login", baseUrl()));
  if (!googleConfigured()) {
    return NextResponse.redirect(
      new URL("/settings?google=not_configured", baseUrl())
    );
  }
  const url = buildAuthUrl(user.id);
  return NextResponse.redirect(url);
}

function baseUrl(): string {
  return process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
}

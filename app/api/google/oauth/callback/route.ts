import { NextResponse } from "next/server";
import { exchangeCode, fetchUserInfo, persistTokens, verifyState } from "@/lib/google/oauth";
import { backfillUserCalendar } from "@/lib/google/sync";
import { ensureBreadPittCalendar } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function baseUrl(): string {
  return process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(new URL(`/settings?google=error&reason=${encodeURIComponent(error)}`, baseUrl()));
  }
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?google=missing_params", baseUrl()));
  }
  const userId = verifyState(state);
  if (!userId) {
    return NextResponse.redirect(new URL("/settings?google=bad_state", baseUrl()));
  }

  try {
    const tokens = await exchangeCode(code);
    const info = await fetchUserInfo(tokens.access_token);
    await persistTokens(userId, tokens, info.email);
    await ensureBreadPittCalendar(userId);
    const { created } = await backfillUserCalendar(userId);
    return NextResponse.redirect(
      new URL(`/settings?google=connected&backfilled=${created}`, baseUrl())
    );
  } catch (e) {
    console.error("[gcal] callback failed", e);
    return NextResponse.redirect(
      new URL(`/settings?google=error&reason=${encodeURIComponent(String(e))}`, baseUrl())
    );
  }
}

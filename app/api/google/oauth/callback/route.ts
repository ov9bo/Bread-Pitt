import { NextResponse } from "next/server";
import { exchangeCode, fetchUserInfo, persistTokens, verifyState } from "@/lib/google/oauth";
import { backfillUserCalendar } from "@/lib/google/sync";
import { ensureBreadPittCalendar } from "@/lib/google/calendar";
import { googleOAuthCallbackSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function baseUrl(): string {
  return process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
}

function redirectWithReason(reason: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ google: reason, ...extra });
  return NextResponse.redirect(new URL(`/settings?${params.toString()}`, baseUrl()));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = googleOAuthCallbackSchema.safeParse({
    code: url.searchParams.get("code") ?? undefined,
    state: url.searchParams.get("state") ?? undefined,
    error: url.searchParams.get("error") ?? undefined,
  });
  if (!parsed.success) {
    return redirectWithReason("missing_params");
  }

  // Map upstream error to an opaque code so reasons don't leak into browser
  // history or access logs.
  if (parsed.data.error) {
    console.error("[gcal] oauth error from google:", parsed.data.error);
    return redirectWithReason("denied");
  }

  const { code, state } = parsed.data as { code: string; state: string };
  const userId = verifyState(state);
  if (!userId) {
    return redirectWithReason("bad_state");
  }

  try {
    const tokens = await exchangeCode(code);
    const info = await fetchUserInfo(tokens.access_token);
    await persistTokens(userId, tokens, info.email);
    await ensureBreadPittCalendar(userId);
    const { created } = await backfillUserCalendar(userId);
    return redirectWithReason("connected", { backfilled: String(created) });
  } catch (e) {
    console.error("[gcal] callback failed", e);
    return redirectWithReason("error");
  }
}

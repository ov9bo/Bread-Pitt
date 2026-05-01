import { makeWebhookHandler } from "@/lib/telegram/bot";
import { telegramUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const handler = makeWebhookHandler();
  if (!handler) return new Response("Bot not configured", { status: 503 });

  // Sanity-check the envelope before handing off to grammY. grammY does the
  // deep parsing and the secret-token check; this is a cheap 400 for obviously
  // malformed POSTs (probes, scanners, mistyped URLs).
  let body: unknown;
  try {
    body = await req.clone().json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
  const parsed = telegramUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Bad Request", { status: 400 });
  }

  return handler(req);
}

export async function GET() {
  return new Response("ok");
}

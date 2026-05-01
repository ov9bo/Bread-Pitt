import { makeWebhookHandler } from "@/lib/telegram/bot";
import { telegramUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REQUIRED_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(req: Request) {
  // Reject before any DB work if the secret header is missing or wrong.
  // This must happen even when the bot isn't configured so probes get a 401.
  const incoming = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!REQUIRED_SECRET || incoming !== REQUIRED_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const handler = makeWebhookHandler();
  if (!handler) return new Response("Bot not configured", { status: 503 });

  // Sanity-check the envelope before handing off to grammY. grammY does the
  // deep parsing; this is a cheap 400 for obviously malformed POSTs.
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

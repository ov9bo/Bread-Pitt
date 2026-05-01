import { makeWebhookHandler } from "@/lib/telegram/bot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const handler = makeWebhookHandler();
  if (!handler) return new Response("Bot not configured", { status: 503 });
  return handler(req);
}

export async function GET() {
  return new Response("ok");
}

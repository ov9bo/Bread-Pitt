import { Suspense } from "react";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await readSession();
  if (session) redirect("/");

  const { next } = await searchParams;

  return (
    <Suspense>
      <LoginForm next={next ?? "/"} />
    </Suspense>
  );
}

"use server";

import { cookies } from "next/headers";

export type Theme = "light" | "dark";

const COOKIE = "crustopher_theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setTheme(theme: Theme): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, theme, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

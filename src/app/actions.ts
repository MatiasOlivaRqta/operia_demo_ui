"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { isAppLocale } from "@/i18n/locale";

const demoCookie = "operia-demo";

export async function loginDemo(formData: FormData): Promise<void> {
  const isProduction = String(process.env.NODE_ENV) === "production";
  if (isProduction) redirect("/login");
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
    redirect("/login?error=credentials");
  }
  const cookieStore = await cookies();
  cookieStore.set(demoCookie, "active", {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
  });
  redirect("/dashboard");
}

export async function logoutDemo(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(demoCookie);
  redirect("/login");
}

export async function setLanguage(value: string): Promise<void> {
  if (!isAppLocale(value)) throw new Error("Unsupported language");
  const cookieStore = await cookies();
  cookieStore.set("operia_lang", value, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  refresh();
}

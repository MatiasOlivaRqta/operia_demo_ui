import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { resolveLocale } from "./locale";

export { resolveLocale } from "./locale";

export default getRequestConfig(async () => {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale(
    cookieStore.get("operia_lang")?.value,
    requestHeaders.get("accept-language") ?? undefined,
  );

  return {
    locale,
    messages: locale === "en" ? en : es,
    timeZone: "America/Argentina/Buenos_Aires",
  };
});

import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import type { AppLocale } from "@/i18n/locale";

export function renderWithIntl(ui: ReactElement, locale: AppLocale = "es"): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

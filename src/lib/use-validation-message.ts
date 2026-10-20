"use client";

import { useTranslations } from "next-intl";

export function useValidationMessage() {
  const t = useTranslations();
  return (message: string | undefined): string | undefined => {
    if (!message) return undefined;
    const [key, ...values] = message.split("|");
    if (!key.startsWith("validation.") && !key.startsWith("errors.")) return message;
    const [rawLimit, rawMaximum] = values;
    const limit = rawLimit === undefined ? undefined : Number(rawLimit);
    if (rawLimit !== undefined && Number.isFinite(limit)) {
      const maximum = rawMaximum === undefined ? undefined : Number(rawMaximum);
      return t(
        key as never,
        {
          limit,
          ...(maximum !== undefined && Number.isFinite(maximum) ? { maximum } : {}),
        } as never,
      );
    }
    return t(key as never);
  };
}

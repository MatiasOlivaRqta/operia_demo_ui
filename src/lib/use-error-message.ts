"use client";

import { useTranslations } from "next-intl";
type ErrorMessageInput = Readonly<{
  key?: string;
  message: string;
  params?: Record<string, string | number>;
}>;

export function useErrorMessage() {
  const t = useTranslations();
  return (error: ErrorMessageInput | null | undefined): string => {
    if (!error) return "";
    return error.key ? t(error.key as never, error.params as never) : error.message;
  };
}

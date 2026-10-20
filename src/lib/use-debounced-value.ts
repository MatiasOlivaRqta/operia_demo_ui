"use client";

import { useEffect, useState } from "react";
import { scheduleDebouncedValue } from "@/lib/debounce";

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => scheduleDebouncedValue(value, delayMs, setDebouncedValue), [delayMs, value]);
  return debouncedValue;
}

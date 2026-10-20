declare const centsBrand: unique symbol;

export type Cents = number & { readonly [centsBrand]: true };

/** Parses a peso amount without rounding or using floating point arithmetic. */
export function parsePesosToCents(text: string): Cents | null {
  const normalized = text.trim().replace(",", ".");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const cents = whole * 100 + fraction;
  return Number.isSafeInteger(cents) && cents <= 2_147_483_647 ? (cents as Cents) : null;
}

export function roundHalfUp(value: number): number {
  return value < 0 ? -Math.floor(Math.abs(value) + 0.5) : Math.floor(value + 0.5);
}

export function toCents(pesos: number): Cents {
  return roundHalfUp(pesos * 100) as Cents;
}

export function fromCents(cents: Cents): number {
  return cents / 100;
}

export function percentOf(cents: Cents, percentage: number): Cents {
  return roundHalfUp((cents * percentage) / 100) as Cents;
}

export function asCents(value: number): Cents {
  return roundHalfUp(value) as Cents;
}

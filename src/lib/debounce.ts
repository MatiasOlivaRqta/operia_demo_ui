export function scheduleDebouncedValue<T>(
  value: T,
  delayMs: number,
  publish: (value: T) => void,
): () => void {
  const timer = setTimeout(() => publish(value), delayMs);
  return () => clearTimeout(timer);
}

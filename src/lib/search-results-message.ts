export function getSearchResultsMessage(
  shown: number,
  total: number,
): Readonly<{ shown: number; total: number }> | null {
  return total > shown ? { shown, total } : null;
}

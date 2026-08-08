/** Search-param builder for every deep link into the /order route. */
export function orderSearch(
  next: Partial<{ category: string; item: string; q: string }> = {},
): { category: string; item: string; q: string } {
  return { category: "", item: "", q: "", ...next };
}
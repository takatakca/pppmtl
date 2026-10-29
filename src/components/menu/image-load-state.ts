export type MenuImageLoadStatus = "loading" | "loaded" | "broken";

export interface MenuImageLoadState {
  source: string | null;
  status: MenuImageLoadStatus;
}

export function imageSourceKey(src: string | null | undefined): string | null {
  return src || null;
}

/**
 * A card may be reused for another menu product without remounting. An error
 * or a successful load from the previous product must not carry to the next.
 */
export function visibleImageStatus(
  state: MenuImageLoadState,
  src: string | null | undefined,
): MenuImageLoadStatus {
  const source = imageSourceKey(src);
  if (state.source !== source) return source ? "loading" : "broken";
  return state.status;
}

export function markImageStatus(
  state: MenuImageLoadState,
  src: string | null | undefined,
  status: MenuImageLoadStatus,
): MenuImageLoadState {
  const source = imageSourceKey(src);
  if (state.source === source && state.status === status) return state;
  return { source, status };
}

import { describe, expect, it } from "vitest";
import {
  imageSourceKey,
  markImageStatus,
  visibleImageStatus,
  type MenuImageLoadState,
} from "./image-load-state";

describe("menu photo lifecycle across reused product cards", () => {
  it("retries a new product image after a previous image failed", () => {
    const old: MenuImageLoadState = { source: "/menu/old.jpg", status: "broken" };
    expect(visibleImageStatus(old, "/menu/new.jpg")).toBe("loading");

    const fresh = markImageStatus(old, "/menu/new.jpg", "loaded");
    expect(fresh).toEqual({ source: "/menu/new.jpg", status: "loaded" });
    expect(visibleImageStatus(fresh, "/menu/new.jpg")).toBe("loaded");
  });

  it("never carries loaded status to a new source or empty image", () => {
    const loaded: MenuImageLoadState = { source: "/menu/old.jpg", status: "loaded" };
    expect(visibleImageStatus(loaded, "/menu/new.jpg")).toBe("loading");
    expect(visibleImageStatus(loaded, null)).toBe("broken");
    expect(visibleImageStatus(loaded, "")).toBe("broken");
    expect(imageSourceKey(undefined)).toBeNull();
  });

  it("does not trigger redundant state changes for an already loaded source", () => {
    const loaded: MenuImageLoadState = { source: "/menu/real.jpg", status: "loaded" };
    expect(markImageStatus(loaded, "/menu/real.jpg", "loaded")).toBe(loaded);
    expect(visibleImageStatus(loaded, "/menu/real.jpg")).toBe("loaded");
  });
});

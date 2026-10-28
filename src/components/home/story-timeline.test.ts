import { describe, expect, it } from "vitest";
import { restaurantLocations } from "@/config/locations";
import { buildStoryTimeline } from "./story-timeline";

describe("PPP franchise story timeline", () => {
  it("uses the same store statuses as the public locations registry", () => {
    const timeline = buildStoryTimeline(restaurantLocations);
    expect(timeline.map(({ status }) => status)).toEqual([
      "past",
      "present",
      "paused",
      "present",
      "next",
      "next",
    ]);
    expect(timeline.find((entry) => entry.place.en === "Sainte-Catherine E")?.note.en).toBe(
      "Temporarily closed",
    );
    expect(timeline.find((entry) => entry.place.en === "Saint-Léonard")?.note.en).toBe(
      "Open now",
    );
  });

  it("reacts to future lifecycle changes without changing the page copy", () => {
    const changed = restaurantLocations.map((entry) =>
      entry.id === "loc-saint-leonard"
        ? { ...entry, lifecycleStatus: "temporarily_closed" as const }
        : entry,
    );
    const timeline = buildStoryTimeline(changed);
    expect(timeline.find((entry) => entry.place.en === "Saint-Léonard")).toMatchObject({
      status: "paused",
      note: { en: "Temporarily closed", fr: "Fermé temporairement" },
    });
  });

  it("fails instead of silently inventing a milestone when location data is missing", () => {
    expect(() => buildStoryTimeline([])).toThrow("Missing PPP story location");
  });
});

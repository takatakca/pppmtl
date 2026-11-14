import type { LocationLifecycle, RestaurantLocation } from "@/config/locations";

export type StoryStatus = "past" | "present" | "next" | "paused";

export interface StoryMilestone {
  status: StoryStatus;
  place: { en: string; fr: string };
  note: { en: string; fr: string };
}

const storyPlaces = [
  { id: "loc-montreal-nord", place: { en: "Montréal-Nord", fr: "Montréal-Nord" } },
  { id: "loc-ndg-somerled", place: { en: "NDG", fr: "NDG" } },
  { id: "loc-sainte-catherine-e", place: { en: "Sainte-Catherine E", fr: "Sainte-Catherine E" } },
  { id: "loc-saint-leonard", place: { en: "Saint-Léonard", fr: "Saint-Léonard" } },
  { id: "loc-chambly", place: { en: "Chambly", fr: "Chambly" } },
  { id: "loc-brossard", place: { en: "Brossard", fr: "Brossard" } },
] as const;

const lifecycleCopy: Record<
  LocationLifecycle,
  { status: StoryStatus; note: StoryMilestone["note"] }
> = {
  open: { status: "present", note: { en: "Open now", fr: "Ouvert" } },
  temporarily_closed: {
    status: "paused",
    note: { en: "Temporarily closed", fr: "Fermé temporairement" },
  },
  closed: { status: "past", note: { en: "Closed", fr: "Fermé" } },
  coming_soon: { status: "next", note: { en: "Coming soon", fr: "Bientôt" } },
};

/**
 * The franchise story is historical, but its operational labels must always
 * agree with the single source of truth for store lifecycle status.
 */
export function buildStoryTimeline(
  locations: readonly Pick<RestaurantLocation, "id" | "lifecycleStatus">[],
): StoryMilestone[] {
  return storyPlaces.map(({ id, place }) => {
    const location = locations.find((entry) => entry.id === id);
    if (!location) throw new Error(`Missing PPP story location: ${id}`);

    const current = lifecycleCopy[location.lifecycleStatus];
    let note = current.note;
    if (id === "loc-montreal-nord" && location.lifecycleStatus === "closed") {
      note = { en: "Where PPP started · closed", fr: "Là où PPP a commencé · fermé" };
    }
    if (id === "loc-ndg-somerled" && location.lifecycleStatus === "open") {
      note = { en: "Flagship kitchen · open", fr: "Cuisine phare · ouverte" };
    }

    return { status: current.status, place, note };
  });
}

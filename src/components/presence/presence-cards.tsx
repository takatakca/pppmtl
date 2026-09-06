import { ArrowUpRight } from "lucide-react";
import { PlatformMark } from "@/components/presence/platform-mark";
import { platformMeta } from "@/config/platforms";
import { presenceLocationLabel, type PresenceRecord } from "@/config/presence-directory";
import { usePPP } from "@/context/ppp-store";
import { trackExternalPresenceClick } from "@/lib/analytics";

function useRecordCopy(record: PresenceRecord) {
  const { lang } = usePPP();
  return {
    blurb: lang === "fr" ? record.blurbFr : record.blurbEn,
    place: presenceLocationLabel(record),
    name: platformMeta(record.iconKey)?.name ?? record.name,
  };
}

function useOutbound(record: PresenceRecord) {
  return () =>
    trackExternalPresenceClick({
      provider: record.iconKey,
      category: record.category,
      locationId: record.locationScope === "brand" ? null : record.locationScope,
    });
}

/**
 * Standard platform tile. Only ever rendered for a record that has a real
 * URL — a card with nowhere to go is not rendered at all.
 */
export function StandardPlatformCard({
  record,
  actionLabel,
  className = "",
}: {
  record: PresenceRecord;
  actionLabel: string;
  className?: string;
}) {
  const { blurb, place, name } = useRecordCopy(record);
  const onClick = useOutbound(record);
  if (!record.url) return null;

  return (
    <a
      href={record.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label={`${actionLabel} — ${name}`}
      className={`presence-card group flex h-full flex-col justify-between gap-4 border border-border bg-card p-5 focus-ppp ${className}`}
    >
      <div className="flex items-start gap-3">
        <PlatformMark platformId={record.iconKey} />
        <div className="min-w-0">
          <p className="truncate font-display text-xl uppercase leading-none">{name}</p>
          {place && (
            <p className="mt-1 text-[0.6rem] font-bold uppercase tracking-[0.25em] text-accent">
              {place}
            </p>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{blurb}</p>
      <span className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-widest text-foreground">
        {actionLabel}
        <ArrowUpRight className="presence-arrow h-3.5 w-3.5" />
      </span>
    </a>
  );
}

/**
 * Muted treatment for records belonging to a closed or superseded identity.
 * Deliberately not a warning colour — this is PPP's history, not an error.
 */
export function HistoricalPlatformCard({
  record,
  label,
  note,
  actionLabel,
}: {
  record: PresenceRecord;
  label: string;
  note: string;
  actionLabel: string;
}) {
  const { blurb, name } = useRecordCopy(record);
  const onClick = useOutbound(record);
  if (!record.url) return null;

  return (
    <a
      href={record.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label={`${actionLabel} — ${name}`}
      className="presence-card group flex h-full flex-col gap-3 border border-dashed border-border bg-background p-5 opacity-90 focus-ppp"
    >
      <div className="flex items-start gap-3">
        <PlatformMark platformId={record.iconKey} size="sm" className="opacity-70" />
        <div className="min-w-0">
          <p className="truncate font-display text-lg uppercase leading-none text-muted-foreground">
            {name}
          </p>
          <p className="mt-1 text-[0.55rem] font-bold uppercase tracking-[0.25em] text-muted-foreground/80">
            {label} · {note}
          </p>
        </div>
      </div>
      <p className="text-[0.8rem] text-muted-foreground">{blurb}</p>
      <span className="mt-auto flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
        {actionLabel}
        <ArrowUpRight className="presence-arrow h-3 w-3" />
      </span>
    </a>
  );
}

/** Small text row for the quick index at the bottom of the page. */
export function PresenceIndexLink({ record }: { record: PresenceRecord }) {
  const { name } = useRecordCopy(record);
  const onClick = useOutbound(record);
  if (!record.url) return null;

  return (
    <li>
      <a
        href={record.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="presence-card flex items-center gap-2 border border-border bg-card px-3 py-2.5 focus-ppp"
      >
        <PlatformMark platformId={record.iconKey} size="sm" />
        <span className="min-w-0 flex-1 truncate text-[0.7rem] font-bold uppercase tracking-widest">
          {name}
        </span>
        <ArrowUpRight className="presence-arrow h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </a>
    </li>
  );
}

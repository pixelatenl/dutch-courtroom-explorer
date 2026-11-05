import { formatPercent, type StatusChip } from "@/data/snapshot";
import { cn } from "@/lib/utils";

/*
  Derived status chip: the direction and both comparisons come from
  the StatusChip computed at render time from the snapshot series
  (short term: latest versus five years earlier; long term: latest
  versus the historical peak). Never hand-written.
*/
export function StatusChip({
  chip,
  invert = false,
  className,
}: {
  chip: StatusChip;
  /** Flip the good/bad colouring when a rise is the bad news (crime). */
  invert?: boolean;
  className?: string;
}) {
  const good =
    chip.direction === "unknown"
      ? null
      : invert
        ? chip.direction === "down"
        : chip.direction === "up";
  const arrow =
    chip.direction === "up" ? "▲" : chip.direction === "down" ? "▼" : "■";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium tabular-nums",
        good === true && "text-brand-accent",
        good === false && "text-foreground",
        className,
      )}
    >
      <span aria-hidden="true">{arrow}</span>
      <span>
        {formatPercent(chip.shortTermChange, 0)} in five years,{" "}
        {formatPercent(chip.belowPeakPct, 0)} below the peak
      </span>
    </span>
  );
}

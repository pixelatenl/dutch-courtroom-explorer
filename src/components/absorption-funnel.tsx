import { FamilySection } from "@/components/family-section";
import {
  funnel,
  formatNumber,
} from "@/data/snapshot";

/*
  The absorption funnel: of every 100 registered crimes in the latest
  justice year, how many end in a suspect registration, a summons, a
  conviction, and a prison term. The graphic is persistent: four bars
  whose widths are the per-100 values computed from the snapshot, each
  with its denominator sentence underneath.
*/
const STAGES = [
  {
    key: "suspect",
    label: "Suspect registration",
    sentence: (v: number | null) =>
      `Of every 100 registered crimes, ${formatNumber(v)} end with a registered suspect.`,
    token: "var(--funnel-1)",
  },
  {
    key: "summons",
    label: "Summons",
    sentence: (v: number | null) =>
      `Of every 100 registered crimes, ${formatNumber(v)} end in a summons to court.`,
    token: "var(--funnel-2)",
  },
  {
    key: "conviction",
    label: "Conviction",
    sentence: (v: number | null) =>
      `Of every 100 registered crimes, ${formatNumber(v)} end in a conviction.`,
    token: "var(--funnel-3)",
  },
  {
    key: "prison",
    label: "Prison term",
    sentence: (v: number | null) =>
      `Of every 100 registered crimes, ${formatNumber(v)} end in a prison term.`,
    token: "var(--funnel-4)",
  },
] as const;

export function AbsorptionFunnel() {
  const max = Math.max(
    100,
    ...STAGES.map((s) => funnel[s.key as keyof typeof funnel] as number | null ?? 0),
  );
  return (
    <FamilySection
      title="The absorption funnel"
      description={
        <>
          What happens to registered crimes in {funnel.year}, per 100 crimes.
          The denominator is the {formatNumber(funnel.per100Crimes)}{" "}
          registered crimes of that year; every stage below divides by it.
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {STAGES.map((s) => {
          const value =
            funnel[s.key as keyof typeof funnel] as number | null;
          const widthPct = value === null ? 0 : (value / max) * 100;
          return (
            <div key={s.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {value === null ? (
                    "suppressed by CBS"
                  ) : (
                    <>
                      <span className="text-lg font-semibold text-foreground tabular-nums">
                        {formatNumber(value)}
                      </span>{" "}
                      per 100 crimes
                    </>
                  )}
                </p>
              </div>
              <div
                className="h-8 w-full rounded-md bg-(--chart-track)"
                role="img"
                aria-label={`${s.label}: ${value === null ? "suppressed" : `${formatNumber(value)} per 100 registered crimes in ${funnel.year}`}`}
              >
                {value !== null && (
                  <div
                    className="chart-tooltip-trigger h-full rounded-md transition-colors hover:opacity-80"
                    style={{
                      width: `${widthPct}%`,
                      background: s.token,
                    }}
                  >
                    <span className="sr-only">{s.sentence(value)}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {value === null ? (
                  <>Suppressed by CBS ("."), rendered as a gap, never as zero.</>
                ) : (
                  s.sentence(value)
                )}
              </p>
            </div>
          );
        })}
      </div>
    </FamilySection>
  );
}

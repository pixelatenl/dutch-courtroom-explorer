import { FamilySection } from "@/components/family-section";
import { snapshot, formatNumber } from "@/data/snapshot";

/*
  Who is in the dock: horizontal composition bars of suspects by
  offence category in the latest suspects year, values printed inline,
  brand-accent hover. Offence tokens come from the justice palette.
*/
const TOKEN: Record<string, string> = {
  property: "var(--offence-property)",
  shoplifting: "var(--offence-shoplifting)",
  violence: "var(--offence-violence)",
  traffic: "var(--offence-traffic)",
  dui: "var(--offence-dui)",
  drugs: "var(--offence-drugs)",
};

export function DockChart() {
  const rows = [...snapshot.suspects.byOffence].sort(
    (a, b) => (b.count ?? -1) - (a.count ?? -1),
  );
  const max = Math.max(1, ...rows.map((r) => r.count ?? 0));
  const total = rows.reduce((sum, r) => sum + (r.count ?? 0), 0);
  return (
    <FamilySection
      title="Who is in the dock"
      description={
        <>
          Suspects by offence category, {snapshot.suspects.year}. A suspect
          can appear under several categories, so the bars do not sum to the
          total of {formatNumber(
            snapshot.suspects.byAge.find((r) => r.key === "10000")?.count,
          )}{" "}
          registered suspects. Traffic and driving under influence dominate;
          violence and shoplifting follow.
        </>
      }
    >
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{r.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {r.count === null ? (
                  <span title="Suppressed by CBS (.)">n/a, suppressed</span>
                ) : (
                  <>
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatNumber(r.count)}
                    </span>{" "}
                    suspects
                  </>
                )}
              </span>
            </div>
            <div
              className="h-6 w-full rounded-md bg-(--chart-track)"
              role="img"
              aria-label={`${r.label}: ${r.count === null ? "suppressed" : `${formatNumber(r.count)} suspects in ${snapshot.suspects.year}`}`}
            >
              {r.count !== null && (
                <div
                  className="chart-tooltip-trigger h-full rounded-md transition-colors hover:bg-(--brand-accent)"
                  style={{
                    width: `${(r.count / max) * 100}%`,
                    background: TOKEN[r.key] ?? "var(--chart-1)",
                  }}
                >
                  <span className="sr-only">
                    {r.label}: {formatNumber(r.count)} suspects,{" "}
                    {total > 0 ? `${((r.count / total) * 100).toFixed(1)}% of the categories shown` : ""}
                  </span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        CBS StatLine table 81947NED, verdachten van misdrijven by category,
        {snapshot.suspects.year}. Suppressed cells render as gaps with a
        note, never as zero.
      </p>
    </FamilySection>
  );
}

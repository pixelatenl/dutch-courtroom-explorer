import { FamilySection } from "@/components/family-section";
import { AiInsight } from "@/components/ai-insight";
import {
  ChartTooltip,
  ChartTooltipContainer,
  type TooltipContent,
  type TooltipRow,
} from "@/components/chart-tooltip";
import {
  snapshot,
  offenceBreakdown,
  formatNumber,
  formatPercent,
  formatCell,
  type OffenceRow,
} from "@/data/snapshot";

/*
  Who is in the dock: horizontal composition bars of suspects by
  offence category in the latest suspects year, values printed inline,
  brand-accent hover. Offence tokens come from the justice palette.
  Each bar carries the shared chart tooltip with the category's
  subcategory breakdown from the same CBS totals row; suppressed
  children render as "n/a, suppressed", and the group remainder is
  computed at render time and labeled derived.
*/
const TOKEN: Record<string, string> = {
  property: "var(--offence-property)",
  shoplifting: "var(--offence-shoplifting)",
  violence: "var(--offence-violence)",
  traffic: "var(--offence-traffic)",
  dui: "var(--offence-dui)",
  drugs: "var(--offence-drugs)",
  sexualOffences: "var(--offence-sexual)",
};

/** Tooltip payload for one offence bar, derived from the snapshot. */
function offenceTooltip(row: OffenceRow, shareOfShown: number | null): TooltipContent {
  const year = snapshot.suspects.year;
  const breakdown = offenceBreakdown(row);
  const rows: TooltipRow[] = [
    { label: "Suspects", value: formatCell(row.count, formatNumber) },
    {
      label: "Share of the categories shown",
      value: formatCell(shareOfShown, (v) => formatPercent(v, 1)),
    },
    ...breakdown.rows.map(({ child, shareOfGroup }) => ({
      label: child.label,
      value: `${formatCell(child.count, formatNumber)} (${formatCell(
        shareOfGroup,
        (v) => formatPercent(v, 1),
      )} of ${row.label})`,
    })),
  ];
  if (breakdown.remainder !== null && breakdown.remainder >= 0 && breakdown.rows.length > 0) {
    rows.push({
      label: "Remainder of the group (derived)",
      value: formatNumber(breakdown.remainder),
    });
  }
  return {
    title: `${row.label}, ${year}`,
    rows,
    footnote: row.childIncludedIn
      ? `${row.label} is a subcategory of ${row.childIncludedIn.label}: it is already counted in that total, and is shown here as its own bar.`
      : undefined,
  };
}

export function DockChart() {
  const rows = [...snapshot.suspects.byOffence].sort(
    (a, b) => (b.count ?? -1) - (a.count ?? -1),
  );
  const max = Math.max(1, ...rows.map((r) => r.count ?? 0));
  const total = rows.reduce((sum, r) => sum + (r.count ?? 0), 0);
  const top = rows.find((r) => r.count !== null);
  const year = snapshot.suspects.year;
  const insights = snapshot.narration?.visuals;
  return (
    <FamilySection
      title="Who is in the dock"
      description={
        <>
          Suspects by offence category, {year}. A suspect can appear under
          several categories, so the bars do not sum to the total of{" "}
          {formatNumber(
            snapshot.suspects.byAge.find((r) => r.key === "10000")?.count,
          )}{" "}
          registered suspects.
          {top && (
            <>
              {" "}
              {top.label} is the largest category with{" "}
              {formatNumber(top.count)} suspects; the bars are ranked by size,
              and each bar's tooltip breaks the group down into its CBS
              subcategories.
            </>
          )}
        </>
      }
    >
      <ChartTooltipContainer className="flex flex-col gap-4">
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const shareOfShown =
              r.count !== null && total > 0 ? r.count / total : null;
            return (
              <li key={r.key} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{r.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {r.count === null ? (
                      <ChartTooltip
                        content={{
                          title: `${r.label}, ${year}`,
                          rows: [{ label: "Suspects", value: "n/a, suppressed" }],
                          footnote: "Suppressed by CBS (.).",
                        }}
                      >
                        <span>n/a, suppressed</span>
                      </ChartTooltip>
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
                  aria-label={`${r.label}: ${r.count === null ? "suppressed" : `${formatNumber(r.count)} suspects in ${year}`}`}
                >
                  {r.count !== null && (
                    <ChartTooltip
                      content={offenceTooltip(r, shareOfShown)}
                      className="block h-full rounded-md transition-colors hover:bg-(--brand-accent)"
                      style={{
                        width: `${(r.count / max) * 100}%`,
                        background: TOKEN[r.key] ?? "var(--chart-1)",
                      }}
                    >
                      <span className="sr-only">
                        {r.label}: {formatNumber(r.count)} suspects,{" "}
                        {shareOfShown !== null
                          ? `${(shareOfShown * 100).toFixed(1)}% of the categories shown`
                          : ""}
                      </span>
                    </ChartTooltip>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted-foreground">
          CBS StatLine table 81947NED, verdachten van misdrijven by category,
          {year}. Suppressed cells render as gaps with a note, never as zero.
          Hover or focus a bar for the subcategory breakdown inside each
          group.
        </p>
      </ChartTooltipContainer>
      {insights?.dock && <AiInsight text={insights.dock} />}
    </FamilySection>
  );
}

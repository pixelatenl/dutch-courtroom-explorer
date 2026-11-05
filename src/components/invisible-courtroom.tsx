import { FamilySection } from "@/components/family-section";
import { linearScale } from "@/components/chart-utils";
import {
  justiceYears,
  firstJustice,
  latestJustice,
  formatNumber,
  formatPercent,
} from "@/data/snapshot";

/*
  The invisible courtroom: 100% stacked bars of prosecutor (Openbaar
  Ministerie) decisions per year, first to last justice year. The
  summons share, the decision that actually reaches a courtroom, is
  highlighted in the brand accent; the other categories use the
  family chart ramp.
*/
const CATEGORIES = [
  { key: "summons", label: "Summons", field: "summons" as const, chart: 1, accent: true },
  { key: "penaltyOrder", label: "Penalty order", field: "penaltyOrder" as const, chart: 1, accent: false },
  { key: "transaction", label: "Transaction", field: "transaction" as const, chart: 2, accent: false },
  { key: "summonsAfterObjection", label: "Summons after objection", field: "summonsAfterObjection" as const, chart: 3, accent: false },
  { key: "conditionalDismissal", label: "Conditional dismissal", field: "conditionalDismissal" as const, chart: 4, accent: false },
  { key: "unconditionalDismissal", label: "Unconditional dismissal", field: "unconditionalDismissal" as const, chart: 5, accent: false },
  { key: "otherOM", label: "Other", field: "otherOM" as const, chart: 2, accent: false },
] as const;

export function InvisibleCourtroom() {
  const W = 900;
  const H = 360;
  const M = { top: 16, right: 16, bottom: 44, left: 44 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const n = justiceYears.length;
  const band = iw / n;
  const barW = Math.max(1, band * 0.72);
  const x = linearScale(0, n - 1, M.left + band / 2, M.left + iw - band / 2);

  // Peak-year total for the y axis label of absolute counts.
  const totals = justiceYears.map((y) => y.omTotal ?? 0);
  const peakTotal = Math.max(...totals);

  return (
    <FamilySection
      title="The invisible courtroom"
      description={
        <>
          Decisions by the Openbaar Ministerie (the public prosecutor),{" "}
          {firstJustice.year} to {latestJustice.year}, as a share of all
          decisions that year. In {latestJustice.year} the prosecutor decided{" "}
          {formatNumber(latestJustice.omTotal)} cases, of which{" "}
          {formatNumber(latestJustice.summons)} ended in a summons, the route
          into a courtroom: {formatPercent(
            (latestJustice.summons ?? 0) / (latestJustice.omTotal ?? 1),
            1,
          )}{" "}
          of all decisions.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Stacked share of prosecutor decisions from ${firstJustice.year} to ${latestJustice.year}. The summons share is highlighted.`}
          className="h-auto w-full"
        >
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line
                x1={M.left}
                x2={M.left + iw}
                y1={M.top + ih - (t / 100) * ih}
                y2={M.top + ih - (t / 100) * ih}
                stroke="var(--border)"
                strokeDasharray="2 4"
              />
              <text
                x={M.left - 8}
                y={M.top + ih - (t / 100) * ih + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--muted-foreground)"
                className="tabular-nums"
              >
                {t}%
              </text>
            </g>
          ))}
          {justiceYears.map((yr, i) => {
            const total = yr.omTotal ?? 0;
            let acc = 0;
            const segments = CATEGORIES.map((c) => {
              const v = (yr[c.field] ?? 0) / (total || 1);
              const seg = { ...c, y0: acc, y1: acc + v };
              acc += v;
              return seg;
            });
            return (
              <g key={yr.year}>
                {segments.map((s) => (
                  <rect
                    key={s.key}
                    className="chart-tooltip-trigger"
                    x={x(i) - barW / 2}
                    y={M.top + ih - s.y1 * ih}
                    width={barW}
                    height={Math.max(0, (s.y1 - s.y0) * ih)}
                    fill={
                      s.accent ? "var(--brand-accent)" : `var(--chart-${s.chart})`
                    }
                  >
                    <title>{`${yr.year}, ${s.label}: ${formatPercent(s.y1 - s.y0, 1)} of decisions (${formatNumber(yr[s.field])})`}</title>
                  </rect>
                ))}
              </g>
            );
          })}
          {[0, Math.floor(n / 2), n - 1].map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 24}
              textAnchor="middle"
              fontSize="11"
              fill="var(--muted-foreground)"
              className="tabular-nums"
            >
              {justiceYears[i].year}
            </text>
          ))}
          <text
            x={M.left + iw / 2}
            y={H - 6}
            textAnchor="middle"
            fontSize="11"
            fill="var(--muted-foreground)"
          >
            Peak year {justiceYears[totals.indexOf(peakTotal)].year}:{" "}
            {formatNumber(peakTotal)} decisions in total
          </text>
        </svg>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {CATEGORIES.map((c) => (
            <li key={c.key} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block size-2.5 rounded-full"
                style={{
                  background: c.accent
                    ? "var(--brand-accent)"
                    : `var(--chart-${c.chart})`,
                }}
              />
              {c.label}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Share of all prosecutor decisions per year, CBS StatLine table
          83944NED. The court verdicts themselves are a smaller subset:{" "}
          {formatNumber(latestJustice.verdictTotal)} verdicts in{" "}
          {latestJustice.year}.
        </p>
      </div>
    </FamilySection>
  );
}

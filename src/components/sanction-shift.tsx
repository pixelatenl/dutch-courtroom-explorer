import { FamilySection } from "@/components/family-section";
import { linearScale } from "@/components/chart-utils";
import {
  ChartTooltip,
  ChartTooltipContainer,
} from "@/components/chart-tooltip";
import {
  justiceYears,
  firstJustice,
  latestJustice,
  formatNumber,
  formatPercent,
  formatCell,
} from "@/data/snapshot";

/*
  The sanction shift: the share of principal sanctions (hoofdstraffen)
  that are prison, fines, or community service, stacked to 100% per
  year from the first to the last justice year.
*/
/* Each sanction type maps 1:1 onto its own stack palette token. */
const SERIES = [
  { key: "prison", label: "Prison", field: "prison" as const, token: "var(--stack-1)" },
  { key: "fine", label: "Fine", field: "fine" as const, token: "var(--stack-2)" },
  { key: "communityService", label: "Community service", field: "communityService" as const, token: "var(--stack-3)" },
  { key: "otherPrincipal", label: "Other principal sanctions", field: "otherPrincipal" as const, token: "var(--stack-4)" },
] as const;

export function SanctionShift() {
  const W = 900;
  const H = 340;
  const M = { top: 16, right: 16, bottom: 44, left: 44 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const n = justiceYears.length;
  const band = iw / n;
  const barW = Math.max(1, band * 0.72);
  const x = linearScale(0, n - 1, M.left + band / 2, M.left + iw - band / 2);

  const last = latestJustice;
  const total = last.sanctionsTotal ?? 1;

  return (
    <FamilySection
      title="The sanction shift"
      description={
        <>
          Principal sanctions imposed by Dutch courts, {firstJustice.year} to{" "}
          {last.year}, as a share of all sanctions. In {last.year}:{" "}
          {formatNumber(last.prison)} prison terms (
          {formatPercent((last.prison ?? 0) / total, 1)}),{" "}
          {formatNumber(last.fine)} fines (
          {formatPercent((last.fine ?? 0) / total, 1)}),{" "}
          {formatNumber(last.communityService)} community service orders (
          {formatPercent((last.communityService ?? 0) / total, 1)}).
        </>
      }
    >
      <ChartTooltipContainer className="flex flex-col gap-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Stacked share of principal sanctions from ${firstJustice.year} to ${last.year}: prison, fines, community service and other.`}
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
            const t = yr.sanctionsTotal ?? 0;
            let acc = 0;
            return (
              <g key={yr.year}>
                {SERIES.map((s) => {
                  const count = yr[s.field];
                  const share = count !== null && t > 0 ? count / t : null;
                  const y0 = acc;
                  acc += (count ?? 0) / (t || 1);
                  return (
                    <ChartTooltip
                      svg
                      key={s.key}
                      content={{
                        title: `${yr.year}: ${s.label}`,
                        rows: [
                          {
                            label: "Share of sanctions",
                            value: formatCell(share, (v) => formatPercent(v, 1)),
                          },
                          {
                            label: "Sanctions",
                            value: formatCell(count, formatNumber),
                          },
                          {
                            label: "Total sanctions that year",
                            value: formatCell(yr.sanctionsTotal, formatNumber),
                          },
                        ],
                      }}
                    >
                      <rect
                        x={x(i) - barW / 2}
                        y={M.top + ih - acc * ih}
                        width={barW}
                        height={Math.max(0, ((count ?? 0) / (t || 1)) * ih)}
                        fill={s.token}
                      />
                    </ChartTooltip>
                  );
                })}
              </g>
            );
          })}
          {[0, Math.floor(n / 2), n - 1].map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--muted-foreground)"
              className="tabular-nums"
            >
              {justiceYears[i].year}
            </text>
          ))}
        </svg>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {SERIES.map((s) => (
            <li key={s.key} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block size-2.5 rounded-full"
                style={{ background: s.token }}
              />
              {s.label}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Share of all imposed sanctions per year, CBS StatLine table 83944NED
          (opgelegde sancties, hoofdstraffen).
        </p>
      </ChartTooltipContainer>
    </FamilySection>
  );
}

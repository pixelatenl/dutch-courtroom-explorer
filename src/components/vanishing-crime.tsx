import { FamilySection } from "@/components/family-section";
import { StatusChip } from "@/components/status-chip";
import { areaPath, linearScale, linePath, niceTicks } from "@/components/chart-utils";
import {
  snapshot,
  crimeYears,
  crimeRateSeries,
  propertyRateSeries,
  trafficRateSeries,
  violenceRateSeries,
  statusChip,
  formatRate,
  formatNumber,
} from "@/data/snapshot";

/*
  The vanishing crime: the 78-year registered-crime series (per 1,000
  inhabitants) as an SVG area chart, with the derived status chip and
  one chip per category (property, traffic, violence). All chips are
  computed at render time from the snapshot series.
*/
export function VanishingCrime() {
  const first = crimeYears[0];
  const last = crimeYears[crimeYears.length - 1];
  const totalChip = statusChip(crimeRateSeries);
  const chips = [
    { label: "Property crime", series: propertyRateSeries },
    { label: "Traffic crime", series: trafficRateSeries },
    { label: "Violence", series: violenceRateSeries },
  ];

  const W = 900;
  const H = 320;
  const M = { top: 16, right: 16, bottom: 32, left: 44 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const values = crimeRateSeries
    .map((p) => p.value)
    .filter((v): v is number => v !== null);
  const max = Math.max(...values);
  const x = linearScale(first.year, last.year, M.left, M.left + iw);
  const y = linearScale(0, max * 1.05, M.top + ih, M.top);
  const points = crimeRateSeries.map((p) => ({
    x: x(p.year),
    y: p.value === null ? null : y(p.value),
  }));
  const ticks = niceTicks(0, max, 4);

  return (
    <FamilySection
      title="The vanishing crime"
      description={
        <>
          Registered crimes per 1,000 inhabitants, {first.year} to {last.year}
          . In {last.year} the police registered {formatNumber(last.total)}{" "}
          crimes, {formatRate(last.totalPer1000, 0)} per 1,000 inhabitants.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip chip={totalChip} invert />
          {chips.map((c) => (
            <span key={c.label} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              {c.label}
              <StatusChip chip={statusChip(c.series)} invert />
            </span>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Area chart of registered crimes per 1,000 inhabitants from ${first.year} to ${last.year}, falling from ${formatRate(crimeRateSeries[0].value, 1)} to ${formatRate(last.totalPer1000, 1)} per 1,000.`}
          className="h-auto w-full"
        >
          <defs>
            <linearGradient id="crime-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--chart-1-base)" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={M.left}
                x2={M.left + iw}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--border)"
                strokeDasharray="2 4"
              />
              <text
                x={M.left - 8}
                y={y(t) + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--muted-foreground)"
                className="tabular-nums"
              >
                {t}
              </text>
            </g>
          ))}
          <line
            x1={M.left}
            x2={M.left + iw}
            y1={M.top + ih}
            y2={M.top + ih}
            stroke="var(--border)"
          />
          {[first.year, Math.round((first.year + last.year) / 2), last.year].map(
            (yr) => (
              <text
                key={yr}
                x={x(yr)}
                y={H - 8}
                textAnchor="middle"
                fontSize="11"
                fill="var(--muted-foreground)"
                className="tabular-nums"
              >
                {yr}
              </text>
            ),
          )}
          <path d={areaPath(points, M.top + ih)} fill="url(#crime-area)" />
          <path
            d={linePath(points)}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth="2"
          />
          {points.map(
            (p, i) =>
              p.y !== null &&
              crimeRateSeries[i].year % 10 === 0 && (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="3"
                  fill="var(--chart-1)"
                  stroke="var(--card)"
                  strokeWidth="1.5"
                >
                  <title>{`${crimeRateSeries[i].year}: ${formatRate(crimeRateSeries[i].value, 1)} per 1,000`}</title>
                </circle>
              ),
          )}
        </svg>
        <p className="text-sm text-muted-foreground">
          Per 1,000 inhabitants, CBS StatLine table{" "}
          {snapshotTable("83723NED")}. Suppressed years render as gaps.
        </p>
      </div>
    </FamilySection>
  );
}

function snapshotTable(id: string) {
  return snapshot.sources.cbs.tables[id]?.title ?? id;
}

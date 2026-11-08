import { FamilySection } from "@/components/family-section";
import { AiInsight } from "@/components/ai-insight";
import { areaPath, linearScale, linePath, niceTicks } from "@/components/chart-utils";
import {
  ChartTooltip,
  ChartTooltipContainer,
} from "@/components/chart-tooltip";
import {
  snapshot,
  clearanceSeries,
  crimeYears,
  formatPercent,
  formatRate,
  formatCell,
  latestCrime,
} from "@/data/snapshot";

/*
  The clearance paradox: two lines over the same 78 years, the crime
  rate (per 1,000 inhabitants, left axis) and the share of registered
  crimes solved (right axis, percent). The punchline sentence is
  derived at render time from the two series.
*/
export function ClearanceParadox() {
  const first = crimeYears[0];
  const last = crimeYears[crimeYears.length - 1];
  const insights = snapshot.narration?.visuals;

  const crimeValues = clearanceSeries
    .map((p) => p.crimeRate)
    .filter((v): v is number => v !== null);
  const clearanceValues = clearanceSeries
    .map((p) => p.clearanceRate)
    .filter((v): v is number => v !== null);
  const crimeMax = Math.max(...crimeValues);
  const clearanceMax = Math.max(...clearanceValues);

  const peakCrime = clearanceSeries.reduce((a, b) =>
    (b.crimeRate ?? 0) > (a.crimeRate ?? 0) ? b : a,
  );
  const peakClearance = clearanceSeries.reduce((a, b) =>
    (b.clearanceRate ?? 0) > (a.clearanceRate ?? 0) ? b : a,
  );
  const crimeDropFromPeak =
    peakCrime.crimeRate && last.totalPer1000
      ? (peakCrime.crimeRate - last.totalPer1000) / peakCrime.crimeRate
      : null;
  const clearanceDrop =
    peakClearance.clearanceRate !== null &&
    last.clearanceRate !== null &&
    peakClearance.clearanceRate !== 0
      ? (peakClearance.clearanceRate - last.clearanceRate / 100) /
        peakClearance.clearanceRate
      : null;

  const W = 900;
  const H = 340;
  const M = { top: 16, right: 48, bottom: 32, left: 44 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const x = linearScale(first.year, last.year, M.left, M.left + iw);
  const yCrime = linearScale(0, crimeMax * 1.05, M.top + ih, M.top);
  const yClear = linearScale(0, clearanceMax * 1.1, M.top + ih, M.top);
  const crimePoints = clearanceSeries.map((p) => ({
    x: x(p.year),
    y: p.crimeRate === null ? null : yCrime(p.crimeRate),
  }));
  const clearPoints = clearanceSeries.map((p) => ({
    x: x(p.year),
    y: p.clearanceRate === null ? null : yClear(p.clearanceRate),
  }));
  const crimeTicks = niceTicks(0, crimeMax, 4);
  const clearTicks = niceTicks(0, clearanceMax, 4);

  return (
    <FamilySection
      title="The clearance paradox"
      description={
        <>
          Registered crime per 1,000 inhabitants (left axis) versus the
          share of registered crimes that were solved (right axis),{" "}
          {first.year} to {last.year}.{" "}
          {crimeDropFromPeak !== null && clearanceDrop !== null ? (
            <>
              Crime is down {formatPercent(crimeDropFromPeak, 0)} from its{" "}
              {peakCrime.year} peak of {formatRate(peakCrime.crimeRate, 1)} per
              1,000, yet the solved share fell from{" "}
              {formatPercent(peakClearance.clearanceRate, 0)} in{" "}
              {peakClearance.year} to {formatPercent(latestCrime.clearanceRate !== null ? latestCrime.clearanceRate / 100 : null, 0)} in{" "}
              {last.year}.
            </>
          ) : (
            <>Crime and clearance move on separate axes; the lines tell the story.</>
          )}
        </>
      }
    >
      <ChartTooltipContainer className="flex flex-col gap-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Two lines from ${first.year} to ${last.year}: crimes per 1,000 inhabitants falling, and the solved share of registered crimes falling as well.`}
          className="h-auto w-full"
        >
          <defs>
            <linearGradient id="clearance-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-accent)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--brand-accent)" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          {crimeTicks.map((t) => (
            <g key={`c${t}`}>
              <line x1={M.left} x2={M.left + iw} y1={yCrime(t)} y2={yCrime(t)} stroke="var(--border)" strokeDasharray="2 4" />
              <text x={M.left - 8} y={yCrime(t) + 4} textAnchor="end" fontSize="11" fill="var(--chart-1)" className="tabular-nums">{t}</text>
            </g>
          ))}
          {clearTicks.map((t) => (
            <text
              key={`r${t}`}
              x={M.left + iw + 8}
              y={yClear(t) + 4}
              textAnchor="start"
              fontSize="11"
              fill="var(--brand-accent)"
              className="tabular-nums"
            >
              {formatPercent(t, 0)}
            </text>
          ))}
          <line x1={M.left} x2={M.left + iw} y1={M.top + ih} y2={M.top + ih} stroke="var(--border)" />
          {[first.year, Math.round((first.year + last.year) / 2), last.year].map((yr) => (
            <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)" className="tabular-nums">
              {yr}
            </text>
          ))}
          <path d={areaPath(clearPoints, M.top + ih)} fill="url(#clearance-area)" />
          <path d={linePath(crimePoints)} fill="none" stroke="var(--chart-1)" strokeWidth="2.5" />
          <path d={linePath(clearPoints)} fill="none" stroke="var(--brand-accent)" strokeWidth="2.5" strokeDasharray="6 3" />
          {crimePoints.map(
            (p, i) =>
              p.y !== null &&
              clearanceSeries[i].year % 10 === 0 && (
                <circle key={`c${i}`} cx={p.x} cy={p.y} r="3" fill="var(--chart-1)" stroke="var(--card)" strokeWidth="1.5" />
              ),
          )}
          {clearPoints.map(
            (p, i) =>
              p.y !== null &&
              clearanceSeries[i].year % 10 === 0 && (
                <rect key={`r${i}`} x={p.x - 3} y={p.y - 3} width="6" height="6" fill="var(--brand-accent)" stroke="var(--card)" strokeWidth="1.5" transform={`rotate(45 ${p.x} ${p.y})`} />
              ),
          )}
          {/* One invisible full-height band per year: every year is
              hoverable and focusable, not only the decade markers. */}
          {clearanceSeries.map((s) => {
            const bandW = iw / (last.year - first.year);
            const bx = Math.max(M.left, x(s.year) - bandW / 2);
            const bw = Math.min(bandW, M.left + iw - bx);
            return (
              <ChartTooltip
                svg
                key={s.year}
                crosshair={{
                  markers: [
                    ...(s.crimeRate !== null
                      ? [{ y: yCrime(s.crimeRate), fill: "var(--chart-1)" }]
                      : []),
                    ...(s.clearanceRate !== null
                      ? [{ y: yClear(s.clearanceRate), fill: "var(--brand-accent)" }]
                      : []),
                  ],
                }}
                content={{
                  title: `${s.year}`,
                  rows: [
                    {
                      label: "Crimes per 1,000 inhabitants",
                      value: formatCell(s.crimeRate, (v) => formatRate(v, 1)),
                    },
                    {
                      label: "Solved share",
                      value: formatCell(s.clearanceRate, (v) =>
                        formatPercent(v, 1),
                      ),
                    },
                  ],
                }}
              >
                <rect
                  x={bx}
                  y={M.top}
                  width={bw}
                  height={ih}
                  fill="transparent"
                />
              </ChartTooltip>
            );
          })}
        </svg>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-0.5 w-4 bg-(--chart-1)" />
            Registered crimes per 1,000 inhabitants (left axis)
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-0.5 w-4 bg-(--brand-accent) [stroke-dasharray:6_3]" style={{ backgroundImage: "linear-gradient(90deg, var(--brand-accent) 60%, transparent 60%)", backgroundSize: "8px 2px", backgroundRepeat: "repeat-x" }} />
            Share of registered crimes solved (right axis)
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          CBS StatLine table 83723NED: misdrijven per 1,000 inwoners and
          opgehelderde misdrijven relatief. Suppressed years render as gaps.
        </p>
      </ChartTooltipContainer>
      {insights?.clearance && <AiInsight text={insights.clearance} />}
    </FamilySection>
  );
}

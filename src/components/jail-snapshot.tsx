import { FamilySection } from "@/components/family-section";
import { linearScale } from "@/components/chart-utils";
import {
  snapshot,
  formatNumber,
  formatPercent,
  labelFor,
  SENTENCE_DURATION_LABELS,
  RESIDENCE_LABELS,
  STOCK_AGE_LABELS,
} from "@/data/snapshot";

/*
  The jail snapshot: the 30 September prison stock by sentence
  duration, 2005 to 2025, as stacked bars, with the residence-status
  and age composition of the latest year and the DJI cost band. The
  severity proxy (long-sentenced share up, short-sentenced share down)
  is derived at render time from the first and last year.
*/
const DURATION_KEYS = [
  "A048443",
  "A048442",
  "A048441",
  "A048440",
  "A048439",
  "A048444",
] as const;

const DURATION_CHART: Record<string, number> = {
  A048443: 4,
  A048442: 3,
  A048441: 2,
  A048440: 1,
  A048439: 5,
  A048444: 2,
};

export function JailSnapshot() {
  const stock = snapshot.prisonStock;
  const years = stock.years;
  const first = years[0];
  const last = years[years.length - 1];

  const share = (year: typeof first, key: string) => {
    const total = year["T001556"];
    const v = year[key];
    return total && typeof total === "number" && typeof v === "number" && total > 0
      ? v / total
      : null;
  };
  const longFirst = share(first, "A048443");
  const longLast = share(last, "A048443");
  const shortFirst = share(first, "A048439");
  const shortLast = share(last, "A048439");

  const W = 900;
  const H = 320;
  const M = { top: 16, right: 16, bottom: 32, left: 52 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const n = years.length;
  const band = iw / n;
  const barW = Math.max(1, band * 0.7);
  const x = linearScale(0, n - 1, M.left + band / 2, M.left + iw - band / 2);
  const totals = years.map((y) =>
    DURATION_KEYS.reduce(
      (sum, k) => sum + (typeof y[k] === "number" ? (y[k] as number) : 0),
      0,
    ),
  );
  const max = Math.max(...totals) * 1.05;
  const y = linearScale(0, max, M.top + ih, M.top);

  const costs = snapshot.costs;
  const stockTotal =
    stock.byResidenceStatus.find((r) => r.key === "T001557")?.count ?? null;

  return (
    <FamilySection
      title="The jail snapshot"
      description={
        <>
          Detainees in Dutch prisons on 30 September, by sentence duration,{" "}
          {first.year} to {last.year}.{" "}
          {longFirst !== null && longLast !== null && shortFirst !== null && shortLast !== null ? (
            <>
              The severity proxy moved: the share sentenced to 3 years or
              longer rose from {formatPercent(longFirst, 1)} in {first.year} to{" "}
              {formatPercent(longLast, 1)} in {last.year}, while the share
              sentenced to less than 1 month fell from{" "}
              {formatPercent(shortFirst, 1)} to {formatPercent(shortLast, 1)}.
            </>
          ) : (
            <>The stacked bars show the 30 September stock per year.</>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Stacked bars of detainees on 30 September by sentence duration, ${first.year} to ${last.year}.`}
          className="h-auto w-full"
        >
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={M.left} x2={M.left + iw} y1={y(max * t)} y2={y(max * t)} stroke="var(--border)" strokeDasharray="2 4" />
              <text x={M.left - 8} y={y(max * t) + 4} textAnchor="end" fontSize="11" fill="var(--muted-foreground)" className="tabular-nums">
                {formatNumber(Math.round(max * t))}
              </text>
            </g>
          ))}
          {years.map((yr, i) => {
            let acc = 0;
            return (
              <g key={yr.year}>
                {DURATION_KEYS.map((k) => {
                  const v = typeof yr[k] === "number" ? (yr[k] as number) : 0;
                  const y0 = acc;
                  acc += v;
                  return (
                    <rect
                      key={k}
                      className="chart-tooltip-trigger"
                      x={x(i) - barW / 2}
                      y={y(acc)}
                      width={barW}
                      height={Math.max(0, y(y0) - y(acc))}
                      fill={`var(--chart-${DURATION_CHART[k]})`}
                    >
                      <title>{`${yr.year}, ${labelFor(SENTENCE_DURATION_LABELS, k, k)}: ${formatNumber(v)}`}</title>
                    </rect>
                  );
                })}
              </g>
            );
          })}
          {[0, Math.floor(n / 2), n - 1].map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)" className="tabular-nums">
              {years[i].year}
            </text>
          ))}
        </svg>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {DURATION_KEYS.map((k) => (
            <li key={k} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block size-2.5 rounded-full" style={{ background: `var(--chart-${DURATION_CHART[k]})` }} />
              {labelFor(SENTENCE_DURATION_LABELS, k, k)}
            </li>
          ))}
        </ul>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">By residence status, {stock.year}</h3>
            <ul className="flex flex-col gap-1.5 text-sm">
              {stock.byResidenceStatus
                .filter((r) => r.key !== "T001557")
                .map((r) => {
                  const total = stock.byResidenceStatus.find((x) => x.key === "T001557")?.count;
                  const shareValue = r.count !== null && total ? r.count / total : null;
                  return (
                    <li key={r.key} className="flex items-baseline justify-between gap-3">
                      <span className="text-muted-foreground">{labelFor(RESIDENCE_LABELS, r.key, r.title)}</span>
                      <span className="tabular-nums">
                        {r.count === null ? "n/a, suppressed" : <>{formatNumber(r.count)} ({formatPercent(shareValue, 1)})</>}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">By age, {stock.year}</h3>
            <ul className="flex flex-col gap-1.5 text-sm">
              {stock.byAge
                .filter((r) => r.key !== "10000")
                .map((r) => {
                  const total = stock.byAge.find((x) => x.key === "10000")?.count;
                  const shareValue = r.count !== null && total ? r.count / total : null;
                  return (
                    <li key={r.key} className="flex items-baseline justify-between gap-3">
                      <span className="text-muted-foreground">{labelFor(STOCK_AGE_LABELS, r.key, r.title)}</span>
                      <span className="tabular-nums">
                        {r.count === null ? "n/a, suppressed" : <>{formatNumber(r.count)} ({formatPercent(shareValue, 1)})</>}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold">What a day inside costs</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            The DJI infographic puts the cost per detainee per day at{" "}
            <span className="font-semibold text-foreground tabular-nums">€{formatNumber(costs.costPerDetaineePerDayEur.regular)}</span>{" "}
            for the regular prison regime and{" "}
            <span className="font-semibold text-foreground tabular-nums">€{formatNumber(costs.costPerDetaineePerDayEur.ppc)}</span>{" "}
            for a PPC care place. Per year that is roughly{" "}
            <span className="font-semibold text-foreground tabular-nums">€{formatNumber(costs.costPerDetaineePerYearEur.regular)}</span>{" "}
            and{" "}
            <span className="font-semibold text-foreground tabular-nums">€{formatNumber(costs.costPerDetaineePerYearEur.ppc)}</span>{" "}
            (derived: per-day cost times 365).
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Source:{" "}
            <a
              href={costs.provenance.url}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {costs.provenance.source}, {costs.provenance.document}
            </a>{" "}
            ({costs.provenance.version}, data year {costs.provenance.dataYear}).
            Stock on 30 September {stock.year}: {formatNumber(stockTotal)}{" "}
            detainees, CBS StatLine table 85841NED.
          </p>
        </div>
      </div>
    </FamilySection>
  );
}

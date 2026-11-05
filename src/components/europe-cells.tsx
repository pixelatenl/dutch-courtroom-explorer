import { FamilySection } from "@/components/family-section";
import {
  snapshot,
  formatNumber,
  formatPercent,
  formatRate,
  nlOccupancy,
} from "@/data/snapshot";

/*
  Europe's empty cells: ranked bars of persons held in prison per
  100,000 inhabitants across Eurostat reporting countries, latest year,
  the Netherlands highlighted in the brand accent. The occupancy
  sentence and the Eurostat-versus-DJI source note are derived from
  the snapshot.
*/
export function EuropeCells() {
  const e = snapshot.europe;
  const rows = [...e.ratesPer100k].sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  const max = Math.max(1, ...rows.map((r) => r.rate ?? 0));
  const nl = e.netherlands;

  return (
    <FamilySection
      title="Europe's empty cells"
      description={
        <>
          Persons held in prison per 100,000 inhabitants, {e.year}, Eurostat
          reporting countries, ranked. The Netherlands sits at{" "}
          {formatRate(nl.ratePer100k, 1)} per 100,000, highlighted in the brand
          accent.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => {
            const isNL = r.country === "NL";
            return (
              <li key={r.country} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 truncate text-muted-foreground sm:w-48" title={r.label}>
                  {r.label}
                </span>
                <span
                  className="h-4 rounded-sm bg-(--chart-track)"
                  role="img"
                  aria-label={`${r.label}: ${formatRate(r.rate, 1)} persons held per 100,000 inhabitants in ${e.year}`}
                  style={{ flexGrow: 1, display: "flex" }}
                >
                  <span
                    className="chart-tooltip-trigger block h-full rounded-sm transition-colors hover:opacity-80"
                    style={{
                      width: `${((r.rate ?? 0) / max) * 100}%`,
                      background: isNL ? "var(--brand-accent)" : "var(--chart-2)",
                    }}
                  >
                    <span className="sr-only">
                      {r.label}: {formatRate(r.rate, 1)} per 100,000
                    </span>
                  </span>
                </span>
                <span
                  className={`w-16 shrink-0 text-right tabular-nums ${isNL ? "font-semibold text-brand-accent" : "text-muted-foreground"}`}
                >
                  {formatRate(r.rate, 1)}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground">
          In {nl.year} Eurostat counted{" "}
          <span className="font-semibold text-foreground tabular-nums">{formatNumber(nl.capacity)}</span>{" "}
          official prison places and{" "}
          <span className="font-semibold text-foreground tabular-nums">{formatNumber(nl.held)}</span>{" "}
          persons held in the Netherlands, an occupancy of{" "}
          <span className="font-semibold text-foreground tabular-nums">{formatPercent(nlOccupancy, 1)}</span>.
          Eurostat counts a wider detainee population than the DJI prison-system
          average: DJI reports an average usable capacity of{" "}
          {formatNumber(snapshot.costs.averageUsableCapacity.value)} places in{" "}
          {snapshot.costs.averageUsableCapacity.year} for the prison system
          itself.
        </p>
        <p className="text-sm text-muted-foreground">
          Source: Eurostat dataset{" "}
          <a
            href={e.provenance.page}
            className="underline underline-offset-4 hover:text-foreground"
          >
            crim_pris_cap
          </a>{" "}
          ({e.provenance.license}), {e.year}.
        </p>
      </div>
    </FamilySection>
  );
}

import { FamilySection } from "@/components/family-section";
import { StatCard } from "@/components/stat-card";
import {
  snapshot,
  formatNumber,
  formatRate,
  oneIn,
  latestHomicide,
  annualStockCost,
} from "@/data/snapshot";

/*
  The odds coda: three explicitly constructed probabilities and the
  cost punchline, Ferrari-coda tone. Every probability is built from a
  snapshot rate at render time; the cost figures are the DJI per-day
  figures and their derived per-year multiples.
*/
export function OddsCoda() {
  const s = snapshot;
  const suspectRate =
    s.suspects.byAge.find((r) => r.key === "10000")?.per10000 ?? null;
  const prisonRate = s.europe.netherlands.ratePer100k;
  const victimRate = latestHomicide.perMillion;

  const perDay = s.costs.costPerDetaineePerDayEur.regular;
  const perYear = s.costs.costPerDetaineePerYearEur.regular;
  const stockTotal =
    s.prisonStock.byLegalStatus.find((r) => r.key === "T001557")?.count ??
    null;

  return (
    <FamilySection
      title="The odds coda"
      description={
        <>
          Three chances, each constructed from a rate in the snapshot, and
          what a year inside costs. All figures derived; nothing here is a
          guess.
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={`Chance of being a registered suspect, ${s.suspects.year}`}
            value={oneIn(suspectRate, 10000)}
            sub={`per year: ${formatRate(suspectRate, 1)} suspects per 10,000 inhabitants (CBS ${s.suspects.year})`}
          />
          <StatCard
            label={`Chance of being held in prison, ${s.europe.year}`}
            value={oneIn(prisonRate, 100000)}
            sub={`on a given day: ${formatRate(prisonRate, 1)} persons held per 100,000 inhabitants (Eurostat ${s.europe.year})`}
          />
          <StatCard
            label={`Chance of being a murder or manslaughter victim, ${latestHomicide.year}`}
            value={oneIn(victimRate, 1000000)}
            sub={`per year: ${formatRate(victimRate, 1)} victims per million inhabitants, ${formatNumber(latestHomicide.victims)} victims in total (CBS ${latestHomicide.year})`}
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            And the bill: each year a person spends detained costs society
            roughly{" "}
            <span className="font-semibold text-brand-accent tabular-nums">
              €{formatNumber(perYear)}
            </span>{" "}
            in the regular regime (derived: €{formatNumber(perDay)} per day
            times 365; a PPC care place runs{" "}
            <span className="tabular-nums">€{formatNumber(s.costs.costPerDetaineePerYearEur.ppc)}</span>{" "}
            a year). Holding the{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatNumber(stockTotal)}
            </span>{" "}
            people who were in prison on 30 September {s.prisonStock.year}
            costs about{" "}
            <span className="font-semibold text-brand-accent tabular-nums">
              €{formatNumber(annualStockCost)}
            </span>{" "}
            a year (derived: stock times €{formatNumber(perDay)} times 365).
            Source for the per-day figures:{" "}
            <a
              href={s.costs.provenance.url}
              className="underline underline-offset-4 hover:text-foreground"
            >
              DJI, {s.costs.provenance.document}
            </a>{" "}
            ({s.costs.provenance.version}).
          </p>
        </div>
      </div>
    </FamilySection>
  );
}

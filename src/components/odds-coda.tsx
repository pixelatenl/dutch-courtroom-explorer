import {
  snapshot,
  formatNumber,
  formatPercent,
  oneIn,
  latestHomicide,
  annualStockCost,
} from "@/data/snapshot";

/*
  The odds coda: the family's closing-photo coda, the same composition as
  the Ferrari coda on fleet.pixelate.nl. Deliberately not a Card and no
  FamilySection: a full-bleed photo inside the page container, with the
  kicker, heading, copy, stat row and closing line stacked over a themed
  scrim. The photo and overlay layers are decorative and aria-hidden.

  Every figure is a snapshot value or a render-time derivation: the odds
  come from oneIn over the snapshot rates, the percentages from the same
  rates over the same denominators, the bill from the DJI per-day figure
  and the existing annualStockCost export (shown compact, "1.5 billion",
  so all five stat values share one size). The only numeric literals are
  the unit denominators of oneIn/formatPercent, the formatter digit
  arguments, and the calendar 365 in the derivation phrases. A suppressed
  (null) rate stays "n/a" everywhere, never zero.
*/
export function OddsCoda() {
  const s = snapshot;
  const suspectRate =
    s.suspects.byAge.find((r) => r.key === "10000")?.per10000 ?? null;
  const prisonRate = s.europe.netherlands.ratePer100k;
  const victimRate = latestHomicide.perMillion;

  const perDay = s.costs.costPerDetaineePerDayEur.regular;
  const perYear = s.costs.costPerDetaineePerYearEur.regular;
  const ppcPerYear = s.costs.costPerDetaineePerYearEur.ppc;
  const stockTotal =
    s.prisonStock.byLegalStatus.find((r) => r.key === "T001557")?.count ??
    null;

  /*
    The percentage of a "1 in N" odd: the same rate over the same
    denominator. The null check keeps a suppressed cell at "n/a" instead
    of letting null coerce to zero.
  */
  const percentOf = (rate: number | null, per: number, digits: number) =>
    formatPercent(rate === null ? null : rate / per, digits);
  const percentSuspect = percentOf(suspectRate, 10000, 2);
  const percentPrison = percentOf(prisonRate, 100000, 3);
  const percentVictim = percentOf(victimRate, 1000000, 5);

  /*
    Compact money form for the coda's big bill: the snapshot value in
    en-GB long compact notation ("1.5 billion"), so the punchline can
    share the stat row's font size; the exact figure stays in the copy
    above. Only the digit argument is a literal. Null stays n/a.
  */
  const formatCompactMoney = (value: number | null) =>
    value === null
      ? "n/a"
      : `€${new Intl.NumberFormat("en-GB", {
          notation: "compact",
          compactDisplay: "long",
          maximumFractionDigits: 1,
        }).format(value)}`;

  return (
    <section>
      <div className="relative flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-2xl sm:min-h-[34rem] lg:min-h-[70vh]">
        <div
          aria-hidden="true"
          className="odds-coda-photo absolute inset-0 bg-cover"
        />
        <div
          aria-hidden="true"
          className="odds-coda-overlay absolute inset-0"
        />
        <div className="relative flex flex-col gap-5 p-6 sm:gap-6 sm:p-10 lg:p-12">
          <p className="self-start rounded-full bg-primary px-3 py-1 text-sm font-medium tracking-wide text-primary-foreground uppercase">
            Not a chance calculation
          </p>
          <h2 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Three odds and <span className="text-brand-accent">a bill</span>
          </h2>
          <p className="max-w-3xl text-base leading-relaxed sm:text-lg">
            You made it to the end of a page about crime and punishment, so
            here is the traditional closing gimmick: three odds and a bill.
            In {s.suspects.year}, {oneIn(suspectRate, 10000)} of the
            population was registered as a suspect; on a given day in{" "}
            {s.europe.year}, {oneIn(prisonRate, 100000)} was inside; and in{" "}
            {latestHomicide.year}, {oneIn(victimRate, 1000000)} was a victim
            of murder or manslaughter. And to be clear: none of these are
            chance calculations, and none of them are about you. The
            registers behind them do not know who you are, where you live, or
            how you live; each figure is a population divided by a headcount.
            The bill, at least, is simple arithmetic: a year inside costs{" "}
            {`€${formatNumber(perYear)}`} per detainee in the regular regime
            (a PPC care place runs {`€${formatNumber(ppcPerYear)}`}), and
            holding everyone who was in prison on 30 September{" "}
            {s.prisonStock.year} for a year costs{" "}
            {`€${formatNumber(annualStockCost)}`}. Costs:{" "}
            <a
              href={s.costs.provenance.url}
              className="underline underline-offset-4 hover:text-foreground"
            >
              DJI, {s.costs.provenance.document}
            </a>{" "}
            ({s.costs.provenance.version}).
          </p>
          <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-14 lg:gap-y-0">
            <div>
              <p className="text-xl font-bold tabular-nums text-foreground md:text-2xl">
                {oneIn(suspectRate, 10000)}
              </p>
              <p className="mt-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Registered suspect
              </p>
              <p className="text-xs text-muted-foreground">
                {percentSuspect} of the population per year, {s.suspects.year}
              </p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums text-foreground md:text-2xl">
                {oneIn(prisonRate, 100000)}
              </p>
              <p className="mt-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Behind bars
              </p>
              <p className="text-xs text-muted-foreground">
                {percentPrison} on a given day, {s.europe.year}
              </p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums text-foreground md:text-2xl">
                {oneIn(victimRate, 1000000)}
              </p>
              <p className="mt-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Murder or manslaughter victim
              </p>
              <p className="text-xs text-muted-foreground">
                {percentVictim} of the population per year,{" "}
                {latestHomicide.year}
              </p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums text-brand-accent md:text-2xl">
                {`€${formatNumber(perYear)}`}
              </p>
              <p className="mt-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                One year inside
              </p>
              <p className="text-xs text-muted-foreground">
                derived: {`€${formatNumber(perDay)}`} per day, times 365
              </p>
            </div>
            <div className="col-span-2 lg:col-span-1">
              <p className="text-xl font-bold tabular-nums text-brand-accent md:text-2xl">
                {formatCompactMoney(annualStockCost)}
              </p>
              <p className="mt-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Everyone inside, one year
              </p>
              <p className="text-xs text-muted-foreground">
                derived: {formatNumber(stockTotal)} people on 30 September{" "}
                {s.prisonStock.year}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Who ends up in a Dutch courtroom? These are not the numbers that
            will tell you.
          </p>
        </div>
      </div>
    </section>
  );
}

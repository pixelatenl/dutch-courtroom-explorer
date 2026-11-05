import { Drawer } from "@/components/ui/drawer";
import { formatDate } from "@/lib/format-date";
import {
  snapshot,
  latestCrime,
  latestJustice,
  latestRecidivism,
} from "@/data/snapshot";

/*
  The Method and sources drawer, seated in the family footer's extra
  slot. A server component: the whole method list renders at build
  time into the drawer body, so it ships in the static HTML while the
  drawer is closed (hidden plus inert, still indexable).
*/
export function MethodDrawer() {
  const cbs = snapshot.sources.cbs;
  const eurostat = snapshot.sources.eurostat;
  const dji = snapshot.sources.dji;
  const edu = snapshot.educationIncome;

  const tableLinks = Object.entries(cbs.tables).map(([id, t]) => (
    <li key={id}>
      <a
        href={t.page}
        className="underline underline-offset-4 hover:text-foreground"
      >
        {id}
      </a>{" "}
      <span className="text-muted-foreground">({t.title})</span>
    </li>
  ));

  return (
    <Drawer
      label="Method and sources"
      title="Method and sources"
      description="Every figure on this page traces to the committed snapshot, which records its source, license and retrieval date for each value."
    >
      <div className="flex flex-col gap-5 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h3 className="font-semibold text-foreground">Sourcing rule</h3>
          <p className="mt-1">
            Every figure on this page is fetched by scripts/snapshot.mjs from
            the cited open data sources and stored with provenance (source
            name, table or dataset, license, retrieval date) in
            src/data/snapshot.json. Nothing statistical is hand-entered,
            except the DJI block, which is committed by hand in the script and
            labeled with its source, document, version and data year. Derived
            values (per-year costs, per-100 funnel stages, occupancy,
            probabilities) are computed at render time from snapshot fields
            and flagged as derived; derived status chips are computed from the
            snapshot series, never hand-written. Tooltips repeat figures
            already sourced and linked on the card; they introduce no new
            sources.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-foreground">Sources</h3>
          <ul className="mt-1 flex flex-col gap-1">
            <li>
              <a
                href={cbs.url}
                className="underline underline-offset-4 hover:text-foreground"
              >
                CBS StatLine
              </a>{" "}
              ({cbs.license}, retrieved {formatDate(cbs.retrievedAt)}), tables:
              <ul className="mt-1 flex flex-col gap-1 pl-4">{tableLinks}</ul>
              CBS publishes without an actuality guarantee; figures are the
              latest published at retrieval time.
            </li>
            <li>
              <a
                href={eurostat.page}
                className="underline underline-offset-4 hover:text-foreground"
              >
                Eurostat, dataset crim_pris_cap
              </a>{" "}
              ({eurostat.license}, retrieved {formatDate(eurostat.retrievedAt)}).
            </li>
            <li>
              <a
                href={dji.url}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {dji.source}, {dji.document}
              </a>{" "}
              ({dji.version}, data year {dji.dataYear}), manual block: cost per
              detainee per day and average usable capacity.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-foreground">Unit table</h3>
          <ul className="mt-1 flex flex-col gap-1">
            <li>Crimes: registered crimes (misdrijven), counts and per 1,000 inhabitants.</li>
            <li>Suspects: registrations of suspects (verdachten), counts and per 10,000 inhabitants.</li>
            <li>Cases: prosecutor decisions and court verdicts, counts.</li>
            <li>Sanctions: imposed sanctions, counts and shares.</li>
            <li>Detainees: persons in prison (stock on 30 September, or annual flow), counts.</li>
            <li>Victims: murder and manslaughter victims, counts and per 1,000,000 inhabitants.</li>
            <li>Eurostat: persons held and official capacity, counts and per 100,000 inhabitants.</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-foreground">Rates, counts and the population register</h3>
          <p className="mt-1">
            Suspect rates are per 10,000 within each group's own population,
            so a group rate is a weighted average of its subgroup rates,
            never their sum. CBS counts include suspects who are not in the
            municipal population register (GBA) while the rates do not, so
            counts and rates do not reconstruct each other exactly.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-foreground">Chip rule</h3>
          <p className="mt-1">
            A status chip compares the latest value of a series against the
            value five years earlier (short term) and against the historical
            peak of the series (long term). The arrow and the percentage in
            five years come from the short-term comparison; the below-peak
            percentage comes from the long-term one. Chips are computed at
            render time from the snapshot.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-foreground">Per-card year ceilings</h3>
          <ul className="mt-1 flex flex-col gap-1">
            <li>Registered crime series: through {latestCrime.year} (CBS 83723NED, {snapshot.crime.years.length} years).</li>
            <li>Suspects by age, sex, background, offence: {snapshot.suspects.year} (CBS 81947NED).</li>
            <li>Prosecutor decisions, verdicts, sanctions: {latestJustice.year} (CBS 83944NED, {snapshot.justice.years[0].year} to {latestJustice.year}).</li>
            <li>Recidivism split: {latestRecidivism?.year ?? "n/a"} (CBS 81997NED; later years are suppressed).</li>
            <li>Background and generation: {snapshot.backgroundGeneration.year} (CBS 81959NED).</li>
            <li>Education gradient: {edu.educationYear}, income gradient: {edu.incomeYear} (CBS 85658NED; the newest year's breakdowns are suppressed).</li>
            <li>Detainee characteristics: {snapshot.detainees.year} (CBS 85836NED).</li>
            <li>30 September stock: through {snapshot.prisonStock.years[snapshot.prisonStock.years.length - 1].year} (CBS 85841NED).</li>
            <li>Murder and manslaughter victims: through {snapshot.homicide.years[snapshot.homicide.years.length - 1].year} (CBS 84726NED).</li>
            <li>Eurostat prison capacity and persons held: {snapshot.europe.year} (crim_pris_cap).</li>
            <li>DJI costs and capacity: data year {dji.dataYear}, {dji.version}.</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-foreground">Suppression rendering rule</h3>
          <p className="mt-1">
            CBS suppresses some cells (shown as "." in StatLine). The snapshot
            stores them as null, and the page renders them as gaps with an
            "n/a, suppressed" note, never as zero.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-foreground">Age-structure caveat</h3>
          <p className="mt-1">
            Age-specific suspect rates are CBS's own rates per 10,000
            inhabitants of that age group. The youngest band (12 to 18 years)
            spans only six years of age, so its rate moves more sharply than
            the underlying counts; read it as a peak shape, not a precise
            level.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-foreground">Colour audit</h3>
          <p className="mt-1">
            The justice categorical tokens (four funnel stages, seven offence
            categories, seven stacked-segment tokens) are defined per theme in
            app/globals.css. Every token clears 3 to 1 against both surfaces
            of its theme (page and card, light and dark), and every adjacent
            pair of tokens clears 3 to 1 against each other; the full ratio
            table is documented in the stylesheet comment. The offence group
            (--offence-*, seven dock bars) audits at 13.0-13.6 and 3.8-4.0
            against the light page (13.7-14.4 and 4.0-4.2 against the light
            card) with neighbours 3.28-3.58, and at 11.4-11.8 and 3.6-3.7
            against the dark page (9.6-10.0 and 3.0-3.1 against the dark
            card) with neighbours 3.18-3.26; the newest token,
            --offence-sexual (light #510c30, dark #fceff6), clears 13.2/13.9
            in light and 11.8/10.0 in dark against page/card and 3.48/3.23
            against its dock neighbour (drugs). The stacked-segment
            group (--stack-1..7) audits at 13.5-13.6 and 4.1-4.4 against the
            light page (14.2-14.3 and 4.3-4.4 against the light card) with
            neighbours 3.26-3.30, and at 12.0-12.1 and 3.7 against the dark
            page (10.2 and 3.1-3.2 against the dark card) with neighbours
            3.22-3.24. Hover and focus highlights use the family brand
            accent.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-foreground">Snapshot</h3>
          <p className="mt-1">
            Data received on {formatDate(snapshot.retrievedAt)}. The snapshot
            refreshes monthly (the sources publish annually) via the
            snapshot workflow, which commits src/data/snapshot.json to main.
          </p>
        </section>
      </div>
    </Drawer>
  );
}

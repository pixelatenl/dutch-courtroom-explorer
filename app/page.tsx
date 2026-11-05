import { FamilyHero } from "@/components/family-hero";
import { StatCard } from "@/components/stat-card";
import { VanishingCrime } from "@/components/vanishing-crime";
import { DockChart } from "@/components/dock-chart";
import { InvisibleCourtroom } from "@/components/invisible-courtroom";
import { AbsorptionFunnel } from "@/components/absorption-funnel";
import { SanctionShift } from "@/components/sanction-shift";
import { ClearanceParadox } from "@/components/clearance-paradox";
import { CorrelationCards } from "@/components/correlation-cards";
import { JailSnapshot } from "@/components/jail-snapshot";
import { EuropeCells } from "@/components/europe-cells";
import { OddsCoda } from "@/components/odds-coda";
import { FAMILY } from "@/lib/family";
import {
  snapshot,
  heroStages,
  formatNumber,
} from "@/data/snapshot";

/*
  The single page. Card order per the research brief. Every figure is
  computed from the snapshot at render time; the only literals here
  are copy. The hero stat cards each carry their own source year.
*/
export default function Home() {
  const crimes = heroStages[0];
  const suspects = heroStages[1];
  const verdicts = heroStages[2];
  const prison = heroStages[3];

  return (
    <>
      <div className="mx-auto max-w-[1536px] px-4 py-10 sm:px-6 sm:py-16">
        <section className="mb-12">
          <FamilyHero
            kicker="Dutch open data"
            title={
              <>
                Who ends up in a <span className="text-brand-accent">Dutch courtroom</span>, and what happens to them?
              </>
            }
            deck={
              <>
                From {formatNumber(crimes.value)} registered crimes in{" "}
                {crimes.year} to {formatNumber(prison.value)} prison sentences
                in {prison.year}, this page follows the numbers through the
                Dutch criminal justice chain, card by card. Every figure is
                open data, embedded in this page at build time.
              </>
            }
            retrievedAt={snapshot.retrievedAt}
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={crimes.label}
              value={formatNumber(crimes.value)}
              sub={`CBS StatLine 83723NED, ${crimes.year}`}
            />
            <StatCard
              label={suspects.label}
              value={formatNumber(suspects.value)}
              sub={`CBS StatLine 83723NED, ${suspects.year}`}
            />
            <StatCard
              label={verdicts.label}
              value={formatNumber(verdicts.value)}
              sub={`CBS StatLine 83944NED, ${verdicts.year}`}
            />
            <StatCard
              label={prison.label}
              value={formatNumber(prison.value)}
              sub={`CBS StatLine 83944NED, ${prison.year}`}
            />
          </div>
        </section>

        <VanishingCrime />
        <DockChart />
        <InvisibleCourtroom />
        <AbsorptionFunnel />
        <SanctionShift />
        <ClearanceParadox />
        <CorrelationCards />
        <JailSnapshot />
        <EuropeCells />
        <OddsCoda />
      </div>
    </>
  );
}

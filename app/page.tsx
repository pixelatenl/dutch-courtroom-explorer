import { FamilyHero } from "@/components/family-hero";
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
  heroStats,
  latestCrime,
  formatYear,
} from "@/data/snapshot";

/*
  The single page. Card order per the research brief. Every figure is
  computed from the snapshot at render time; the only literals here
  are copy. The hero is a borderless strip of the eight heroStats
  entries, each with its own source line and derived year.
*/
export default function Home() {
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
            deck={`Eight numbers from ${formatYear(latestCrime.year)}. How much crime the country registers, how few people are killed, who sits in its cells, and what a year inside costs. Every figure is open data, embedded in this page at build time.`}
            retrievedAt={snapshot.retrievedAt}
          />
          <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10 sm:gap-x-10 lg:grid-cols-4">
            {heroStats.map((stat) => (
              <div key={stat.key}>
                <p className="text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl text-foreground">
                  {stat.key === "cost" ? `€${stat.value}` : stat.value}
                </p>
                <p className="mt-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  {stat.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.source}
                </p>
              </div>
            ))}
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

"use client";

import {
  createContext,
  Fragment,
  useContext,
  useRef,
  useState,
} from "react";
import { FamilySection } from "@/components/family-section";
import { AiInsight } from "@/components/ai-insight";
import {
  ChartTooltip,
  ChartTooltipContainer,
  type TooltipContent,
  type TooltipRow,
} from "@/components/chart-tooltip";
import {
  snapshot,
  formatNumber,
  formatPercent,
  formatCell,
  labelFor,
  AGE_LABELS,
  SEX_LABELS,
  BACKGROUND_LABELS,
  GENERATION_LABELS,
  EDUCATION_LABELS,
  INCOME_LABELS,
  RECIDIVE_LABELS,
  PREVIOUS_DETENTION_LABELS,
  latestRecidivism,
  recidivismRowsFor,
} from "@/data/snapshot";

/*
  Correlation cards: "Who the system tends to catch". A product-owned
  segmented control above the card grid switches the whole section
  between two representations of the same snapshot rows: the share
  composition (each category's share of its card's own total row,
  computed at render time from the counts) and the published rates.
  A client wrapper owns the state and provides it through context;
  the default is the composition view and state resets on reload.

  Suppressed cells (null) render as "n/a, suppressed", never as zero.
  In the composition view a row whose rate is suppressed but whose
  count is published still renders its computed share. Every bar
  carries the shared chart tooltip with the raw count, the share of
  the card's total row, and the denominator note; in the rate view
  every printed value names its denominator explicitly.
*/

type CatchView = "share" | "rate";

const CatchViewContext = createContext<CatchView>("share");

interface BarRow {
  label: string;
  /** Published per-10,000 rate; null when CBS suppressed it. */
  rate: number | null;
  /** Raw count behind the rate; published even where the rate is suppressed. */
  count: number | null;
  /** The card's own total row. */
  total: number | null;
  /** Detention share bars: a share of the group, identical in both views. */
  percent?: boolean;
}

interface BarBlock {
  rows: BarRow[];
  /** Caption above the block (the indented sub-breakdowns). */
  caption?: string;
  /** Indent the block under its parent bar, with a connector. */
  child?: boolean;
}

interface RateGroupConfig {
  /** Printed unit in the rate view, naming the denominator explicitly. */
  unit: string;
  /** Tooltip row label for the rate. */
  rateLabel: string;
  /** Printed unit in the composition view. */
  shareUnit: string;
  /** Denominator footnote carried by every tooltip in this group. */
  footnote: string;
}

/*
  Denominator notes carried by the tooltips. The age, sex, background,
  education and income rates follow the CBS same-population-group
  convention (per 10,000 of the group's own population, GBA rule
  included); the recidivism rates are per 10,000 of all residents,
  which is why the first-offender and repeat-offender rates add up to
  the all-suspects rate. Share bars (detainee shares) carry the share
  wording instead, because subgroup shares of a total do add up.
*/
const DENOMINATOR_NOTE =
  "Each rate is per 10,000 within the group's own population, so a group rate is a weighted average of its subgroup rates, never a sum.";
const RESIDENTS_NOTE =
  "Recidivism rates are per 10,000 of all residents of the Netherlands, not within a subgroup population; the first-offender and repeat-offender rates add up to the all-suspects rate.";
const SHARE_DENOMINATOR_NOTE =
  "Denominator: all members of the group (all detainees that year), so this is a share of the group, not a per-10,000 rate.";

const OWN_POPULATION: RateGroupConfig = {
  unit: "per 10,000 of the group's own population",
  rateLabel: "Per 10,000 of the group's own population",
  shareUnit: "of all suspects",
  footnote: DENOMINATOR_NOTE,
};
const TABLE_TOTAL: RateGroupConfig = {
  ...OWN_POPULATION,
  shareUnit: "of the table's total",
};
const RESIDENTS: RateGroupConfig = {
  unit: "per 10,000 residents",
  rateLabel: "Per 10,000 residents",
  shareUnit: "of all suspects that year",
  footnote: RESIDENTS_NOTE,
};
const DETENTION: RateGroupConfig = {
  unit: "of detainees",
  rateLabel: "Share of detainees",
  shareUnit: "of detainees",
  footnote: SHARE_DENOMINATOR_NOTE,
};

/** Share of the card's own total row, computed at render time. */
function shareOf(r: BarRow): number | null {
  return r.count !== null && r.total !== null && r.total > 0
    ? r.count / r.total
    : null;
}

/** Tooltip payload for one bar, in the current view. */
function barTooltip(
  r: BarRow,
  config: RateGroupConfig,
  view: CatchView,
): TooltipContent {
  const share = shareOf(r);
  const rows: TooltipRow[] = r.percent
    ? [
        {
          label: "Share of the group",
          value: formatCell(share, (v) => formatPercent(v, 1)),
        },
        { label: "Count", value: formatCell(r.count, formatNumber) },
        { label: "Group total", value: formatCell(r.total, formatNumber) },
      ]
    : view === "share"
      ? [
          {
            label: "Share of the group total (derived)",
            value: formatCell(share, (v) => formatPercent(v, 1)),
          },
          { label: "Count", value: formatCell(r.count, formatNumber) },
          { label: "Group total", value: formatCell(r.total, formatNumber) },
          { label: config.rateLabel, value: formatCell(r.rate, formatNumber) },
        ]
      : [
          { label: config.rateLabel, value: formatCell(r.rate, formatNumber) },
          { label: "Count", value: formatCell(r.count, formatNumber) },
          {
            label: "Share of total",
            value: formatCell(share, (v) => formatPercent(v, 1)),
          },
        ];
  return { title: r.label, rows, footnote: config.footnote };
}

/** Suppressed cells keep their note, plus the group's denominator note. */
function suppressedTooltip(
  r: BarRow,
  config: RateGroupConfig,
): TooltipContent {
  return {
    title: r.label,
    rows: [{ label: "Value", value: "n/a, suppressed" }],
    footnote: `Suppressed by CBS (.). ${config.footnote}`,
  };
}

function BarRowItem({
  row: r,
  config,
  view,
  max,
}: {
  row: BarRow;
  config: RateGroupConfig;
  view: CatchView;
  max: number;
}) {
  const share = shareOf(r);
  const value = r.percent ? share : view === "share" ? share : r.rate;
  const suppressed = value === null;
  const aria =
    r.percent || view === "share"
      ? `${r.label}: ${value === null ? "suppressed" : `${formatPercent(value, 1)} ${view === "share" ? config.shareUnit : "of detainees"}`}`
      : `${r.label}: ${value === null ? "suppressed" : `${formatNumber(value)} ${config.unit}`}`;
  return (
    <li className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{r.label}</span>
        <span className="text-right tabular-nums text-muted-foreground">
          {suppressed ? (
            <ChartTooltip content={suppressedTooltip(r, config)}>
              <span>n/a, suppressed</span>
            </ChartTooltip>
          ) : (
            <>
              <span className="font-semibold text-foreground tabular-nums">
                {r.percent || view === "share"
                  ? formatPercent(value, 1)
                  : formatNumber(value)}
              </span>{" "}
              {r.percent
                ? "of detainees"
                : view === "share"
                  ? config.shareUnit
                  : config.unit}
            </>
          )}
        </span>
      </div>
      <div
        className="h-3.5 w-full rounded-sm bg-(--chart-track)"
        role="img"
        aria-label={aria}
      >
        {!suppressed && (
          <ChartTooltip
            content={barTooltip(r, config, view)}
            className="block h-full rounded-sm bg-(--chart-2) transition-colors hover:bg-(--brand-accent)"
            style={{ width: `${(value / max) * 100}%` }}
          />
        )}
      </div>
    </li>
  );
}

function RateBars({
  config,
  blocks,
}: {
  config: RateGroupConfig;
  blocks: BarBlock[];
}) {
  const view = useContext(CatchViewContext);
  const allRows = blocks.flatMap((b) => b.rows);
  const valueOf = (r: BarRow): number | null =>
    r.percent ? shareOf(r) : view === "share" ? shareOf(r) : r.rate;
  const max = Math.max(1, ...allRows.map((r) => valueOf(r) ?? 0));
  return (
    <ChartTooltipContainer>
      <ul className="flex flex-col gap-2">
        {blocks.map((b, bi) =>
          b.child ? (
            <li
              key={bi}
              className="ml-3 flex flex-col gap-2 border-l-2 border-border pl-3"
            >
              {b.caption && (
                <span className="text-xs font-semibold text-muted-foreground">
                  {b.caption}
                </span>
              )}
              <ul className="flex flex-col gap-2">
                {b.rows.map((r) => (
                  <BarRowItem
                    key={r.label}
                    row={r}
                    config={config}
                    view={view}
                    max={max}
                  />
                ))}
              </ul>
            </li>
          ) : (
            <Fragment key={bi}>
              {b.caption && (
                <li className="text-xs font-semibold text-muted-foreground">
                  {b.caption}
                </li>
              )}
              {b.rows.map((r) => (
                <BarRowItem
                  key={r.label}
                  row={r}
                  config={config}
                  view={view}
                  max={max}
                />
              ))}
            </Fragment>
          ),
        )}
      </ul>
    </ChartTooltipContainer>
  );
}

function Card({
  title,
  year,
  note,
  children,
}: {
  title: string;
  year: number | null;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {year !== null && (
          <span className="shrink-0 inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
            {year}
          </span>
        )}
      </div>
      {children}
      {note && <p className="text-xs leading-snug text-muted-foreground">{note}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section-level toggle: a segmented control with radio-group          */
/* semantics, brand accent on the active state, roving tabindex and    */
/* arrow-key movement. The wrapper owns the state and provides it      */
/* through context; the default is the composition view.               */
/* ------------------------------------------------------------------ */

const VIEWS: { key: CatchView; label: string }[] = [
  { key: "share", label: "Share of all suspects" },
  { key: "rate", label: "Per 10,000" },
];

function ViewToggle({
  view,
  setView,
}: {
  view: CatchView;
  setView: (v: CatchView) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const select = (v: CatchView, focus: boolean) => {
    setView(v);
    if (focus) {
      const i = VIEWS.findIndex((x) => x.key === v);
      refs.current[i]?.focus();
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Card representation"
        className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted p-0.5"
      >
        {VIEWS.map((v, i) => {
          const active = view === v.key;
          return (
            <button
              key={v.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => select(v.key, false)}
              onKeyDown={(e) => {
                if (
                  ![
                    "ArrowRight",
                    "ArrowDown",
                    "ArrowLeft",
                    "ArrowUp",
                    "Home",
                    "End",
                  ].includes(e.key)
                )
                  return;
                e.preventDefault();
                const cur = VIEWS.findIndex((x) => x.key === view);
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? VIEWS.length - 1
                      : e.key === "ArrowRight" || e.key === "ArrowDown"
                        ? (cur + 1) % VIEWS.length
                        : (cur - 1 + VIEWS.length) % VIEWS.length;
                select(VIEWS[next].key, true);
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                active
                  ? "bg-brand-accent text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CatchViewProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<CatchView>("share");
  return (
    <CatchViewContext.Provider value={view}>
      <div className="flex flex-col gap-4">
        <ViewToggle view={view} setView={setView} />
        {children}
      </div>
    </CatchViewContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* The cards                                                           */
/* ------------------------------------------------------------------ */

/*
  The Background and generation card is kept in code but hidden from
  the UI for now; flip this flag to show it again.
*/
const SHOW_BACKGROUND_CARD = false;

function CardsGrid() {
  const view = useContext(CatchViewContext);
  const s = snapshot;

  const rateRow = (
    r: { key: string; title: string; count: number | null; per10000: number | null },
    total: number | null,
    labels: Record<string, string>,
  ): BarRow => ({
    label: labelFor(labels, r.key, r.title),
    rate: r.per10000,
    count: r.count,
    total,
  });

  const ageTotal = s.suspects.byAge.find((r) => r.key === "10000")?.count ?? null;
  const ageRows: BarRow[] = s.suspects.byAge
    .filter((r) => r.key !== "10000")
    .map((r) => rateRow(r, ageTotal, AGE_LABELS));

  const sexTotal = s.suspects.bySex.find((r) => r.key === "T001038")?.count ?? null;
  const sexRows: BarRow[] = s.suspects.bySex
    .filter((r) => r.key !== "T001038")
    .map((r) => rateRow(r, sexTotal, SEX_LABELS));

  const bgAll = s.backgroundGeneration.byBackground;
  const bgTotal = bgAll.find((r) => r.key === "T001040")?.count ?? null;
  const pickBg = (key: string): BarRow | null => {
    const r = bgAll.find((x) => x.key === key);
    return r ? rateRow(r, bgTotal, BACKGROUND_LABELS) : null;
  };
  // Rate view: the current structure, every background category as its
  // own row (including origin and the unknown row), then generation.
  const backgroundRows: BarRow[] = bgAll
    .filter((r) => r.key !== "T001040")
    .map((r) => rateRow(r, bgTotal, BACKGROUND_LABELS));
  const generationRows: BarRow[] = s.backgroundGeneration.byGeneration
    .filter((r) => r.key !== "T001040")
    .map((r) => rateRow(r, bgTotal, GENERATION_LABELS));
  // Composition view: the closing background level (Dutch, migration,
  // unknown), with the origin and generation splits indented under the
  // migration-background row. Shares are of the card total, so every
  // child bar is shorter than its parent.
  const dutchRow = pickBg("1012600");
  const migrationRow = pickBg("2012605");
  const unknownBgRow = pickBg("2012659");
  const originRows = ["2012655", "2012657"]
    .map(pickBg)
    .filter((r): r is BarRow => r !== null);
  const backgroundCompositionBlocks: BarBlock[] = [
    {
      rows: [dutchRow, migrationRow].filter((r): r is BarRow => r !== null),
    },
    { caption: "By origin", child: true, rows: originRows },
    { caption: "By generation", child: true, rows: generationRows },
    { rows: unknownBgRow ? [unknownBgRow] : [] },
  ];

  // The generation split does not reconcile exactly with the
  // migration-background total as published; the difference is derived
  // here and stated as observed, without speculating about the cause.
  const migrationCount = bgAll.find((r) => r.key === "2012605")?.count ?? null;
  const generationSum = s.backgroundGeneration.byGeneration
    .filter((r) => r.key !== "T001040")
    .reduce((sum, r) => sum + (r.count ?? 0), 0);
  const generationDiff =
    migrationCount !== null ? generationSum - migrationCount : null;

  const eduTotal =
    s.educationIncome.byEducation.find((r) => r.key === "T001143")?.count ?? null;
  const educationRows: BarRow[] = s.educationIncome.byEducation
    .filter((r) => r.key !== "T001143")
    .map((r) => rateRow(r, eduTotal, EDUCATION_LABELS));
  const incomeTotal =
    s.educationIncome.byIncome.find((r) => r.key === "T001164")?.count ?? null;
  const incomeRows: BarRow[] = s.educationIncome.byIncome
    .filter((r) => r.key !== "T001164")
    .map((r) => rateRow(r, incomeTotal, INCOME_LABELS));

  const recYear = latestRecidivism?.year ?? null;
  const recRows = recYear === null ? [] : recidivismRowsFor(recYear);
  const recTotal = recRows.find((r) => r.recidive === "T001278")?.count ?? null;
  const recRepeat = recRows.find((r) => r.recidive === "A041522")?.count ?? null;
  const repeatShare =
    recTotal && recRepeat !== null && recTotal > 0 ? recRepeat / recTotal : null;
  const recidivismBars: BarRow[] = recRows
    .filter((r) => r.recidive !== "T001278")
    .map((r) => ({
      label: labelFor(RECIDIVE_LABELS, r.recidive, r.recidive),
      rate: r.per10000,
      count: r.count,
      total: recTotal,
    }));

  const detTotal =
    s.detainees.byPreviousDetention.find((r) => r.key === "T001670")?.count ??
    null;
  const detPrevious =
    s.detainees.byPreviousDetention.find((r) => r.key === "A052582")?.count ??
    null;
  const previousShare =
    detTotal && detPrevious !== null && detTotal > 0
      ? detPrevious / detTotal
      : null;
  const detentionBars: BarRow[] = s.detainees.byPreviousDetention
    .filter((r) => r.key !== "T001670")
    .map((r) => ({
      label: labelFor(PREVIOUS_DETENTION_LABELS, r.key, r.title),
      rate: null,
      count: r.count,
      total: detTotal,
      percent: true,
    }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card
        title="The age of crime"
        year={s.suspects.year}
        note="Age-specific rates are CBS's own per-10,000 rates of each age group's own population; the youngest band spans only six years of age, so its rate moves more sharply than the counts suggest. In the share view, bars are each band's share of all suspects that year."
      >
        <RateBars config={OWN_POPULATION} blocks={[{ rows: ageRows }]} />
      </Card>
      <Card
        title="Men and women"
        year={s.suspects.year}
        note="Rates are per 10,000 of each sex's own population; in the share view, bars are shares of all suspects that year."
      >
        <RateBars config={OWN_POPULATION} blocks={[{ rows: sexRows }]} />
      </Card>
      {SHOW_BACKGROUND_CARD && (
        <Card
          title="Background and generation"
          year={s.backgroundGeneration.year}
          note={`Migration background as registered by CBS; generation split among people with a migration background. The generation split does not reconcile exactly with the migration-background total as published: ${formatNumber(generationSum)} against ${formatNumber(migrationCount)}, a derived difference of ${formatNumber(generationDiff)}. Each rate is per 10,000 within the group's own population, so a group rate is a weighted average of its subgroup rates, never their sum. CBS counts include suspects who are not in the municipal population register (GBA) while the rates do not, so counts and rates do not reconstruct each other exactly.`}
        >
          {view === "share" ? (
            <RateBars
              config={OWN_POPULATION}
              blocks={backgroundCompositionBlocks}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <RateBars
                config={OWN_POPULATION}
                blocks={[{ rows: backgroundRows }]}
              />
              <RateBars
                config={OWN_POPULATION}
                blocks={[{ rows: generationRows }]}
              />
            </div>
          )}
        </Card>
      )}
      <Card
        title="Education and income gradient"
        year={Math.max(s.educationIncome.educationYear, s.educationIncome.incomeYear)}
        note={`Education breakdown published to ${s.educationIncome.educationYear}, income breakdown to ${s.educationIncome.incomeYear}; the newest year's breakdowns are suppressed by CBS and render as gaps elsewhere. Rates are per 10,000 of each group's own population; in the share view, shares are of the table's own total row (${formatNumber(eduTotal)} suspects in ${s.educationIncome.educationYear}).`}
      >
        <div className="flex flex-col gap-4">
          <RateBars config={TABLE_TOTAL} blocks={[{ rows: educationRows }]} />
          <RateBars config={TABLE_TOTAL} blocks={[{ rows: incomeRows }]} />
        </div>
      </Card>
      <Card
        title="The revolving door"
        year={recYear}
        note={
          <>
            Repeat-offender split published to {recYear}
            {repeatShare !== null
              ? `; ${formatPercent(repeatShare, 1)} of all suspects that year were repeat offenders.`
              : "."}{" "}
            Recidivism rates are per 10,000 of all residents of the
            Netherlands, not of a subgroup population; in the share view the
            bars are shares of all {formatNumber(recTotal)} suspects that
            year. Among detainees in {s.detainees.year}:{" "}
            {previousShare !== null
              ? `${formatPercent(previousShare, 1)} had been detained before.`
              : "the previously-detained share is suppressed."}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <RateBars config={RESIDENTS} blocks={[{ rows: recidivismBars }]} />
          <RateBars config={DETENTION} blocks={[{ rows: detentionBars }]} />
          <p className="text-xs text-muted-foreground">
            Detainee shares are shares of all detainees (
            {formatNumber(detTotal)} in {s.detainees.year}), not per-capita
            rates.
          </p>
        </div>
      </Card>
    </div>
  );
}

export function CorrelationCards() {
  const insights = snapshot.narration?.visuals;
  return (
    <FamilySection
      title="Who the system tends to catch"
      description={
        <>
          Who gets registered as a suspect, by age, sex, background and
          generation, education, income, and prior contact with detention.
          Switch between each card&apos;s share composition (shares of the
          card&apos;s own total row) and the published rates. Rates are per
          10,000 of the group&apos;s own population for age, sex, background,
          education and income; the recidivism rates are per 10,000 of all
          residents. Each card carries its own source year. CBS rounds counts
          to tens, so shares may not sum to exactly 100%.
        </>
      }
    >
      <CatchViewProvider>
        <CardsGrid />
      </CatchViewProvider>
      {insights?.catch && <AiInsight text={insights.catch} />}
    </FamilySection>
  );
}

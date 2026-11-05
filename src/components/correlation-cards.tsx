import { FamilySection } from "@/components/family-section";
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
  Correlation cards: rates only, suspects per 10,000 inhabitants, each
  card with its own source year. Suppressed cells (null) render as
  gaps with a note, never as zero. Every bar carries the shared chart
  tooltip with the raw count and the share of the card's total row.
*/

interface BarRow {
  label: string;
  value: number | null;
  /** Render the value as a share (0-1) in percent instead of a rate. */
  percent?: boolean;
  /** Raw count behind the rate or share, when the snapshot carries it. */
  count?: number | null;
  /** Total row of the card, when the snapshot carries it. */
  total?: number | null;
}

/** Tooltip payload for one rate bar, derived from the snapshot row. */
function barTooltip(r: BarRow): TooltipContent {
  const share =
    r.count !== null && r.count !== undefined && r.total ? r.count / r.total : null;
  const rows: TooltipRow[] = r.percent
    ? [
        {
          label: "Share of the group",
          value: formatCell(r.value, (v) => formatPercent(v, 1)),
        },
        { label: "Count", value: formatCell(r.count ?? null, formatNumber) },
        { label: "Group total", value: formatCell(r.total ?? null, formatNumber) },
      ]
    : [
        {
          label: "Per 10,000 inhabitants",
          value: formatCell(r.value, formatNumber),
        },
        { label: "Count", value: formatCell(r.count ?? null, formatNumber) },
        ...(r.total !== undefined
          ? [
              {
                label: "Share of total",
                value: formatCell(share, (v) => formatPercent(v, 1)),
              },
            ]
          : []),
      ];
  return { title: r.label, rows };
}

const SUPPRESSED_TOOLTIP: TooltipContent = {
  title: "",
  rows: [{ label: "Value", value: "n/a, suppressed" }],
  footnote: "Suppressed by CBS (.).",
};

function RateBars({ rows }: { rows: BarRow[] }) {
  const max = Math.max(
    1,
    ...rows.map((r) => r.value ?? 0),
  );
  return (
    <ChartTooltipContainer>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.label} className="flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>{r.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {r.value === null ? (
                  <ChartTooltip
                    content={{ ...SUPPRESSED_TOOLTIP, title: r.label }}
                  >
                    <span>n/a, suppressed</span>
                  </ChartTooltip>
                ) : (
                  <>
                    <span className="font-semibold text-foreground tabular-nums">
                      {r.percent ? formatPercent(r.value, 1) : formatNumber(r.value)}
                    </span>{" "}
                    {r.percent ? "of detainees" : "per 10,000"}
                  </>
                )}
              </span>
            </div>
            <div className="h-3.5 w-full rounded-sm bg-(--chart-track)" role="img" aria-label={`${r.label}: ${r.value === null ? "suppressed" : `${formatNumber(r.value)} per 10,000 inhabitants`}`}>
              {r.value !== null && (
                <ChartTooltip
                  content={barTooltip(r)}
                  className="block h-full rounded-sm bg-(--chart-2) transition-colors hover:bg-(--brand-accent)"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              )}
            </div>
          </li>
        ))}
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
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {year}
          </span>
        )}
      </div>
      {children}
      {note && <p className="text-xs leading-snug text-muted-foreground">{note}</p>}
    </div>
  );
}

export function CorrelationCards() {
  const s = snapshot;

  const ageTotal = s.suspects.byAge.find((r) => r.key === "10000")?.count ?? null;
  const ageRows: BarRow[] = s.suspects.byAge
    .filter((r) => r.key !== "10000")
    .map((r) => ({
      label: labelFor(AGE_LABELS, r.key, r.title),
      value: r.per10000,
      count: r.count,
      total: ageTotal,
    }));

  const sexTotal = s.suspects.bySex.find((r) => r.key === "T001038")?.count ?? null;
  const sexRows: BarRow[] = s.suspects.bySex
    .filter((r) => r.key !== "T001038")
    .map((r) => ({
      label: labelFor(SEX_LABELS, r.key, r.title),
      value: r.per10000,
      count: r.count,
      total: sexTotal,
    }));

  const bgTotal =
    s.backgroundGeneration.byBackground.find((r) => r.key === "T001040")?.count ??
    null;
  const backgroundRows: BarRow[] = s.backgroundGeneration.byBackground
    .filter((r) => r.key !== "T001040")
    .map((r) => ({
      label: labelFor(BACKGROUND_LABELS, r.key, r.title),
      value: r.per10000,
      count: r.count,
      total: bgTotal,
    }));
  const generationRows: BarRow[] = s.backgroundGeneration.byGeneration
    .filter((r) => r.key !== "T001040")
    .map((r) => ({
      label: labelFor(GENERATION_LABELS, r.key, r.title),
      value: r.per10000,
      count: r.count,
      total: bgTotal,
    }));

  const eduTotal =
    s.educationIncome.byEducation.find((r) => r.key === "T001143")?.count ?? null;
  const educationRows: BarRow[] = s.educationIncome.byEducation
    .filter((r) => r.key !== "T001143")
    .map((r) => ({
      label: labelFor(EDUCATION_LABELS, r.key, r.title),
      value: r.per10000,
      count: r.count,
      total: eduTotal,
    }));
  const incomeTotal =
    s.educationIncome.byIncome.find((r) => r.key === "T001164")?.count ?? null;
  const incomeRows: BarRow[] = s.educationIncome.byIncome
    .filter((r) => r.key !== "T001164")
    .map((r) => ({
      label: labelFor(INCOME_LABELS, r.key, r.title),
      value: r.per10000,
      count: r.count,
      total: incomeTotal,
    }));

  const recYear = latestRecidivism?.year ?? null;
  const recRows = recYear === null ? [] : recidivismRowsFor(recYear);
  const recTotal = recRows.find((r) => r.recidive === "T001278")?.count ?? null;
  const recRepeat = recRows.find((r) => r.recidive === "A041522")?.count ?? null;
  const repeatShare =
    recTotal && recRepeat !== null && recTotal > 0 ? recRepeat / recTotal : null;
  const recidivismBars: BarRow[] = recRows.map((r) => ({
    label: labelFor(RECIDIVE_LABELS, r.recidive, r.recidive),
    value: r.per10000,
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
  const detentionBars: BarRow[] = s.detainees.byPreviousDetention.map((r) => ({
    label: labelFor(PREVIOUS_DETENTION_LABELS, r.key, r.title),
    value: r.count !== null && detTotal ? r.count / detTotal : null,
    percent: true,
    count: r.count,
    total: detTotal,
  }));

  return (
    <FamilySection
      title="Who the system tends to catch"
      description={
        <>
          Suspect rates per 10,000 inhabitants by age, sex, background,
          education, income, and prior contact with detention. Rates only,
          each card carrying its own source year.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="The age of crime"
          year={s.suspects.year}
          note="Age-specific rates are CBS's own per-10,000 rates; the youngest band spans only six years of age, so its rate moves more sharply than the counts suggest."
        >
          <RateBars rows={ageRows} />
        </Card>
        <Card title="Men and women" year={s.suspects.year}>
          <RateBars rows={sexRows} />
        </Card>
        <Card
          title="Background and generation"
          year={s.backgroundGeneration.year}
          note="Migration background as registered by CBS; generation split among people with a migration background."
        >
          <div className="flex flex-col gap-4">
            <RateBars rows={backgroundRows} />
            <RateBars rows={generationRows} />
          </div>
        </Card>
        <Card
          title="Education and income gradient"
          year={Math.max(s.educationIncome.educationYear, s.educationIncome.incomeYear)}
          note={`Education breakdown published to ${s.educationIncome.educationYear}, income breakdown to ${s.educationIncome.incomeYear}; the newest year's breakdowns are suppressed by CBS and render as gaps elsewhere.`}
        >
          <div className="flex flex-col gap-4">
            <RateBars rows={educationRows} />
            <RateBars rows={incomeRows} />
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
              Among detainees in {s.detainees.year}:{" "}
              {previousShare !== null
                ? `${formatPercent(previousShare, 1)} had been detained before.`
                : "the previously-detained share is suppressed."}
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <RateBars rows={recidivismBars} />
            <RateBars rows={detentionBars} />
            <p className="text-xs text-muted-foreground">
              Detainee shares are shares of all detainees (
              {formatNumber(detTotal)} in {s.detainees.year}), not per-capita
              rates.
            </p>
          </div>
        </Card>
      </div>
    </FamilySection>
  );
}

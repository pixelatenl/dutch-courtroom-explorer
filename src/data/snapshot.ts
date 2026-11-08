import raw from "./snapshot.json";

/*
  Typed view over the committed data snapshot (src/data/snapshot.json,
  written by scripts/snapshot.mjs). Every figure rendered on the page
  comes from this module; components never hardcode statistical
  literals. Suppressed CBS cells (".") are null here and render as
  gaps with a note, never as zero.
*/

export interface DjiProvenance {
  source: string;
  document: string;
  version: string;
  dataYear: number;
  url: string;
  manual: boolean;
}

export interface Provenance {
  source: string;
  table?: string;
  title?: string;
  page?: string;
  dataset?: string;
  license: string;
  licenseUrl: string;
  retrievedAt: string;
  document?: string;
  version?: string;
  dataYear?: number;
  url?: string;
  manual?: boolean;
}

export interface CrimeYear {
  year: number;
  total: number | null;
  violence: number | null;
  property: number | null;
  destruction: number | null;
  traffic: number | null;
  other: number | null;
  totalPer1000: number | null;
  violencePer1000: number | null;
  propertyPer1000: number | null;
  destructionPer1000: number | null;
  trafficPer1000: number | null;
  otherPer1000: number | null;
  cleared: number | null;
  clearanceRate: number | null;
  suspectRegistrations: number | null;
  suspectsMale: number | null;
  suspectsFemale: number | null;
  suspectsAdult: number | null;
  suspectsMinor: number | null;
}

export interface RateRow {
  key: string;
  title: string;
  count: number | null;
  per10000: number | null;
}

export interface OffenceChild {
  key: string;
  label: string;
  count: number | null;
}

export interface OffenceRow {
  key: string;
  label: string;
  count: number | null;
  /** Subcategories of this group, fetched from the same CBS totals row. */
  children?: OffenceChild[];
  /** Set when this bar is itself contained in another group or child. */
  childIncludedIn?: { key: string; label: string };
}

export interface JusticeYear {
  year: number;
  omTotal: number | null;
  summons: number | null;
  summonsAfterObjection: number | null;
  unconditionalDismissal: number | null;
  conditionalDismissal: number | null;
  transaction: number | null;
  penaltyOrder: number | null;
  otherOM: number | null;
  verdictTotal: number | null;
  guiltyWithSanction: number | null;
  guiltyWithoutSanction: number | null;
  acquittal: number | null;
  otherVerdict: number | null;
  sanctionsTotal: number | null;
  prison: number | null;
  fine: number | null;
  communityService: number | null;
  otherPrincipal: number | null;
}

export interface RecidivismRow {
  year: number;
  recidive: string;
  count: number | null;
  per10000: number | null;
}

export interface KeyedCount {
  key: string;
  title: string;
  count: number | null;
}

export interface PrisonStockYear {
  year: number;
  [key: string]: number | string | null;
}

export interface CountryRate {
  country: string;
  label: string;
  rate: number | null;
}

/**
 * AI insight narrations, generated at snapshot time by Mistral from
 * the same aggregates that power the charts. All fields optional: a
 * run without the API key or a failed narration simply stores less.
 */
export interface Narration {
  /** SHA-256 of each visual's narration context: the exact aggregates
   *  the stored text was generated from and validated against. A
   *  visual is re-narrated only when its context hash changes. */
  signatures?: {
    vanishingCrime?: string;
    dock?: string;
    courtroom?: string;
    funnel?: string;
    sanctions?: string;
    clearance?: string;
    catch?: string;
    jail?: string;
    europe?: string;
  };
  visuals: {
    vanishingCrime?: string;
    dock?: string;
    courtroom?: string;
    funnel?: string;
    sanctions?: string;
    clearance?: string;
    catch?: string;
    jail?: string;
    europe?: string;
  };
}

export interface Snapshot {
  retrievedAt: string;
  sources: {
    cbs: {
      name: string;
      url: string;
      license: string;
      licenseUrl: string;
      retrievedAt: string;
      tables: Record<string, { title: string; page: string }>;
    };
    eurostat: {
      name: string;
      dataset: string;
      page: string;
      license: string;
      licenseUrl: string;
      retrievedAt: string;
    };
    dji: DjiProvenance;
  };
  crime: { provenance: Provenance; years: CrimeYear[] };
  suspects: {
    provenance: Provenance;
    year: number;
    bySex: RateRow[];
    byAge: RateRow[];
    byBackground: RateRow[];
    byOffence: OffenceRow[];
  };
  educationIncome: {
    provenance: Provenance;
    educationYear: number;
    incomeYear: number;
    byEducation: RateRow[];
    byIncome: RateRow[];
  };
  justice: { provenance: Provenance; years: JusticeYear[] };
  recidivism: { provenance: Provenance; years: RecidivismRow[] };
  backgroundGeneration: {
    provenance: Provenance;
    year: number;
    byBackground: RateRow[];
    byGeneration: RateRow[];
  };
  detainees: {
    provenance: Provenance;
    year: number;
    byPreviousDetention: KeyedCount[];
  };
  prisonStock: {
    provenance: Provenance;
    years: PrisonStockYear[];
    year: number;
    byLegalStatus: KeyedCount[];
    byAge: KeyedCount[];
    sentenceDurationKeys: string[];
  };
  homicide: {
    provenance: Provenance;
    years: { year: number; victims: number | null; perMillion: number | null }[];
  };
  europe: {
    provenance: Provenance;
    year: number;
    ratesPer100k: CountryRate[];
    netherlands: {
      year: number;
      capacity: number | null;
      held: number | null;
      ratePer100k: number | null;
    };
  };
  costs: {
    provenance: DjiProvenance;
    costPerDetaineePerDayEur: { regular: number; ppc: number };
    costPerDetaineePerYearEur: { regular: number; ppc: number; derived: boolean };
    averageUsableCapacity: { value: number; year: number; note: string };
  };
  narration?: Narration;
}

export const snapshot = raw as Snapshot;

/* ------------------------------------------------------------------ */
/* Formatters (en-GB)                                                  */
/* ------------------------------------------------------------------ */

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "n/a";
  return new Intl.NumberFormat("en-GB").format(value);
}

/*
  Years are calendar labels, not quantities: no thousands grouping,
  no separators, no locale decoration, so a four-digit year always
  prints as itself. Null stays n/a.
*/
export function formatYear(value: number | null | undefined): string {
  if (value === null || value === undefined) return "n/a";
  return String(value);
}

export function formatNumberSigned(value: number | null | undefined): string {
  if (value === null || value === undefined) return "n/a";
  return new Intl.NumberFormat("en-GB", { signDisplay: "always" }).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined) return "n/a";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatRate(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return "n/a";
  return value.toFixed(digits);
}

/*
  Formatter for a possibly-suppressed CBS cell in a tooltip or label:
  null stays null and renders as "n/a, suppressed", never as zero and
  never as an empty string.
*/
export function formatCell(
  value: number | null | undefined,
  format: (v: number) => string,
): string {
  if (value === null || value === undefined) return "n/a, suppressed";
  return format(value);
}

/** "1 in N" from a per-capita rate: rate per `per` inhabitants. */
export function oneIn(ratePer: number | null | undefined, per: number): string {
  if (ratePer === null || ratePer === undefined || ratePer <= 0) return "n/a";
  return `1 in ${formatNumber(Math.round(per / ratePer))}`;
}

/* ------------------------------------------------------------------ */
/* English labels for the CBS category keys (copy, not figures)        */
/* ------------------------------------------------------------------ */

export const SEX_LABELS: Record<string, string> = {
  T001038: "Total",
  "3000": "Men",
  "4000": "Women",
  "9000": "Sex unknown",
};

export const AGE_LABELS: Record<string, string> = {
  "10000": "All ages",
  "52020": "12 to 18 years",
  "53105": "18 to 25 years",
  "53310": "25 to 45 years",
  "53715": "45 to 65 years",
  "80200": "65 years or older",
  "99999": "Age unknown",
};

export const BACKGROUND_LABELS: Record<string, string> = {
  T001040: "Total",
  "1012600": "Dutch background",
  "2012605": "With a migration background",
  "2012655": "Western migration background",
  "2012657": "Non-Western migration background",
  "2012659": "Migration background unknown",
  H008673: "Morocco",
  H008766: "Türkiye",
  H008751: "Suriname",
  H007119: "Dutch Caribbean",
  A008187: "Other non-Western",
};

export const GENERATION_LABELS: Record<string, string> = {
  T001040: "Total",
  "2013356": "First generation",
  "2013357": "Second generation",
  "2820719": "Generation unknown",
};

export const EDUCATION_LABELS: Record<string, string> = {
  T001143: "Total",
  A025280: "Primary education",
  A025286: "Lower secondary (vmbo)",
  A042783: "Special secondary education",
  A025289: "Practical education",
  T001336: "MBO (secondary vocational)",
  A041750: "HAVO/VWO (senior general)",
  A043057: "HBO/WO (higher education)",
  "2018820": "Education unknown",
};

export const INCOME_LABELS: Record<string, string> = {
  T001164: "Total",
  "1050290": "Income up to the low-income threshold",
  "1050295": "Income above the low-income threshold",
  "1050285": "Not classified",
};

export const RECIDIVE_LABELS: Record<string, string> = {
  T001278: "All suspects",
  A041521: "First offenders",
  A041522: "Repeat offenders",
};

export const PREVIOUS_DETENTION_LABELS: Record<string, string> = {
  T001670: "All detainees",
  A052582: "Previously detained",
  A052583: "Not previously detained",
};

export const LEGAL_STATUS_LABELS: Record<string, string> = {
  T001557: "Total",
  A048446: "Preliminary detention",
  A048447: "Prison sentence",
  A048448: "Substitute detention / measure",
  A048449: "Repeat offenders institution (ISD)",
  A048450: "Other or unknown",
};

export const STOCK_AGE_LABELS: Record<string, string> = {
  "10000": "Total",
  "53103": "18 to 23 years",
  A052643: "23 to 45 years",
  "53715": "45 to 65 years",
  "80200": "65 years or older",
  "99998": "Other ages",
};

export const SENTENCE_DURATION_LABELS: Record<string, string> = {
  T001556: "Total",
  A048439: "Less than 1 month",
  A048440: "1 to 6 months",
  A048441: "6 months to 1 year",
  A048442: "1 to 3 years",
  A048443: "3 years or longer",
  A048444: "Other and unknown",
};

export function labelFor(
  map: Record<string, string>,
  key: string,
  fallback: string,
): string {
  return map[key] ?? fallback;
}

/* ------------------------------------------------------------------ */
/* Derived views (computed at render time, never hand-written)         */
/* ------------------------------------------------------------------ */

export const crimeYears = snapshot.crime.years;
export const latestCrime = crimeYears[crimeYears.length - 1];
export const justiceYears = snapshot.justice.years;
export const latestJustice = justiceYears[justiceYears.length - 1];
export const firstJustice = justiceYears[0];
export const homicideYears = snapshot.homicide.years;
export const latestHomicide = homicideYears[homicideYears.length - 1];

/** Latest recidivism year whose repeat-offender split is published. */
export const latestRecidivism = (() => {
  const rows = snapshot.recidivism.years.filter(
    (r) => r.recidive === "A041522" && r.count !== null,
  );
  return rows.length
    ? rows.reduce((a, b) => (a.year > b.year ? a : b))
    : null;
})();

export function recidivismRowsFor(year: number): RecidivismRow[] {
  return snapshot.recidivism.years.filter((r) => r.year === year);
}

/*
  Status chip rule (method drawer): a series chip compares the latest
  value against the value five years earlier (short term) and against
  the historical peak (long term). Direction is derived from the
  short-term change; the long-term comparison is reported alongside.
*/
export interface StatusChip {
  latest: number | null;
  shortTermChange: number | null;
  peak: number | null;
  belowPeakPct: number | null;
  direction: "up" | "down" | "flat" | "unknown";
}

export function statusChip(
  years: { year: number; value: number | null }[],
): StatusChip {
  const latest = years[years.length - 1]?.value ?? null;
  const fiveYearsEarlier =
    years.find((y) => y.year === years[years.length - 1].year - 5)?.value ??
    null;
  const published = years.filter((y) => y.value !== null);
  const peak =
    published.length > 0
      ? published.reduce((a, b) => ((b.value ?? 0) > (a.value ?? 0) ? b : a))
          .value
      : null;
  const shortTermChange =
    latest !== null && fiveYearsEarlier !== null && fiveYearsEarlier !== 0
      ? (latest - fiveYearsEarlier) / fiveYearsEarlier
      : null;
  const belowPeakPct =
    latest !== null && peak !== null && peak !== 0
      ? (peak - latest) / peak
      : null;
  const direction =
    shortTermChange === null
      ? "unknown"
      : shortTermChange > 0.005
        ? "up"
        : shortTermChange < -0.005
          ? "down"
          : "flat";
  return { latest, shortTermChange, peak, belowPeakPct, direction };
}

export const crimeRateSeries = crimeYears.map((y) => ({
  year: y.year,
  value: y.totalPer1000,
}));
export const propertyRateSeries = crimeYears.map((y) => ({
  year: y.year,
  value: y.propertyPer1000,
}));
export const trafficRateSeries = crimeYears.map((y) => ({
  year: y.year,
  value: y.trafficPer1000,
}));
export const violenceRateSeries = crimeYears.map((y) => ({
  year: y.year,
  value: y.violencePer1000,
}));

export const clearanceSeries = crimeYears.map((y) => ({
  year: y.year,
  crimeRate: y.totalPer1000,
  clearanceRate: y.clearanceRate !== null ? y.clearanceRate / 100 : null,
}));

/*
  Offence subcategory breakdown of a dock-chart group, derived at
  render time. Children overlap and do not sum to the group total, so
  the remainder (group total minus the sum of the published children)
  is computed here and labeled derived by the renderer; a child that
  is itself a top-level bar (shoplifting, driving under influence) is
  flagged through its childIncludedIn note and never added on top.
*/
export interface OffenceBreakdownRow {
  child: OffenceChild;
  shareOfGroup: number | null;
}

export function offenceBreakdown(group: OffenceRow): {
  rows: OffenceBreakdownRow[];
  remainder: number | null;
} {
  const children = group.children ?? [];
  const groupCount = group.count;
  const rows = children.map((child) => ({
    child,
    shareOfGroup:
      child.count !== null && groupCount !== null && groupCount > 0
        ? child.count / groupCount
        : null,
  }));
  const remainder =
    groupCount !== null
      ? groupCount -
        children.reduce((sum, c) => sum + (c.count ?? 0), 0)
      : null;
  return { rows, remainder };
}

/*
  The absorption funnel: of every 100 registered crimes in the latest
  justice year, how many end in a suspect registration, a summons, a
  conviction, and a prison term. Each stage is divided by the same
  registered-crime denominator of that year.
*/
export const funnel = (() => {
  const crimes = crimeYears.find((y) => y.year === latestJustice.year);
  const denominator = crimes?.total ?? null;
  // Per-100 stages are rounded to whole persons for display.
  const stage = (value: number | null) =>
    denominator && denominator > 0 && value !== null
      ? Math.round((value / denominator) * 100)
      : null;
  const conviction =
    latestJustice.guiltyWithSanction === null &&
    latestJustice.guiltyWithoutSanction === null
      ? null
      : (latestJustice.guiltyWithSanction ?? 0) +
        (latestJustice.guiltyWithoutSanction ?? 0);
  const absolute = {
    suspect: crimes?.suspectRegistrations ?? null,
    summons: latestJustice.summons,
    conviction,
    prison: latestJustice.prison,
  };
  return {
    year: latestJustice.year,
    per100Crimes: denominator,
    suspect: stage(absolute.suspect),
    summons: stage(absolute.summons),
    conviction: stage(absolute.conviction),
    prison: stage(absolute.prison),
    // Absolute stage counts behind the derived per-100 values, for the
    // chart tooltips.
    absolute,
  };
})();

/*
  Hero funnel stage cards, each with its own source year. Kept for the
  SEO meta description in app/layout.tsx, which is out of scope for
  the hero strip rewrite; the page hero renders heroStats below.
*/
export const heroStages = [
  {
    key: "crimes",
    label: "Registered crimes",
    value: latestCrime.total,
    year: latestCrime.year,
    provenance: snapshot.crime.provenance,
  },
  {
    key: "suspects",
    label: "Suspect registrations",
    value: latestCrime.suspectRegistrations,
    year: latestCrime.year,
    provenance: snapshot.crime.provenance,
  },
  {
    key: "verdicts",
    label: "Court verdicts",
    value: latestJustice.verdictTotal,
    year: latestJustice.year,
    provenance: snapshot.justice.provenance,
  },
  {
    key: "prison",
    label: "Prison sentences",
    value: latestJustice.prison,
    year: latestJustice.year,
    provenance: snapshot.justice.provenance,
  },
];

export interface HeroStat {
  key: string;
  label: string;
  /** The formatted figure: a grouped count or a signed percent. */
  value: string;
  /** Muted source line: table and derived year, copy with derived slots. */
  source: string;
}

/*
  The eight hero stats of the borderless strip under the hero, all
  from the latest published year of each series. Built render-time
  from the snapshot rows: the last crime row, the first and last
  homicide rows, the prison stock total, the detainee total, and the
  derived DJI cost per detainee per year. No figure or year is
  hand-written here.
*/
export const heroStats: HeroStat[] = (() => {
  const crimeTable = snapshot.crime.provenance.table ?? "StatLine";
  const homicideTable = snapshot.homicide.provenance.table ?? "StatLine";
  const detaineeTable = snapshot.detainees.provenance.table ?? "StatLine";
  const stockTable = snapshot.prisonStock.provenance.table ?? "StatLine";

  const firstHomicide = homicideYears[0];
  const homicideDrop =
    firstHomicide.victims !== null &&
    latestHomicide.victims !== null &&
    firstHomicide.victims !== 0
      ? (latestHomicide.victims - firstHomicide.victims) / firstHomicide.victims
      : null;

  const prisonStockTotal =
    snapshot.prisonStock.byLegalStatus.find((r) => r.key === "T001557")
      ?.count ?? null;
  const detaineesTotal =
    snapshot.detainees.byPreviousDetention.find((r) => r.key === "T001670")
      ?.count ?? null;
  const costPerYear = snapshot.costs.costPerDetaineePerYearEur.regular;
  const costPerDay = snapshot.costs.costPerDetaineePerDayEur.regular;
  const costYear = snapshot.costs.provenance.dataYear;

  const crimeYear = formatYear(latestCrime.year);

  return [
    {
      key: "crimes",
      label: "Registered crimes",
      value: formatNumber(latestCrime.total),
      source: `CBS StatLine ${crimeTable}, ${crimeYear}`,
    },
    {
      key: "suspects",
      label: "Suspect registrations",
      value: formatNumber(latestCrime.suspectRegistrations),
      source: `CBS StatLine ${crimeTable}, ${crimeYear}`,
    },
    {
      key: "homicide",
      label: "Murder and manslaughter victims",
      value: formatNumber(latestHomicide.victims),
      source: `CBS StatLine ${homicideTable}, ${formatYear(latestHomicide.year)}`,
    },
    {
      key: "homicide-drop",
      label: `Down since ${formatYear(firstHomicide.year)}`,
      value: formatPercent(homicideDrop, 0),
      source: `from ${formatNumber(firstHomicide.victims)} victims in ${formatYear(firstHomicide.year)} to ${formatNumber(latestHomicide.victims)} in ${formatYear(latestHomicide.year)}`,
    },
    {
      key: "prison-stock",
      label: "Behind bars",
      value: formatNumber(prisonStockTotal),
      source: `30 September ${formatYear(snapshot.prisonStock.year)}, CBS StatLine ${stockTable}`,
    },
    {
      key: "detainees",
      label: "Detained during the year",
      value: formatNumber(detaineesTotal),
      source: `CBS StatLine ${detaineeTable}, ${formatYear(snapshot.detainees.year)}`,
    },
    {
      key: "cleared",
      label: "Crimes cleared",
      value: formatNumber(latestCrime.cleared),
      source: `${formatNumber(latestCrime.clearanceRate)} percent, CBS StatLine ${crimeTable}, ${crimeYear}`,
    },
    {
      key: "cost",
      label: "One detainee, one year",
      value: formatNumber(costPerYear),
      source: `DJI, ${formatYear(costYear)} basis (€${formatNumber(costPerDay)} per day times 365, derived)`,
    },
  ];
})();

/** Eurostat occupancy of the Netherlands, derived at render time. */
export const nlOccupancy =
  snapshot.europe.netherlands.capacity && snapshot.europe.netherlands.held
    ? snapshot.europe.netherlands.held / snapshot.europe.netherlands.capacity
    : null;

/** Annual cost of holding the current 30 September stock (derived). */
export const annualStockCost =
  (() => {
    const total = snapshot.prisonStock.byLegalStatus.find(
      (r) => r.key === "T001557",
    )?.count;
    const perDay = snapshot.costs.costPerDetaineePerDayEur.regular;
    if (total === null || total === undefined) return null;
    return total * perDay * 365;
  })();

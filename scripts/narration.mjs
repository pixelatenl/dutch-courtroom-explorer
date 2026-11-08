/*
  Narration step of the snapshot job: one "AI insight" paragraph per
  narrated visual, written at snapshot time by the Mistral API.

  The recorded family pattern, in this module and nowhere else:
  deterministic code computes every figure and builds the context, the
  model only narrates that context, and the site renders the narration
  verbatim as static text. The model never calculates: every number in
  the returned text is validated against the context figures, and a
  prose-ratio phrasing ("one in twelve") fails the same validation, so
  a narration that introduces an unknown figure or a prose ratio is
  retried once and then dropped for this run. No API call happens from
  the client, ever; the key is read from process.env.MISTRAL_API_KEY
  only, never logged and never written anywhere.
*/

import { createHash } from "node:crypto";

const MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "mistral-small-latest";
const TEMPERATURE = 0.2;
const MAX_TOKENS = 150;
/** Per-visual retry budget: one fresh attempt after a failed validation. */
const MAX_CALLS_PER_VISUAL = 2;
/** Hard cap of Mistral calls per run, across all visuals. */
const MAX_CALLS_PER_RUN = 24;

const SYSTEM_PROMPT = [
  "You write the 'AI insight' caption of a public data-visualization page.",
  "Plain English, at most two sentences.",
  "Tell the visitor what is on the screen and the single most notable thing about it.",
  "Use only figures that appear in the provided context; never introduce a number that is not in the context.",
  "State every share and comparison as a percentage with a numeral taken from the context (for example '17.0%'); never as a prose ratio.",
  "No markdown, no lists, no hedging (never write words like 'approximately', 'around', 'seems', or 'likely').",
  "Output only the insight text.",
].join(" ");

const format = (value) => new Intl.NumberFormat("en-GB").format(value);
const share = (part, whole) =>
  whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "0%";

/*
  One guidance line shared by every visual context: shares and
  comparisons are stated as percentages with numerals taken from the
  context figures, never as prose ratios. The line sits with the other
  instructions, before the figures, and because it is part of each
  context it moves every visual's signature; the prose-ratio lint in
  validateNarration enforces it on the returned text.
*/
const NUMERALS_GUIDANCE =
  "Guidance: state every share and comparison as a percentage with a numeral taken from the context figures (for example '17.0%'); prose ratios such as 'one in twelve', 'six out of ten', or 'two in five' are not permitted.";

/*
  English copy for the CBS age-group keys (copy, not figures); the
  suspect rows carry Dutch titles and the contexts write English.
*/
const AGE_COPY = {
  "52020": "12 to 18",
  "53105": "18 to 25",
  "53310": "25 to 45",
  "53715": "45 to 65",
  "80200": "65 or older",
  "99999": "age unknown",
};
const ageCopy = (row) => AGE_COPY[row.key] ?? row.title;

/** Ordinal suffix for a rank: 32nd, 1st, 2nd, 3rd, 4th. */
const ordinal = (n) => {
  const mod100 = n % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
};

/*
  Deterministic context per visual: the chart's title, one line of what
  it shows, the population the chart counts (phrased the way the page
  itself phrases it, so the model cannot blur the bases), and the exact
  aggregates behind it from the snapshot, and nothing else. Every
  figure a narration may use appears here. Suppressed (null) CBS cells
  never produce a context line, and a visual whose base series is
  empty gets no context at all and therefore no narration.
*/
export function visualContexts(snapshot) {
  const crimeYears = snapshot.crime.years;
  const firstCrime = crimeYears[0];
  const lastCrime = crimeYears[crimeYears.length - 1];
  const publishedCrime = crimeYears.filter((y) => y.totalPer1000 !== null);
  // Peak by rate per 1,000 inhabitants; on a tie the later year wins
  // (2001 and 2002 both stand at 93, and 2002 holds the higher count).
  const peakCrime =
    publishedCrime.length > 0
      ? publishedCrime.reduce((a, b) => (b.totalPer1000 >= a.totalPer1000 ? b : a))
      : null;
  const crimeDrop =
    peakCrime && lastCrime.totalPer1000 !== null
      ? `${(((peakCrime.totalPer1000 - lastCrime.totalPer1000) / peakCrime.totalPer1000) * 100).toFixed(1)}%`
      : "0.0%";

  const suspects = snapshot.suspects;
  const dockTotalRow = suspects.byAge.find((r) => r.key === "10000");
  const dockTotal = dockTotalRow?.count ?? 0;
  const dockRate = dockTotalRow?.per10000 ?? null;

  const justiceYears = snapshot.justice.years;
  const firstJustice = justiceYears[0];
  const lastJustice = justiceYears[justiceYears.length - 1];

  const edu = snapshot.educationIncome;
  const eduTotal = edu.byEducation.find((r) => r.key === "T001143");
  const eduUnknown = edu.byEducation.find((r) => r.key === "2018820");
  const incomeBelow = edu.byIncome.find((r) => r.key === "1050290");
  const incomeAbove = edu.byIncome.find((r) => r.key === "1050295");

  // Latest recidivism year whose repeat-offender split is published.
  const recRows = snapshot.recidivism.years.filter(
    (r) => r.recidive === "A041522" && r.count !== null,
  );
  const recYear = recRows.length
    ? recRows.reduce((a, b) => (a.year > b.year ? a : b)).year
    : null;
  const recForYear = (recidive) =>
    snapshot.recidivism.years.find(
      (r) => r.year === recYear && r.recidive === recidive,
    );
  const recTotal = recForYear("T001278");
  const recRepeat = recForYear("A041522");
  const recFirst = recForYear("A041521");

  const detainees = snapshot.detainees;
  const detTotal = detainees.byPreviousDetention.find(
    (r) => r.key === "T001670",
  );
  const detPrevious = detainees.byPreviousDetention.find(
    (r) => r.key === "A052582",
  );

  const stock = snapshot.prisonStock;
  const stockYears = stock.years;
  const firstStock = stockYears[0];
  const lastStock = stockYears[stockYears.length - 1];
  const stockTotalOf = (y) =>
    typeof y["T001556"] === "number" ? y["T001556"] : null;
  const firstStockTotal = stockTotalOf(firstStock);
  const lastStockTotal = stockTotalOf(lastStock);
  const stockDrop =
    firstStockTotal && lastStockTotal
      ? `${(((firstStockTotal - lastStockTotal) / firstStockTotal) * 100).toFixed(1)}%`
      : "0.0%";
  const legalTotal = stock.byLegalStatus.find(
    (r) => r.key === "T001557",
  )?.count;
  const legalPrison = stock.byLegalStatus.find((r) => r.key === "A048447");
  const legalPrelim = stock.byLegalStatus.find((r) => r.key === "A048446");
  const costs = snapshot.costs;

  const europe = snapshot.europe;
  const rates = europe.ratesPer100k;
  const nl = europe.netherlands;
  const nlIndex = rates.findIndex((r) => r.country === "NL");
  const countriesAbove = nlIndex >= 0 ? nlIndex : 0;
  const rank = nlIndex + 1;
  const lowerCountries = rates.filter(
    (r) => r.rate !== null && nl.ratePer100k !== null && r.rate < nl.ratePer100k,
  );
  const lowerList = lowerCountries
    .map((r) => `${r.label} (${r.rate})`)
    .reduce(
      (acc, item, i, arr) =>
        i === 0 ? item : i === arr.length - 1 ? `${acc} and ${item}` : `${acc}, ${item}`,
      "",
    );
  const publishedRates = rates.filter((r) => r.rate !== null);
  const highestRate =
    publishedRates.length > 0
      ? publishedRates.reduce((a, b) => (b.rate >= a.rate ? b : a))
      : null;
  const occupancy =
    nl.capacity && nl.held
      ? `${((nl.held / nl.capacity) * 100).toFixed(1)}%`
      : "0.0%";

  /*
    The absorption funnel mirrors the `funnel` export in
    src/data/snapshot.ts exactly: same denominator (the registered
    crimes of the latest justice year), same conviction sum (guilty
    with sanction plus guilty without sanction), same whole-person
    rounding of the per-100 stages, so the context signature tracks
    the chart.
  */
  const funnelCrimes = crimeYears.find((y) => y.year === lastJustice.year);
  const funnelDenom = funnelCrimes?.total ?? null;
  const stage = (value) =>
    funnelDenom && funnelDenom > 0 && value !== null
      ? Math.round((value / funnelDenom) * 100)
      : null;
  const conviction =
    lastJustice.guiltyWithSanction === null &&
    lastJustice.guiltyWithoutSanction === null
      ? null
      : (lastJustice.guiltyWithSanction ?? 0) +
        (lastJustice.guiltyWithoutSanction ?? 0);
  const funnelAbs = {
    suspect: funnelCrimes?.suspectRegistrations ?? null,
    summons: lastJustice.summons,
    conviction,
    prison: lastJustice.prison,
  };

  const dockRows = [...suspects.byOffence].sort(
    (a, b) => (b.count ?? -1) - (a.count ?? -1),
  );
  // The category total exists only to compute the shares of the
  // categories shown; it is never stated as a population anywhere.
  const shownTotal = dockRows.reduce((sum, r) => sum + (r.count ?? 0), 0);

  const sexRow = (key) => suspects.bySex.find((r) => r.key === key);
  const men = sexRow("3000");
  const women = sexRow("4000");
  const ageGroups = suspects.byAge.filter(
    (r) => r.key !== "10000" && r.count !== null,
  );
  const highestAge =
    ageGroups.length > 0
      ? ageGroups
          .filter((r) => r.per10000 !== null)
          .reduce((a, b) => (b.per10000 >= a.per10000 ? b : a))
      : null;
  const largestAge =
    ageGroups.length > 0
      ? ageGroups.reduce((a, b) => (b.count >= a.count ? b : a))
      : null;

  const publishedClearance = crimeYears.filter((y) => y.clearanceRate !== null);
  const peakClearance =
    publishedClearance.length > 0
      ? publishedClearance.reduce((a, b) => (b.clearanceRate >= a.clearanceRate ? b : a))
      : null;
  const clearanceDrop =
    peakClearance && lastCrime.clearanceRate !== null
      ? `${(((peakClearance.clearanceRate - lastCrime.clearanceRate) / peakClearance.clearanceRate) * 100).toFixed(1)}%`
      : "0.0%";

  const contexts = {};

  if (crimeYears.length > 0 && firstCrime && lastCrime && peakCrime) {
    const categoryParts = [
      ["property", lastCrime.propertyPer1000],
      ["traffic", lastCrime.trafficPer1000],
      ["destruction", lastCrime.destructionPer1000],
      ["violence", lastCrime.violencePer1000],
      ["other", lastCrime.otherPer1000],
    ]
      .filter(([, v]) => v !== null)
      .map(([label, v], i) => `${label} ${v}${i === 0 ? " per 1,000" : ""}`);
    contexts.vanishingCrime = [
      "Title: The vanishing crime",
      `Shows: an area chart of registered crimes per 1,000 inhabitants of the Netherlands, ${firstCrime.year} to ${lastCrime.year}, with gaps where CBS suppressed the category breakdown.`,
      "Population: rates are per 1,000 inhabitants of the Netherlands; the counts are registered crimes (misdrijven) from CBS StatLine table 83723NED.",
      NUMERALS_GUIDANCE,
      firstCrime.total !== null
        ? `${firstCrime.year}: ${format(firstCrime.total)} registered crimes, ${firstCrime.totalPer1000} per 1,000 inhabitants.`
        : null,
      peakCrime && peakCrime.total !== null
        ? `Peak year ${peakCrime.year}: ${format(peakCrime.total)} registered crimes, ${peakCrime.totalPer1000} per 1,000 inhabitants.`
        : null,
      lastCrime.total !== null
        ? `${lastCrime.year}: ${format(lastCrime.total)} registered crimes, ${lastCrime.totalPer1000} per 1,000 inhabitants, ${crimeDrop} below the ${peakCrime.year} peak.`
        : null,
      categoryParts.length > 0
        ? `${lastCrime.year} categories: ${categoryParts.join(", ")}.`
        : null,
      `Guidance: state the drop from the ${peakCrime.year} peak as a percentage; property crime is the largest category.`,
    ]
      .filter(Boolean)
      .join("\n");

    if (peakClearance) {
      contexts.clearance = [
        "Title: The clearance paradox",
        `Shows: two lines from ${firstCrime.year} to ${lastCrime.year}, registered crimes per 1,000 inhabitants and the solved share of registered crimes, on separate axes.`,
        "Population: the solved share is the share of that year's registered crimes cleared by police.",
        NUMERALS_GUIDANCE,
        `Crime peak ${peakCrime.year}: ${peakCrime.totalPer1000} per 1,000 inhabitants; ${lastCrime.year}: ${lastCrime.totalPer1000} per 1,000, ${crimeDrop} below the peak.`,
        `Solved-share peak ${peakClearance.year}: ${peakClearance.clearanceRate}%; ${lastCrime.year} solved share: ${lastCrime.clearanceRate}%.`,
        `Clearance drop: ${clearanceDrop} below the ${peakClearance.year} peak.`,
        "Guidance: both lines fall; state both drops as percentages.",
      ].join("\n");
    }
  }

  if (suspects.byOffence.length > 0) {
    const dockLines = dockRows
      .filter((r) => r.count !== null)
      .map((r, i) =>
        i === 0
          ? `${r.label}: ${format(r.count)} suspects (${share(r.count, shownTotal)} of the categories shown).`
          : `${r.label}: ${format(r.count)} (${share(r.count, shownTotal)}).`,
      );
    contexts.dock = [
      "Title: Who is in the dock",
      `Shows: horizontal bars of registered suspects by offence category, ${suspects.year}; a suspect can appear under several categories, so the bars do not sum to the total of registered suspects.`,
      `Population: shares on this chart are shares of the categories shown, never shares of all suspects; the bars do not sum to the ${format(dockTotal)} registered suspects of ${suspects.year}.`,
      NUMERALS_GUIDANCE,
      `Registered suspects ${suspects.year}: ${format(dockTotal)} (${dockRate} per 10,000 inhabitants).`,
      ...dockLines,
      'Guidance: phrase every share as "of the categories shown"; name the largest category.',
    ].join("\n");
  }

  if (justiceYears.length > 0) {
    const sanctionLine = (y) =>
      `${y.year}: ${format(y.sanctionsTotal ?? 0)} principal sanctions: ${format(y.prison ?? 0)} prison (${share(y.prison ?? 0, y.sanctionsTotal ?? 0)}), ${format(y.communityService ?? 0)} community service (${share(y.communityService ?? 0, y.sanctionsTotal ?? 0)}), ${format(y.fine ?? 0)} fines (${share(y.fine ?? 0, y.sanctionsTotal ?? 0)}).`;
    contexts.courtroom = [
      "Title: The invisible courtroom",
      `Shows: 100% stacked bars of prosecutor (Openbaar Ministerie) decisions, ${firstJustice.year} to ${lastJustice.year}, seven categories; the summons is the route into a courtroom.`,
      "Population: shares are of all prosecutor decisions in that year, from CBS StatLine table 83944NED.",
      NUMERALS_GUIDANCE,
      `${lastJustice.year}: ${format(lastJustice.omTotal ?? 0)} prosecutor decisions, of which ${format(lastJustice.summons ?? 0)} summons (${share(lastJustice.summons ?? 0, lastJustice.omTotal ?? 0)}).`,
      `${firstJustice.year}: ${format(firstJustice.omTotal ?? 0)} decisions, of which ${format(firstJustice.summons ?? 0)} summons (${share(firstJustice.summons ?? 0, firstJustice.omTotal ?? 0)}).`,
      `Court verdicts ${lastJustice.year}: ${format(lastJustice.verdictTotal ?? 0)}, a subset of the decisions.`,
      `Guidance: the summons share is the story; state its ${lastJustice.year} share and the direction against ${firstJustice.year}.`,
    ].join("\n");

    contexts.funnel = [
      "Title: The absorption funnel",
      `Shows: bars of what happens to registered crimes in ${lastJustice.year}, per 100 crimes; four stages, every stage divided by the same denominator.`,
      `Population: the denominator is the ${format(funnelDenom ?? 0)} registered crimes of ${lastJustice.year}; per-100 values are rounded to whole persons.`,
      NUMERALS_GUIDANCE,
      `Suspect registration: ${format(funnelAbs.suspect ?? 0)} (${stage(funnelAbs.suspect)} per 100 registered crimes).`,
      `Summons: ${format(funnelAbs.summons ?? 0)} (${stage(funnelAbs.summons)} per 100).`,
      `Conviction: ${format(funnelAbs.conviction ?? 0)} (${stage(funnelAbs.conviction)} per 100).`,
      `Prison term: ${format(funnelAbs.prison ?? 0)} (${stage(funnelAbs.prison)} per 100).`,
      "Guidance: state the stages as per-100 figures; a conviction is a guilty verdict with or without a sanction.",
    ].join("\n");

    contexts.sanctions = [
      "Title: The sanction shift",
      `Shows: 100% stacked bars of principal sanctions imposed by Dutch courts, ${firstJustice.year} to ${lastJustice.year}.`,
      "Population: shares are of all principal sanctions in that year.",
      NUMERALS_GUIDANCE,
      sanctionLine(lastJustice),
      sanctionLine(firstJustice),
      `Guidance: the fine share collapsed while community service rose; state both the ${lastJustice.year} and ${firstJustice.year} shares.`,
    ].join("\n");
  }

  if (suspects.byAge.length > 0) {
    contexts.catch = [
      "Title: Who the system tends to catch",
      "Shows: cards of registered suspects by age, sex, education, income, recidivism and prior detention; the reader can switch between each group's share of the suspects and the published rates per 10,000 of the group's own population. The background and generation card is currently hidden.",
      "Population: age, sex, education and income rates are per 10,000 of each group's own population; recidivism rates are per 10,000 of all residents; the detention figure is a share of all detainees.",
      NUMERALS_GUIDANCE,
      `Registered suspects ${suspects.year}: ${format(dockTotal)} (${dockRate} per 10,000 inhabitants).`,
      men && women && men.count !== null && women.count !== null
        ? `Men: ${format(men.count)} suspects (${share(men.count, dockTotal)} of suspects, ${men.per10000} per 10,000 of their own population); women: ${format(women.count)} (${share(women.count, dockTotal)}, ${women.per10000} per 10,000).`
        : null,
      highestAge && largestAge
        ? `Ages ${suspects.year}: ${ageCopy(highestAge)} has the highest rate at ${highestAge.per10000} per 10,000 (${format(highestAge.count)} suspects); ${ageCopy(largestAge)} is the largest group with ${format(largestAge.count)} suspects (${share(largestAge.count, dockTotal)} of suspects, ${largestAge.per10000} per 10,000).`
        : null,
      eduTotal && eduUnknown && eduTotal.count !== null && eduUnknown.count !== null
        ? `Education ${edu.educationYear}: ${format(eduTotal.count)} suspects, of which ${format(eduUnknown.count)} (${share(eduUnknown.count, eduTotal.count)}) have an unknown education level.`
        : null,
      incomeBelow && incomeAbove
        ? `Income ${edu.incomeYear}: below the low-income threshold ${incomeBelow.per10000} per 10,000 (${format(incomeBelow.count ?? 0)} suspects); above it ${incomeAbove.per10000} per 10,000 (${format(incomeAbove.count ?? 0)} suspects).`
        : null,
      recYear !== null && recTotal && recRepeat && recFirst
        ? `Recidivism ${recYear}: ${format(recRepeat.count ?? 0)} repeat offenders (${share(recRepeat.count ?? 0, recTotal.count ?? 0)} of the ${format(recTotal.count ?? 0)} suspects of that year, ${recRepeat.per10000} per 10,000 residents) versus ${format(recFirst.count ?? 0)} first offenders (${recFirst.per10000} per 10,000).`
        : null,
      detTotal && detPrevious && detTotal.count !== null && detPrevious.count !== null
        ? `Detention ${detainees.year}: ${format(detPrevious.count)} of ${format(detTotal.count)} detainees (${share(detPrevious.count, detTotal.count)}) had been detained before.`
        : null,
      "Guidance: shares of suspects are of the card's own total row; rates always name their denominator. Never mention the hidden background card.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (stockYears.length > 0) {
    contexts.jail = [
      "Title: The jail snapshot",
      `Shows: stacked bars of detainees in Dutch prisons on 30 September by remaining sentence duration, ${firstStock.year} to ${lastStock.year}, plus the legal status and age composition of the ${stock.year} stock and the cost of a detention year.`,
      `Population: the stock counts persons present on 30 September of each year, not annual flows; costs come from the DJI ${costs.provenance.document} (${costs.provenance.version}, data year ${costs.provenance.dataYear}).`,
      NUMERALS_GUIDANCE,
      `${firstStock.year}: ${format(firstStockTotal ?? 0)} detainees; ${lastStock.year}: ${format(lastStockTotal ?? 0)} (${stockDrop} below ${firstStock.year}).`,
      `${lastStock.year} severity: 3 years or longer ${format(lastStock["A048443"] ?? 0)} (${share(lastStock["A048443"] ?? 0, lastStockTotal ?? 0)}); less than 1 month ${format(lastStock["A048439"] ?? 0)} (${share(lastStock["A048439"] ?? 0, lastStockTotal ?? 0)}).`,
      `Legal status ${stock.year}: ${format(legalPrison?.count ?? 0)} prison sentences (${share(legalPrison?.count ?? 0, legalTotal ?? 0)}), ${format(legalPrelim?.count ?? 0)} in preliminary detention (${share(legalPrelim?.count ?? 0, legalTotal ?? 0)}).`,
      `Cost: ${costs.costPerDetaineePerDayEur.regular} euro per detainee per day in the regular regime, ${format(costs.costPerDetaineePerYearEur.regular)} euro per year (derived).`,
      "Guidance: state the stock drop and the long-sentenced share.",
    ].join("\n");
  }

  if (rates.length > 0 && nl.ratePer100k !== null && highestRate) {
    contexts.europe = [
      "Title: Europe's empty cells",
      `Shows: ranked bars of persons held in prison per 100,000 inhabitants across the ${rates.length} Eurostat reporting countries of the dataset, ${europe.year}, with the Netherlands highlighted.`,
      `Population: rates are per 100,000 inhabitants of each country; the Netherlands figures are its ${nl.year} count, capacity and occupancy.`,
      NUMERALS_GUIDANCE,
      `Netherlands: ${nl.ratePer100k} per 100,000 (${nl.year}), ${ordinal(rank)} of the ${rates.length} countries; only ${lowerList} sit lower.`,
      `Highest: ${highestRate.label} ${highestRate.rate} per 100,000.`,
      `Netherlands capacity: ${format(nl.capacity ?? 0)} places, ${format(nl.held ?? 0)} persons held, ${occupancy} occupancy (derived).`,
      "Guidance: state the Netherlands' position among the countries and its occupancy.",
    ].join("\n");
  }

  return contexts;
}

/*
  Figure validation. Every number in the returned text must match a
  figure from the provided context, compared numerically so formatted
  variants (12,212,370 and 12212370) are equal. A narration containing
  one unknown figure is rejected in full; it is not rewritten.
*/
const NUMBER_PATTERN = /\d[\d,]*(?:\.\d+)?/g;

export function extractNumbers(text) {
  return [...text.matchAll(NUMBER_PATTERN)].map((match) =>
    Number.parseFloat(match[0].replace(/,/g, "")),
  );
}

/*
  Prose-ratio lint. A share phrased as a prose ratio ("one in twelve",
  "six out of ten", "half of all") carries no numerals, so the figure
  check below cannot see it and could not reject it. Any of these
  patterns, case-insensitive, fails validation and the narration is
  treated like one with a hallucinated number: one retry, then the
  block is hidden. Percentages with numerals ("17.0%") remain the
  sanctioned form.
*/
const PROSE_RATIO_PATTERN =
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\s+in\b|\bin\s+a\s+hundred\b|\bout\s+of\s+ten\b|\bout\s+of\s+every\b|\bhalf\s+of\s+all\b/i;

export function validateNarration(text, context) {
  if (!text) return false;
  if (PROSE_RATIO_PATTERN.test(text)) return false;
  const allowed = new Set(extractNumbers(context));
  return extractNumbers(text).every((figure) => allowed.has(figure));
}

/*
  One Mistral chat completion. The key is used here and nowhere else;
  failure surfaces carry the HTTP status only, never the key.
  Exported so scripts/narrate-existing.mjs can wrap it with a call
  counter; the snapshot pipeline uses it through narrate() unchanged.
*/
export async function callMistral(apiKey, context) {
  const response = await fetch(MISTRAL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: context },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`Mistral API failed (${response.status})`);
  }
  const data = await response.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

/*
  Signature gating, per visual: a visual's signature is the SHA-256 of
  its own context, and the context embeds that visual's exact
  aggregates, so every data change flows into the hash. Reuse is per
  visual: a narration stored under the visual's current signature
  already describes the chart on screen, so it is kept without a call,
  while a visual whose signature changed (or that is missing from the
  stored set: newly added, or failed last run) is narrated again. A
  complete set under unchanged contexts makes no call at all.
*/
export function visualSignature(context) {
  return createHash("sha256").update(context).digest("hex");
}

/**
 * Narrates the nine visuals of a fresh snapshot.
 *
 * @param {object} snapshot the freshly aggregated snapshot, without a
 *   narration field yet.
 * @param {object|null} existing the narration object of the previous
 *   snapshot.json, or null when there is none.
 * @param {object} [options] test seams: `apiKey` overrides the
 *   environment, `callMistral` replaces the API call, `maxCalls`
 *   overrides the run budget.
 * @returns {Promise<object|null>} the narration object to store in
 *   snapshot.json (the insight text per visual, each under its own
 *   context signature), or null when there is nothing to store.
 */
export async function narrate(snapshot, existing, options = {}) {
  const apiKey = (options.apiKey ?? process.env.MISTRAL_API_KEY ?? "").trim();
  // Fail-soft: without a key (plain push build, local run) narration is
  // skipped entirely and any existing narrations are left untouched.
  if (!apiKey) return existing ?? null;

  const contexts = visualContexts(snapshot);
  const call = options.callMistral ?? callMistral;
  const budget = { left: options.maxCalls ?? MAX_CALLS_PER_RUN };
  // Narrations stored under a visual's current signature are reused as
  // they are; only visuals with a changed or missing signature are
  // narrated.
  const storedVisuals = existing?.visuals ?? {};
  const storedSignatures = existing?.signatures ?? {};

  const visuals = {};
  const signatures = {};
  for (const key of Object.keys(contexts)) {
    const signature = visualSignature(contexts[key]);
    let text =
      storedSignatures[key] === signature ? storedVisuals[key] ?? null : null;
    // At most two calls per visual, never a loop, and never past the
    // run-wide budget.
    for (let attempt = 0; !text && attempt < MAX_CALLS_PER_VISUAL; attempt++) {
      if (budget.left <= 0) break;
      budget.left -= 1;
      try {
        const candidate = await call(apiKey, contexts[key]);
        if (validateNarration(candidate, contexts[key])) {
          text = candidate;
        }
      } catch {
        // A failed call consumes the attempt; the visual is simply not
        // narrated this run when the retry also fails.
      }
    }
    if (!text) {
      // Staleness guard: when no narration could be generated for the
      // new context, the previous text is not kept blindly. It is
      // revalidated against the new context's figures with the same
      // numeric comparison used at generation time, and kept only if
      // every figure it cites is still present. Otherwise the visual
      // gets no narration this run: an insight block must never sit
      // beside a chart whose aggregates no longer match its figures.
      const previous = storedVisuals[key] ?? null;
      if (previous && validateNarration(previous, contexts[key])) {
        text = previous;
      }
    }
    if (text) {
      visuals[key] = text;
      signatures[key] = signature;
    }
  }

  return { visuals, signatures };
}

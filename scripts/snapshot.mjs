/*
  Snapshot job for the Dutch Courtroom Explorer.

  Machine-fetches the CBS StatLine OData v3 tables and the Eurostat
  crim_pris_cap dataset (both keyless) and writes the result to
  src/data/snapshot.json, byte-stable formatted. One manual block
  (the DJI infographic figures) is committed by hand below, each
  value labeled with its source. Suppressed CBS cells (".") arrive
  as null and are stored as null, never as zero.

  Usage: node scripts/snapshot.mjs
*/

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  narrate,
  visualContexts,
  visualSignature,
  validateNarration,
} from "./narration.mjs";

const CBS = "https://opendata.cbs.nl/ODataApi/odata";
const EUROSTAT =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/crim_pris_cap?format=JSON&lang=EN";

const CBS_LICENSE = "CC-BY 4.0";
const CBS_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const EUROSTAT_LICENSE = "Eurostat reuse policy";
const EUROSTAT_LICENSE_URL =
  "https://ec.europa.eu/eurostat/about-us/policies/copyright";
const EUROSTAT_PAGE =
  "https://ec.europa.eu/eurostat/databrowser/view/crim_pris_cap/default/table";

const REQUEST_TIMEOUT_MS = 30000;
const REQUEST_RETRIES = 2;
const RETRY_BACKOFF_MS = [1000, 4000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  let lastError = null;
  for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_BACKOFF_MS[attempt - 1]);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

/*
  CBS OData helpers. TypedDataSet rows carry typed measure values
  (null for suppressed "." cells). Pagination, if any, is followed
  through odata.nextLink.
*/
async function cbsRows(table, { filter, select } = {}) {
  const params = new URLSearchParams();
  if (select) params.set("$select", select.join(","));
  if (filter) params.set("$filter", filter);
  let url = `${CBS}/${table}/TypedDataSet?${params.toString()}`;
  const rows = [];
  for (;;) {
    const page = await fetchJson(url);
    // Dimension keys arrive space-padded; normalize to the trimmed key.
    rows.push(...page.value.map((r) => Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]),
    )));
    url = page["odata.nextLink"] ?? null;
    if (!url) break;
  }
  return rows;
}

async function cbsDimension(table, dimension) {
  const url = `${CBS}/${table}/${encodeURIComponent(dimension)}?$select=Key,Title`;
  const page = await fetchJson(url);
  return page.value.map((c) => ({ key: c.Key, title: c.Title }));
}

async function cbsTableInfo(table) {
  const page = await fetchJson(`${CBS}/${table}/TableInfos`);
  const info = page.value[0] ?? {};
  return {
    title: info.Title ?? table,
    period: info.Period ?? null,
    page: `https://statline.cbs.nl/#/nl-nl/results/${table}`,
  };
}

async function cbsPeriods(table) {
  const page = await fetchJson(
    `${CBS}/${table}/Perioden?$select=Key,Title`,
  );
  return page.value.map((c) => ({ key: c.Key, title: c.Title }));
}

const yearOf = (key) => Number(key.slice(0, 4));

/*
  Dimension keys are space-padded in the stored rows, so exact-eq
  filters miss them; startswith on the trimmed key matches reliably.
*/
const dimEq = (dim, key) => `startswith(${dim},'${key}')`;

function cbsProvenance(table, retrievedAt, info) {
  return {
    source: "CBS StatLine",
    table,
    title: info.title,
    page: info.page,
    license: CBS_LICENSE,
    licenseUrl: CBS_LICENSE_URL,
    retrievedAt,
  };
}

/* ------------------------------------------------------------------ */
/* Table 83723NED: registered crime, 1948-2025                        */
/* ------------------------------------------------------------------ */

const CRIME_MEASURES = [
  "MisdrijvenTotaal_1",
  "Geweldsmisdrijven_2",
  "Vermogensmisdrijven_3",
  "VernielingenMisdrOpenbOrdeGezag_4",
  "Verkeersmisdrijven_5",
  "OverigeMisdrijven_6",
  "MisdrijvenTotaal_7",
  "Geweldsmisdrijven_8",
  "Vermogensmisdrijven_9",
  "VernielingenMisdrOpenbOrdeGezag_10",
  "Verkeersmisdrijven_11",
  "OverigeMisdrijven_12",
  "TotaalOpgehelderdeMisdrijven_13",
  "OpgehelderdeMisdrijvenRelatief_14",
  "TotaalRegistratiesVanVerdachten_15",
  "TotaalMannelijkeVerdachten_16",
  "TotaalVrouwelijkeVerdachten_17",
  "TotaalMeerderjarigeVerdachten_18",
  "TotaalMinderjarigeVerdachten_21",
];

async function fetchCrime(retrievedAt, info) {
  const rows = await cbsRows("83723NED", {
    select: ["Perioden", ...CRIME_MEASURES],
  });
  const years = rows
    .map((r) => ({
      year: yearOf(r.Perioden),
      total: r.MisdrijvenTotaal_1,
      violence: r.Geweldsmisdrijven_2,
      property: r.Vermogensmisdrijven_3,
      destruction: r.VernielingenMisdrOpenbOrdeGezag_4,
      traffic: r.Verkeersmisdrijven_5,
      other: r.OverigeMisdrijven_6,
      totalPer1000: r.MisdrijvenTotaal_7,
      violencePer1000: r.Geweldsmisdrijven_8,
      propertyPer1000: r.Vermogensmisdrijven_9,
      destructionPer1000: r.VernielingenMisdrOpenbOrdeGezag_10,
      trafficPer1000: r.Verkeersmisdrijven_11,
      otherPer1000: r.OverigeMisdrijven_12,
      cleared: r.TotaalOpgehelderdeMisdrijven_13,
      clearanceRate: r.OpgehelderdeMisdrijvenRelatief_14,
      suspectRegistrations: r.TotaalRegistratiesVanVerdachten_15,
      suspectsMale: r.TotaalMannelijkeVerdachten_16,
      suspectsFemale: r.TotaalVrouwelijkeVerdachten_17,
      suspectsAdult: r.TotaalMeerderjarigeVerdachten_18,
      suspectsMinor: r.TotaalMinderjarigeVerdachten_21,
    }))
    .sort((a, b) => a.year - b.year);
  return { provenance: cbsProvenance("83723NED", retrievedAt, info), years };
}

/* ------------------------------------------------------------------ */
/* Table 81947NED: suspects by offence, age, sex, background          */
/* ------------------------------------------------------------------ */

const SUSPECT_OFFENCES = [
  ["TotaalVermogensmisdrijven_2", "property", "Property offences"],
  ["Winkeldiefstal_10", "shoplifting", "Shoplifting"],
  ["TotaalGeweldsmisdrijven_19", "violence", "Violence"],
  ["TotaalVerkeersmisdrijven_23", "traffic", "Traffic offences"],
  ["RijdenOnderInvloed_25", "dui", "Driving under influence"],
  ["VerdachtenVanDrugsmisdrijven_26", "drugs", "Drug offences"],
  ["SeksueelMisdrijf_22", "sexualOffences", "Sexual offences"],
];

/*
  Offence subcategories of the group totals, from the same table and
  the same totals row: no new HTTP source. Children are not additive
  parts of the group (they overlap and leave a remainder); where a
  child is itself one of the top-level bars (shoplifting, driving
  under influence, sexual offences), the bar carries childIncludedIn
  naming the group or child that already contains it.
*/
const SUSPECT_OFFENCE_CHILDREN = {
  property: [
    ["DiefstalVerduisteringEnInbraak_3", "theftBurglary", "Theft and burglary"],
  ],
  violence: [
    ["Mishandeling_20", "assault", "Assault"],
    ["BedreigingEnStalking_21", "threatsStalking", "Threats and stalking"],
    ["SeksueelMisdrijf_22", "sexualOffences", "Sexual offences"],
  ],
  traffic: [
    ["VerlatenPlaatsOngeval_24", "leavingScene", "Leaving the scene of an accident"],
    ["RijdenOnderInvloed_25", "dui", "Driving under influence"],
  ],
};

const CHILD_INCLUDED_IN = {
  shoplifting: "theftBurglary",
  dui: "traffic",
  sexualOffences: "violence",
};

const SUSPECT_OFFENCE_MEASURES = [
  ...new Set([
    ...SUSPECT_OFFENCES.map(([m]) => m),
    ...Object.values(SUSPECT_OFFENCE_CHILDREN)
      .flat()
      .map(([m]) => m),
  ]),
];

const SEX_TOTAL = "T001038";
const AGE_TOTAL = "10000";
const BACKGROUND_TOTAL = "T001040";

async function fetchSuspects(retrievedAt, info) {
  const periods = await cbsPeriods("81947NED");
  const latest = periods[periods.length - 1];

  // Full latest-year cross of sex x age x background, counts and
  // per-10,000 rates of all registered suspects.
  const cross = await cbsRows("81947NED", {
    filter: `Perioden eq '${latest.key}'`,
    select: [
      "Geslacht",
      "Leeftijd",
      "Migratieachtergrond",
      "TotaalVerdachtenVanMisdrijven_1",
      "TotaalVerdachtenVanMisdrijven_28",
    ],
  });

  const pick = (rows, fixed, vary) =>
    rows
      .filter((r) =>
        Object.entries(fixed).every(([dim, key]) => r[dim] === key),
      )
      .map((r) => ({
        key: r[vary],
        count: r.TotaalVerdachtenVanMisdrijven_1,
        per10000: r.TotaalVerdachtenVanMisdrijven_28,
      }));

  const bySex = pick(cross, { Leeftijd: AGE_TOTAL, Migratieachtergrond: BACKGROUND_TOTAL }, "Geslacht");
  const byAge = pick(cross, { Geslacht: SEX_TOTAL, Migratieachtergrond: BACKGROUND_TOTAL }, "Leeftijd");
  const byBackground = pick(cross, { Geslacht: SEX_TOTAL, Leeftijd: AGE_TOTAL }, "Migratieachtergrond");

  // Offence composition, all dimensions at their total: the group
  // bars plus their subcategory children from the same totals row.
  const offenceRow = await cbsRows("81947NED", {
    filter: [
      `Perioden eq '${latest.key}'`,
      dimEq('Geslacht',SEX_TOTAL),
      dimEq('Leeftijd',AGE_TOTAL),
      dimEq('Migratieachtergrond',BACKGROUND_TOTAL),
    ].join(" and "),
    select: ["Perioden", ...SUSPECT_OFFENCE_MEASURES],
  });
  const byOffence = SUSPECT_OFFENCES.map(([measure, key, label]) => ({
    key,
    label,
    count: offenceRow[0]?.[measure] ?? null,
  }));
  const childLabels = new Map(
    Object.values(SUSPECT_OFFENCE_CHILDREN)
      .flat()
      .map(([, key, label]) => [key, label]),
  );
  for (const [measure, key, label] of SUSPECT_OFFENCES) {
    childLabels.set(key, label);
  }
  for (const row of byOffence) {
    const children = SUSPECT_OFFENCE_CHILDREN[row.key];
    if (children) {
      row.children = children.map(([measure, key, label]) => ({
        key,
        label,
        count: offenceRow[0]?.[measure] ?? null,
      }));
    }
    const includedIn = CHILD_INCLUDED_IN[row.key];
    if (includedIn) {
      row.childIncludedIn = { key: includedIn, label: childLabels.get(includedIn) ?? includedIn };
    }
  }

  const dims = {
    Geslacht: await cbsDimension("81947NED", "Geslacht"),
    Leeftijd: await cbsDimension("81947NED", "Leeftijd"),
    Migratieachtergrond: await cbsDimension("81947NED", "Migratieachtergrond"),
  };
  const withTitles = (rows, dim) =>
    rows.map((r) => ({
      ...r,
      title: dims[dim].find((c) => c.key === r.key)?.title ?? r.key,
    }));

  return {
    provenance: cbsProvenance("81947NED", retrievedAt, info),
    year: yearOf(latest.key),
    bySex: withTitles(bySex, "Geslacht"),
    byAge: withTitles(byAge, "Leeftijd"),
    byBackground: withTitles(byBackground, "Migratieachtergrond"),
    byOffence,
  };
}

/* ------------------------------------------------------------------ */
/* Table 85658NED: suspects by education and household income         */
/* ------------------------------------------------------------------ */

async function fetchEducationIncome(retrievedAt, info) {
  // The education and income breakdowns are suppressed in the newest
  // year(s); fetch every year and keep the latest year whose breakdown
  // is published (non-null), so the card shows real figures and its
  // own data-currency line.
  const base = [
    dimEq('Geslacht',SEX_TOTAL),
    dimEq('Leeftijd',AGE_TOTAL),
    dimEq('Geboorteland','T001638'),
    dimEq('Herkomst','T001040'),
  ];
  const select = [
    "Perioden",
    "TotaalVerdachtenVanMisdrijven_1",
    "TotaalVerdachtenVanMisdrijven_8",
  ];

  const educationRows = await cbsRows("85658NED", {
    filter: [...base, dimEq('Huishoudensinkomen','T001164')].join(" and "),
    select: ["Opleiding", ...select],
  });
  const incomeRows = await cbsRows("85658NED", {
    filter: [...base, dimEq('Opleiding','T001143')].join(" and "),
    select: ["Huishoudensinkomen", ...select],
  });

  const dims = {
    Opleiding: await cbsDimension("85658NED", "Opleiding"),
    Huishoudensinkomen: await cbsDimension("85658NED", "Huishoudensinkomen"),
  };

  const latestYearWithBreakdown = (rows, dim, totalKey) => {
    const years = [...new Set(rows.map((r) => yearOf(r.Perioden)))].sort(
      (a, b) => b - a,
    );
    for (const year of years) {
      const breakdown = rows.filter(
        (r) =>
          yearOf(r.Perioden) === year &&
          r[dim] !== totalKey &&
          r.TotaalVerdachtenVanMisdrijven_1 !== null,
      );
      if (breakdown.length > 0) return year;
    }
    return null;
  };

  const mapRows = (rows, dim, year) =>
    rows
      .filter((r) => yearOf(r.Perioden) === year)
      .map((r) => ({
        key: r[dim],
        count: r.TotaalVerdachtenVanMisdrijven_1,
        per10000: r.TotaalVerdachtenVanMisdrijven_8,
      }))
      .map((r) => ({
        ...r,
        title: dims[dim].find((c) => c.key === r.key)?.title ?? r.key,
      }));

  const educationYear = latestYearWithBreakdown(educationRows, "Opleiding", "T001143");
  const incomeYear = latestYearWithBreakdown(incomeRows, "Huishoudensinkomen", "T001164");
  if (!educationYear || !incomeYear) {
    throw new Error("85658NED: no year with a published education/income breakdown");
  }

  return {
    provenance: cbsProvenance("85658NED", retrievedAt, info),
    educationYear,
    incomeYear,
    byEducation: mapRows(educationRows, "Opleiding", educationYear),
    byIncome: mapRows(incomeRows, "Huishoudensinkomen", incomeYear),
  };
}

/* ------------------------------------------------------------------ */
/* Table 83944NED: prosecution decisions, verdicts, sanctions          */
/* ------------------------------------------------------------------ */

const JUSTICE_MEASURES = [
  "TotaalBeslissingenDoorOM_2",
  "Dagvaarding_3",
  "OproepenTerTerechtzittingNAVVerzet_4",
  "OnvoorwaardelijkSepot_5",
  "VoorwaardelijkBeleidssepot_6",
  "Transactie_7",
  "Strafbeschikking_8",
  "Overig_9",
  "TotaalEindbeslissing_10",
  "SchuldigverklaringMetStraf_11",
  "SchuldigverklaringZonderStraf_12",
  "VrijspraakEnOntslagRechtsvervolging_13",
  "Overig_14",
  "TotaalOpgelegdeSancties_15",
  "GevangenisstrafInclJeugddetentie_17",
  "Geldboete_18",
  "Taakstraf_19",
  "OverigeHoofdstraffen_20",
];

async function fetchJustice(retrievedAt, info) {
  const rows = await cbsRows("83944NED", {
    filter: [
      dimEq('SoortVerdachte','T001310'),
      dimEq('Migratieachtergrond','T001040'),
      dimEq('Leeftijd','10000'),
    ].join(" and "),
    select: ["Perioden", ...JUSTICE_MEASURES],
  });
  const years = rows
    .map((r) => ({
      year: yearOf(r.Perioden),
      omTotal: r.TotaalBeslissingenDoorOM_2,
      summons: r.Dagvaarding_3,
      summonsAfterObjection: r.OproepenTerTerechtzittingNAVVerzet_4,
      unconditionalDismissal: r.OnvoorwaardelijkSepot_5,
      conditionalDismissal: r.VoorwaardelijkBeleidssepot_6,
      transaction: r.Transactie_7,
      penaltyOrder: r.Strafbeschikking_8,
      otherOM: r.Overig_9,
      verdictTotal: r.TotaalEindbeslissing_10,
      guiltyWithSanction: r.SchuldigverklaringMetStraf_11,
      guiltyWithoutSanction: r.SchuldigverklaringZonderStraf_12,
      acquittal: r.VrijspraakEnOntslagRechtsvervolging_13,
      otherVerdict: r.Overig_14,
      sanctionsTotal: r.TotaalOpgelegdeSancties_15,
      prison: r.GevangenisstrafInclJeugddetentie_17,
      fine: r.Geldboete_18,
      communityService: r.Taakstraf_19,
      otherPrincipal: r.OverigeHoofdstraffen_20,
    }))
    .sort((a, b) => a.year - b.year);
  return { provenance: cbsProvenance("83944NED", retrievedAt, info), years };
}

/* ------------------------------------------------------------------ */
/* Table 81997NED: suspects by recidivism, per 10,000                  */
/* ------------------------------------------------------------------ */

async function fetchRecidivism(retrievedAt, info) {
  const rows = await cbsRows("81997NED", {
    filter: [dimEq('Geslacht',SEX_TOTAL), dimEq('Leeftijd',AGE_TOTAL)].join(
      " and ",
    ),
    select: [
      "Perioden",
      "Recidive",
      "TotaalVerdachtenVanMisdrijven_1",
      "VerdachtenPer10000Inwoners_2",
    ],
  });
  const years = rows
    .map((r) => ({
      year: yearOf(r.Perioden),
      recidive: r.Recidive,
      count: r.TotaalVerdachtenVanMisdrijven_1,
      per10000: r.VerdachtenPer10000Inwoners_2,
    }))
    .sort((a, b) => a.year - b.year || a.recidive.localeCompare(b.recidive));
  return { provenance: cbsProvenance("81997NED", retrievedAt, info), years };
}

/* ------------------------------------------------------------------ */
/* Table 81959NED: suspects by background and generation, per 10,000  */
/* ------------------------------------------------------------------ */

const BACKGROUND_KEYS = [
  "T001040",
  "1012600",
  "2012605",
  "2012655",
  "2012657",
  // Unknown migration background: its rate is suppressed by CBS and
  // stays null, but its count closes the background level exactly
  // (Dutch + migration + unknown = all registered suspects).
  "2012659",
];

async function fetchBackgroundGeneration(retrievedAt, info) {
  const periods = await cbsPeriods("81959NED");
  const latest = periods[periods.length - 1];
  const base = [
    `Perioden eq '${latest.key}'`,
    dimEq('Geslacht',SEX_TOTAL),
    dimEq('Leeftijd',AGE_TOTAL),
  ];
  const select = [
    "TotaalVerdachtenVanMisdrijven_1",
    "VerdachtenPer10000Inwoners_3",
  ];

  const backgroundRows = await cbsRows("81959NED", {
    filter: [...base, dimEq('Generatie','T001040')].join(" and "),
    select: ["Migratieachtergrond", ...select],
  });
  const generationRows = await cbsRows("81959NED", {
    filter: [...base, dimEq('Migratieachtergrond','T001040')].join(" and "),
    select: ["Generatie", ...select],
  });

  const dims = {
    Migratieachtergrond: await cbsDimension("81959NED", "Migratieachtergrond"),
    Generatie: await cbsDimension("81959NED", "Generatie"),
  };
  const mapRows = (rows, dim) =>
    rows
      .map((r) => ({
        key: r[dim],
        count: r.TotaalVerdachtenVanMisdrijven_1,
        per10000: r.VerdachtenPer10000Inwoners_3,
      }))
      .map((r) => ({
        ...r,
        title: dims[dim].find((c) => c.key === r.key)?.title ?? r.key,
      }));

  return {
    provenance: cbsProvenance("81959NED", retrievedAt, info),
    year: yearOf(latest.key),
    byBackground: mapRows(backgroundRows, "Migratieachtergrond").filter(
      (r) => BACKGROUND_KEYS.includes(r.key),
    ),
    byGeneration: mapRows(generationRows, "Generatie"),
  };
}

/* ------------------------------------------------------------------ */
/* Table 85836NED: detainees by personal characteristics              */
/* ------------------------------------------------------------------ */

async function fetchDetainees(retrievedAt, info) {
  const periods = await cbsPeriods("85836NED");
  const latest = periods[periods.length - 1];
  const rows = await cbsRows("85836NED", {
    filter: [
      `Perioden eq '${latest.key}'`,
      dimEq('Geslacht',SEX_TOTAL),
      dimEq('Leeftijd',AGE_TOTAL),
      dimEq('Geboorteland','T001638'),
      dimEq('Herkomstland','T001040'),
      dimEq('Opleiding','T001143'),
    ].join(" and "),
    select: ["EerderGedetineerd", "Gedetineerden_1"],
  });
  const dims = await cbsDimension("85836NED", "EerderGedetineerd");
  const byPrevious = rows.map((r) => ({
    key: r.EerderGedetineerd,
    title: dims.find((c) => c.key === r.EerderGedetineerd)?.title ?? r.EerderGedetineerd,
    count: r.Gedetineerden_1,
  }));
  return {
    provenance: cbsProvenance("85836NED", retrievedAt, info),
    year: yearOf(latest.key),
    byPreviousDetention: byPrevious,
  };
}

/* ------------------------------------------------------------------ */
/* Table 85841NED: detainees on 30 September by sentence, status, age */
/* ------------------------------------------------------------------ */

const SENTENCE_DURATION_KEYS = [
  "T001556",
  "A048439",
  "A048440",
  "A048441",
  "A048442",
  "A048443",
  "A048444",
];

async function fetchPrisonStock(retrievedAt, info) {
  const periods = await cbsPeriods("85841NED");
  const latest = periods[periods.length - 1];

  const durationRows = await cbsRows("85841NED", {
    filter: [
      dimEq('Geslacht',SEX_TOTAL),
      dimEq('Leeftijd',AGE_TOTAL),
      dimEq('Misdrijven','T001312'),
      dimEq('Verblijfstitel','T001557'),
    ].join(" and "),
    select: ["Perioden", "Strafduur", "GedetineerdenOp30September_1"],
  });
  const durationDims = await cbsDimension("85841NED", "Strafduur");
  const bySentenceDuration = {};
  for (const r of durationRows) {
    const year = yearOf(r.Perioden);
    bySentenceDuration[year] ??= { year };
    const title =
      durationDims.find((c) => c.key === r.Strafduur)?.title ?? r.Strafduur;
    bySentenceDuration[year][r.Strafduur] = r.GedetineerdenOp30September_1;
    bySentenceDuration[year][`${r.Strafduur}Title`] = title;
  }

  const latestBase = [
    `Perioden eq '${latest.key}'`,
    dimEq('Geslacht',SEX_TOTAL),
    dimEq('Leeftijd',AGE_TOTAL),
    dimEq('Misdrijven','T001312'),
  ];
  const legalStatusRows = await cbsRows("85841NED", {
    filter: [...latestBase, dimEq('Strafduur','T001556')].join(" and "),
    select: ["Verblijfstitel", "GedetineerdenOp30September_1"],
  });
  const ageRows = await cbsRows("85841NED", {
    filter: [
      `Perioden eq '${latest.key}'`,
      dimEq('Geslacht',SEX_TOTAL),
      dimEq('Misdrijven','T001312'),
      dimEq('Strafduur','T001556'),
      dimEq('Verblijfstitel','T001557'),
    ].join(" and "),
    select: ["Leeftijd", "GedetineerdenOp30September_1"],
  });
  const legalStatusDims = await cbsDimension("85841NED", "Verblijfstitel");
  const ageDims = await cbsDimension("85841NED", "Leeftijd");
  const mapRows = (rows, dim, dims) =>
    rows.map((r) => ({
      key: r[dim],
      title: dims.find((c) => c.key === r[dim])?.title ?? r[dim],
      count: r.GedetineerdenOp30September_1,
    }));

  return {
    provenance: cbsProvenance("85841NED", retrievedAt, info),
    years: Object.values(bySentenceDuration).sort((a, b) => a.year - b.year),
    year: yearOf(latest.key),
    byLegalStatus: mapRows(legalStatusRows, "Verblijfstitel", legalStatusDims),
    byAge: mapRows(ageRows, "Leeftijd", ageDims),
    sentenceDurationKeys: SENTENCE_DURATION_KEYS,
  };
}

/* ------------------------------------------------------------------ */
/* Table 84726NED: murder and manslaughter victims                    */
/* ------------------------------------------------------------------ */

async function fetchHomicide(retrievedAt, info) {
  const rows = await cbsRows("84726NED", {
    filter: [dimEq('Geslacht',SEX_TOTAL), dimEq('Kenmerken','10000')].join(" and "),
    select: [
      "Perioden",
      "SlachtoffersMoordEnDoodslag_1",
      "SlachtoffersMoordEnDoodslagRelatief_2",
    ],
  });
  const years = rows
    .map((r) => ({
      year: yearOf(r.Perioden),
      victims: r.SlachtoffersMoordEnDoodslag_1,
      perMillion: r.SlachtoffersMoordEnDoodslagRelatief_2,
    }))
    .sort((a, b) => a.year - b.year);
  return { provenance: cbsProvenance("84726NED", retrievedAt, info), years };
}

/* ------------------------------------------------------------------ */
/* Eurostat crim_pris_cap: prison capacity and persons held            */
/* ------------------------------------------------------------------ */

async function fetchEurope(retrievedAt) {
  const d = await fetchJson(EUROSTAT);
  const idx = Object.fromEntries(
    Object.entries(d.dimension).map(([k, v]) => [
      k,
      v.category?.index ?? {},
    ]),
  );
  const labels = Object.fromEntries(
    Object.entries(d.dimension).map(([k, v]) => [
      k,
      v.category?.label ?? {},
    ]),
  );
  const size = d.size;
  const id = d.id;
  const at = (dims) => {
    let flat = 0;
    for (let i = 0; i < id.length; i++) {
      flat = flat * size[i] + (idx[id[i]][dims[id[i]]] ?? 0);
    }
    return d.value[String(flat)] ?? null;
  };

  const years = Object.keys(idx.time).sort();
  const year = years[years.length - 1];

  const ratesPer100k = Object.keys(idx.geo)
    .map((geo) => ({
      country: geo,
      label: labels.geo[geo],
      rate: at({
        freq: "A",
        indic_cr: "PRIS_ACT_CAP",
        unit: "P_HTHAB",
        geo,
        time: year,
      }),
    }))
    .filter((r) => r.rate !== null)
    .sort((a, b) => b.rate - a.rate);

  const netherlands = {
    year: Number(year),
    capacity: at({ freq: "A", indic_cr: "PRIS_OFF_CAP", unit: "NR", geo: "NL", time: year }),
    held: at({ freq: "A", indic_cr: "PRIS_ACT_CAP", unit: "NR", geo: "NL", time: year }),
    ratePer100k: at({ freq: "A", indic_cr: "PRIS_ACT_CAP", unit: "P_HTHAB", geo: "NL", time: year }),
  };

  return {
    provenance: {
      source: "Eurostat",
      dataset: "crim_pris_cap",
      title: "Prison capacity and number of persons held",
      page: EUROSTAT_PAGE,
      license: EUROSTAT_LICENSE,
      licenseUrl: EUROSTAT_LICENSE_URL,
      retrievedAt,
    },
    year: Number(year),
    ratesPer100k,
    netherlands,
  };
}

/* ------------------------------------------------------------------ */
/* Manual block: DJI infographic (committed by hand, with provenance)  */
/* ------------------------------------------------------------------ */

const DJI = {
  provenance: {
    source: "Dienst Justitiële Inrichtingen (DJI)",
    document: "Infographic gevangeniswezen",
    version: "May 2026",
    dataYear: 2025,
    url: "https://www.dji.nl/site/binaries/site-content/collections/documents/2023/05/30/infographic-gevangeniswezen/infographic-gevangeniswezen-2026-definitief.pdf",
    manual: true,
  },
  costPerDetaineePerDayEur: { regular: 435, ppc: 735 },
  // Derived in this script from the per-day figures above: x 365.
  costPerDetaineePerYearEur: {
    regular: 435 * 365,
    ppc: 735 * 365,
    derived: true,
  },
  averageUsableCapacity: {
    value: 9833,
    year: 2025,
    note: "Average usable capacity of the prison system, excluding 20 police cells and rented capacity.",
  },
};

/* ------------------------------------------------------------------ */
/* Assemble and write                                                  */
/* ------------------------------------------------------------------ */

const retrievedAt = new Date().toISOString().slice(0, 10);

console.log(`snapshot: retrievedAt ${retrievedAt}`);

const tables = [
  "83723NED",
  "81947NED",
  "85658NED",
  "83944NED",
  "81997NED",
  "81959NED",
  "85836NED",
  "85841NED",
  "84726NED",
];
const infos = {};
for (const t of tables) {
  infos[t] = await cbsTableInfo(t);
  console.log(`snapshot: table ${t} (${infos[t].title})`);
}

const snapshot = {
  retrievedAt,
  sources: {
    cbs: {
      name: "CBS StatLine",
      url: "https://statline.cbs.nl",
      license: CBS_LICENSE,
      licenseUrl: CBS_LICENSE_URL,
      retrievedAt,
      tables: Object.fromEntries(
        tables.map((t) => [t, { title: infos[t].title, page: infos[t].page }]),
      ),
    },
    eurostat: {
      name: "Eurostat",
      dataset: "crim_pris_cap",
      page: EUROSTAT_PAGE,
      license: EUROSTAT_LICENSE,
      licenseUrl: EUROSTAT_LICENSE_URL,
      retrievedAt,
    },
    dji: DJI.provenance,
  },
  crime: await fetchCrime(retrievedAt, infos["83723NED"]),
  suspects: await fetchSuspects(retrievedAt, infos["81947NED"]),
  educationIncome: await fetchEducationIncome(retrievedAt, infos["85658NED"]),
  justice: await fetchJustice(retrievedAt, infos["83944NED"]),
  recidivism: await fetchRecidivism(retrievedAt, infos["81997NED"]),
  backgroundGeneration: await fetchBackgroundGeneration(retrievedAt, infos["81959NED"]),
  detainees: await fetchDetainees(retrievedAt, infos["85836NED"]),
  prisonStock: await fetchPrisonStock(retrievedAt, infos["85841NED"]),
  homicide: await fetchHomicide(retrievedAt, infos["84726NED"]),
  europe: await fetchEurope(retrievedAt),
  costs: DJI,
};

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/data");
await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, "snapshot.json");

// Narration step: per visual, the previous narration is reused
// whenever that visual's context signature is unchanged, and without
// MISTRAL_API_KEY (plain push build, local run) no call is made and
// the existing narrations are kept. A missing or failed narration
// never fails the snapshot.
let existingNarration = null;
try {
  existingNarration = JSON.parse(await readFile(outFile, "utf8")).narration ?? null;
} catch {
  // First run: no snapshot to reuse a narration from.
}
/*
  Narration progress, per visual, derived from the same exported
  context and signature functions narrate() uses (narrate() itself is
  unchanged). A visual whose stored signature matches its current
  context is kept without any API call; a stale or missing visual is
  regenerated. The key is read from the environment only and is never
  logged, and neither are the contexts (request payloads).
*/
const hasNarrationKey = (process.env.MISTRAL_API_KEY ?? "").trim() !== "";
const narrationContexts = visualContexts(snapshot);
const storedSignatures = existingNarration?.signatures ?? {};
const keptVisuals = [];
const staleVisuals = [];
if (hasNarrationKey) {
  for (const [key, context] of Object.entries(narrationContexts)) {
    if (storedSignatures[key] === visualSignature(context)) {
      keptVisuals.push(key);
    } else {
      staleVisuals.push(key);
    }
  }
}
try {
  snapshot.narration = await narrate(snapshot, existingNarration);
} catch (error) {
  // Fail-soft: an unexpected narration error must never fail the
  // snapshot; the existing narrations stay and this run adds none.
  console.error(`Narration skipped: ${error.message}`);
  snapshot.narration = existingNarration;
}
if (!hasNarrationKey) {
  console.log("narration: no API key, step skipped (0 calls)");
} else {
  for (const key of keptVisuals) {
    console.log(`narration: ${key} signature match, kept (0 calls)`);
  }
  for (const key of staleVisuals) {
    if (snapshot.narration?.visuals?.[key]) {
      console.log(`narration: ${key} stale, generating (call 1)... validated`);
    } else {
      console.log(
        `narration: ${key} stale, generating (call 1)... rejected, retried (call 2)... hidden this run`
      );
    }
  }
}
/*
  Storage shape of the narrations: each visual's text is stored under
  the SHA-256 of its own context, and revalidated against the current
  context figures, so a stored text is kept only when every figure it
  cites is still present — the same rule the staleness guard applies.
  A keyed run therefore re-narrates exactly the visuals whose contexts
  changed and makes no call for the rest.
*/
if (snapshot.narration) {
  const visuals = {};
  const signatures = {};
  for (const [key, context] of Object.entries(narrationContexts)) {
    const text = snapshot.narration.visuals?.[key];
    if (text && validateNarration(text, context)) {
      visuals[key] = text;
      signatures[key] = visualSignature(context);
    }
  }
  snapshot.narration = { visuals, signatures };
}
if (!snapshot.narration) delete snapshot.narration;

await writeFile(outFile, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
console.log(`snapshot: wrote ${outFile} (${snapshot.crime.years.length} crime years, ${snapshot.justice.years.length} justice years)`);
const narrated = Object.keys(snapshot.narration?.visuals ?? {});
console.log(
  snapshot.narration
    ? `narration: ${narrated.length} visual(s) with an insight, each under its own context signature.`
    : "narration: none this run."
);

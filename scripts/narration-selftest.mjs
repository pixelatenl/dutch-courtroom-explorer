/*
  Dry-run harness for the narration module. Exercises the nine justice
  contexts against the committed snapshot, the pure figure validation,
  the per-visual signature gating (reuse, selective re-narration, and
  the staleness guard) and the narrate() budget logic against mock
  Mistral calls. No API key is read and no network call is made.

  Usage: node scripts/narration-selftest.mjs
*/

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  narrate,
  visualContexts,
  visualSignature,
  validateNarration,
  extractNumbers,
} from "./narration.mjs";

let passed = 0;
let total = 0;
const failures = [];

function check(name, condition, detail = "") {
  total += 1;
  if (condition) {
    passed += 1;
    console.log(`ok - ${name}`);
  } else {
    failures.push(name);
    console.error(`not ok - ${name}${detail ? `: ${detail}` : ""}`);
  }
}

const dir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "data",
);
const snapshot = JSON.parse(
  await readFile(path.join(dir, "snapshot.json"), "utf8"),
);
// The data the snapshot job hands to narrate(): no narration field.
const { narration: _narration, ...data } = snapshot;

const KEYS = [
  "vanishingCrime",
  "dock",
  "courtroom",
  "funnel",
  "sanctions",
  "clearance",
  "catch",
  "jail",
  "europe",
];

const signatureOf = (snap, key) =>
  visualSignature(visualContexts(snap)[key]);

// A stored narration set: every visual carries its text and the
// signature of the context that text was validated against.
const storedFor = (snap, textOf) => {
  const set = { visuals: {}, signatures: {} };
  for (const key of KEYS) {
    set.visuals[key] = textOf(key);
    set.signatures[key] = signatureOf(snap, key);
  }
  return set;
};

// Mocks that record every call: one answers, one always fails.
const recorder = (log, respond) => async (_apiKey, context) => {
  log.push(context);
  return respond(log.length);
};
const failing = (log) => async (_apiKey, context) => {
  log.push(context);
  throw new Error("Mistral unavailable");
};

/* The nine contexts against the committed snapshot */

const contexts = visualContexts(data);

check(
  "all nine visual contexts build against the committed snapshot",
  KEYS.every((key) => typeof contexts[key] === "string" && contexts[key].length > 0),
  `keys: ${Object.keys(contexts).join(", ")}`,
);

// Anchor lines per context: the figures the spec fixes for the
// committed snapshot, sampled the way the auditor samples them.
const ANCHORS = {
  vanishingCrime: [
    "1948: 133,255 registered crimes, 14 per 1,000 inhabitants.",
    "Peak year 2002: 1,505,135 registered crimes, 93 per 1,000 inhabitants.",
    "2025: 816,210 registered crimes, 45 per 1,000 inhabitants, 51.6% below the 2002 peak.",
    "2025 categories: property 25 per 1,000, traffic 8, destruction 6, violence 5, other 2.",
  ],
  dock: [
    "Registered suspects 2022: 158,290 (83 per 10,000 inhabitants).",
    "Property offences: 54,030 suspects (24.6% of the categories shown).",
    "Traffic offences: 48,420 (22.0%).",
    "Driving under influence: 37,650 (17.1%).",
    "Violence: 35,500 (16.2%).",
    "Shoplifting: 28,120 (12.8%).",
    "Drug offences: 12,880 (5.9%).",
    "Sexual offences: 3,040 (1.4%).",
  ],
  courtroom: [
    "2022: 185,100 prosecutor decisions, of which 81,620 summons (44.1%).",
    "2001: 259,625 decisions, of which 144,090 summons (55.5%).",
    "Court verdicts 2022: 69,555, a subset of the decisions.",
  ],
  funnel: [
    "the 810,550 registered crimes of 2022",
    "Suspect registration: 264,175 (33 per 100 registered crimes).",
    "Summons: 81,620 (10 per 100).",
    "Conviction: 63,045 (8 per 100).",
    "Prison term: 31,840 (4 per 100).",
  ],
  sanctions: [
    "2022: 97,915 principal sanctions: 31,840 prison (32.5%), 24,500 community service (25.0%), 14,150 fines (14.5%).",
    "2001: 159,625 principal sanctions: 50,075 prison (31.4%), 24,380 community service (15.3%), 48,730 fines (30.5%).",
  ],
  clearance: [
    "Crime peak 2002: 93 per 1,000 inhabitants; 2025: 45 per 1,000, 51.6% below the peak.",
    "Solved-share peak 1954: 75%; 2025 solved share: 22%.",
  ],
  catch: [
    "Registered suspects 2022: 158,290 (83 per 10,000 inhabitants).",
    "Men: 131,350 suspects (83.0% of suspects, 138 per 10,000 of their own population); women: 26,320 (16.6%, 30 per 10,000).",
    "Ages 2022: 18 to 25 has the highest rate at 194 per 10,000 (36,490 suspects); 25 to 45 is the largest group with 70,730 suspects (44.7% of suspects, 121 per 10,000).",
    "Education 2024: 140,240 suspects, of which 38,490 (27.4%) have an unknown education level.",
    "Income 2024: below the low-income threshold 248 per 10,000 (14,400 suspects); above it 58 per 10,000 (84,800 suspects).",
    "Recidivism 2009: 194,270 repeat offenders (66.0% of the 294,140 suspects of that year, 120 per 10,000 residents) versus 99,870 first offenders (56 per 10,000).",
    "Detention 2025: 16,140 of 27,510 detainees (58.7%) had been detained before.",
  ],
  jail: [
    "2005: 15,200 detainees; 2025: 9,700 (36.2% below 2005).",
    "2025 severity: 3 years or longer 1,890 (19.5%); less than 1 month 340 (3.5%).",
    "Legal status 2025: 4,210 prison sentences (43.4%), 4,110 in preliminary detention (42.4%).",
    "Cost: 435 euro per detainee per day in the regular regime, 158,775 euro per year (derived).",
  ],
  europe: [
    "Netherlands: 66.59 per 100,000 (2024), 32nd of the 35 countries; only Norway (60.52), Finland (56.87) and Iceland (35.46) sit lower.",
    "Highest: Türkiye 449.4 per 100,000.",
    "Netherlands capacity: 12,614 places, 11,948 persons held, 94.7% occupancy (derived).",
  ],
};

for (const key of KEYS) {
  check(
    `${key}: context contains its anchor lines`,
    ANCHORS[key].every((anchor) => contexts[key].includes(anchor)),
    ANCHORS[key].filter((a) => !contexts[key].includes(a)).join(" | "),
  );
}

/*
  No foreign figures: every number in every context line must derive
  from the snapshot — it appears in the stringified snapshot data — or
  be a unit expression (100, 1,000, 10,000, 100,000), a small
  structural count (ranks, per-100 stage values, category counts, the
  day of the month), or a fractional figure (a published rate or a
  computed share with toFixed(1)).
*/
const snapshotNumbers = new Set(extractNumbers(JSON.stringify(data)));
const UNITS = new Set([100, 1000, 10000, 100000]);
// Large integers the contexts derive by arithmetic from snapshot
// figures (the funnel conviction sum: guilty with plus without
// sanction), recomputed here from the loaded snapshot.
const lastJusticeYear = data.justice.years[data.justice.years.length - 1];
const derivedIntegers = new Set([
  (lastJusticeYear.guiltyWithSanction ?? 0) +
    (lastJusticeYear.guiltyWithoutSanction ?? 0),
]);
const foreignFigures = [];
for (const key of KEYS) {
  for (const figure of extractNumbers(contexts[key])) {
    if (snapshotNumbers.has(figure)) continue;
    if (UNITS.has(figure)) continue;
    if (derivedIntegers.has(figure)) continue;
    if (Number.isInteger(figure) && figure < 100) continue;
    if (!Number.isInteger(figure)) continue; // published rate or computed share
    foreignFigures.push(`${key}: ${figure}`);
  }
}
check(
  "no context line carries a figure that does not derive from the snapshot",
  foreignFigures.length === 0,
  foreignFigures.join(", "),
);

/* Figure validation */

const context =
  "Peak year 2002: 1,505,135 registered crimes, 93 per 1,000 inhabitants.";

check(
  "extractNumbers treats 1,505,135 and 1505135 as the same figure",
  extractNumbers("1,505,135").join() === extractNumbers("1505135").join(),
);
check(
  "validation accepts every figure from the context, formatted variants included",
  validateNarration(
    "The peak year 2002 saw 1,505,135 registered crimes, or 1505135 unformatted, at 93 per 1,000 inhabitants.",
    context,
  ),
);
check(
  "validation rejects a hallucinated number",
  !validateNarration("The peak year 2002 saw 999,999 registered crimes.", context),
);
check(
  "validation rejects an invented share",
  !validateNarration("A full 42.0% of crimes were solved.", context),
);
check("validation rejects empty text", !validateNarration("", context));

/* Prose-ratio lint */

const dockContext = contexts.dock;

check(
  "validation rejects 'one in twelve' even when every other figure is present",
  !validateNarration(
    "Property offences cover 24.6% of the 219,640 categories shown, but one in twelve suspects is a woman.",
    dockContext,
  ),
);
check(
  "the same text with '16.6%' in place of the ratio passes",
  validateNarration(
    "Men stand at 83.0% of the 158,290 registered suspects, while women stand at 16.6%.",
    contexts.catch,
  ),
);
const ratioPhrases = [
  "one in twelve",
  "two in five",
  "three in ten",
  "four in ten",
  "five in ten",
  "six in ten",
  "seven in ten",
  "eight in ten",
  "nine in ten",
  "ten in ten",
  "one in a hundred",
  "six out of ten",
  "three out of every ten",
  "half of all suspects",
];
check(
  "every prose-ratio pattern fails validation on its own, with no figure to catch it",
  ratioPhrases.every(
    (phrase) => !validateNarration(`The share is ${phrase}.`, dockContext),
  ),
);
check(
  "the prose-ratio lint is case-insensitive",
  !validateNarration("SIX OUT OF TEN suspects are men.", dockContext),
);
check(
  "a percentage with a numeral remains the sanctioned form",
  validateNarration("Men stand at 83.0% of the 158,290 suspects.", contexts.catch),
);

/* Per-visual signature gating */

// A stored narration set, minus one visual that failed to narrate
// last run.
const partial = storedFor(data, (key) => `Narration for ${key}.`);
delete partial.visuals.dock;
delete partial.signatures.dock;

let log = [];
let result = await narrate(data, partial, {
  apiKey: "test-key",
  callMistral: recorder(log, () => "Figure-free narration."),
});
check(
  "unchanged contexts reuse the stored narrations and only narrate the missing visual",
  log.length === 1 &&
    result.visuals.dock === "Figure-free narration." &&
    result.visuals.jail === "Narration for jail." &&
    Object.keys(result.visuals).length === 9 &&
    Object.keys(result.signatures).length === 9,
  `calls: ${log.length}, visuals: ${Object.keys(result.visuals).length}`,
);

const complete = storedFor(data, (key) => `Narration for ${key}.`);

log = [];
result = await narrate(data, complete, {
  apiKey: "test-key",
  callMistral: recorder(log, () => "Figure-free narration."),
});
check(
  "a complete set under unchanged contexts makes no call",
  log.length === 0 &&
    KEYS.every((key) => result.visuals[key] === complete.visuals[key]) &&
    KEYS.every((key) => result.signatures[key] === complete.signatures[key]),
  `calls: ${log.length}`,
);

// Signature stability: the same snapshot produces the same signatures.
check(
  "the same snapshot produces the same signature for every visual",
  KEYS.every((key) => signatureOf(data, key) === signatureOf(structuredClone(data), key)),
);

// The 1948 crime total feeds only the vanishingCrime context.
const changedCrime = structuredClone(data);
changedCrime.crime.years[0].total += 1;
check(
  "editing one crime-year total changes the vanishingCrime signature and only the affected contexts",
  signatureOf(changedCrime, "vanishingCrime") !== signatureOf(data, "vanishingCrime") &&
    KEYS.filter((k) => k !== "vanishingCrime").every(
      (key) => signatureOf(changedCrime, key) === signatureOf(data, key),
    ),
);

log = [];
result = await narrate(changedCrime, complete, {
  apiKey: "test-key",
  callMistral: recorder(log, () => "Figure-free narration."),
});
check(
  "a change to one visual's context re-narrates only that visual",
  log.length === 1 &&
    result.visuals.vanishingCrime === "Figure-free narration." &&
    result.visuals.europe === "Narration for europe." &&
    result.signatures.vanishingCrime ===
      signatureOf(changedCrime, "vanishingCrime") &&
    result.signatures.europe === signatureOf(data, "europe"),
  `calls: ${log.length}`,
);

log = [];
result = await narrate(data, complete, { apiKey: "" });
check(
  "absent key leaves the existing narration untouched and makes no call",
  log.length === 0 && result === complete,
);

log = [];
result = await narrate(data, null, { apiKey: "" });
check(
  "absent key with no existing narration returns null",
  log.length === 0 && result === null,
);

/* Guidance-line gating: the numerals-only guidance is part of every
   context, so a change to that line alone moves all nine signatures. */

const withoutNumeralsGuidance = (context) =>
  context
    .split("\n")
    .filter((line) => !line.includes("prose ratios"))
    .join("\n");

check(
  "every visual context carries the numerals-only guidance line",
  KEYS.every((key) =>
    contexts[key]
      .split("\n")
      .some(
        (line) => line.includes("prose ratios") && line.includes("17.0%"),
      ),
  ),
);
check(
  "a guidance-line-only change moves all nine signatures",
  KEYS.every(
    (key) =>
      visualSignature(contexts[key]) !==
      visualSignature(withoutNumeralsGuidance(contexts[key])),
  ),
);

// A stored set whose signatures were computed without the guidance
// line: the contexts differ by that line alone.
const guidanceOnlyChanged = { visuals: {}, signatures: {} };
for (const key of KEYS) {
  guidanceOnlyChanged.visuals[key] = `Narration for ${key}.`;
  guidanceOnlyChanged.signatures[key] = visualSignature(
    withoutNumeralsGuidance(contexts[key]),
  );
}

log = [];
result = await narrate(data, guidanceOnlyChanged, {
  apiKey: "test-key",
  callMistral: recorder(log, () => "Figure-free narration."),
});
check(
  "a guidance-line-only change regenerates all nine narrations",
  log.length === 9 && Object.keys(result.visuals).length === 9,
  `calls: ${log.length}, visuals: ${Object.keys(result.visuals).length}`,
);

log = [];
const afterRegeneration = await narrate(data, result, {
  apiKey: "test-key",
  callMistral: recorder(log, () => "Never reached."),
});
check(
  "the regenerated set is reused with zero calls on unchanged data",
  log.length === 0 &&
    KEYS.every((key) => afterRegeneration.visuals[key] === result.visuals[key]),
  `calls: ${log.length}`,
);

/* Fresh generation, retry, budget */

log = [];
result = await narrate(data, null, {
  apiKey: "test-key",
  callMistral: recorder(log, () => "A clean, figure-free narration."),
});
check(
  "no existing narration makes one call per visual and narrates all nine",
  log.length === 9 &&
    Object.keys(result.visuals).length === 9 &&
    KEYS.every((key) => result.signatures[key] === signatureOf(data, key)),
  `calls: ${log.length}, visuals: ${Object.keys(result.visuals).length}`,
);

log = [];
result = await narrate(data, null, {
  apiKey: "test-key",
  // Always hallucinates a number, so every attempt fails validation.
  callMistral: recorder(log, () => "Some 999,999 crimes, allegedly."),
});
check(
  "persistent hallucination stops after two calls per visual and stores no narration",
  log.length === 18 &&
    Object.keys(result.visuals).length === 0 &&
    Object.keys(result.signatures).length === 0,
  `calls: ${log.length}`,
);

log = [];
result = await narrate(data, null, {
  apiKey: "test-key",
  // A prose ratio carries no numerals, so only the lint can reject it:
  // dock fails both attempts and is hidden, the rest narrate.
  callMistral: async (_apiKey, callContext) => {
    log.push(callContext);
    return callContext.includes("Title: Who is in the dock")
      ? "Six out of ten suspects are men, and one in twelve is a woman."
      : "A clean, figure-free narration.";
  },
});
check(
  "a prose-ratio narration is rejected, retried once, and hidden when the retry also fails",
  log.length === 10 &&
    !("dock" in result.visuals) &&
    !("dock" in result.signatures) &&
    Object.keys(result.visuals).length === 8,
  `calls: ${log.length}, visuals: ${Object.keys(result.visuals).length}`,
);

log = [];
result = await narrate(data, null, {
  apiKey: "test-key",
  maxCalls: 3,
  callMistral: recorder(log, () => "A clean, figure-free narration."),
});
check(
  "the run-wide budget caps total calls",
  log.length === 3 && Object.keys(result.visuals).length === 3,
  `calls: ${log.length}, visuals: ${Object.keys(result.visuals).length}`,
);

log = [];
result = await narrate(data, null, {
  apiKey: "test-key",
  maxCalls: 5,
  callMistral: failing(log),
});
check(
  "the run-wide budget is respected even when every call fails",
  log.length === 5 && Object.keys(result.visuals).length === 0,
  `calls: ${log.length}`,
);

log = [];
result = await narrate(data, null, {
  apiKey: "test-key",
  // Fails first, succeeds on retry: exactly two calls per visual.
  callMistral: recorder(log, (n) =>
    n % 2 === 1 ? "Some 999,999 crimes." : "A clean narration on retry.",
  ),
});
check(
  "a hallucination retried once succeeds and still honors two calls per visual",
  log.length === 18 && Object.keys(result.visuals).length === 9,
  `calls: ${log.length}, visuals: ${Object.keys(result.visuals).length}`,
);

/* Staleness guard */

// Fixture texts cite figures read from the loaded snapshot itself, so
// the harness keeps passing across data refreshes: the vanishingCrime
// stale text cites the first crime year's total, the kept text the
// latest year's total and rate.
const gb = (value) => value.toLocaleString("en-GB");
const firstCrimeYear = data.crime.years[0];
const lastCrimeYear = data.crime.years[data.crime.years.length - 1];
const staleVanishingText = `In ${firstCrimeYear.year} the police registered ${gb(firstCrimeYear.total)} crimes.`;
check(
  "the vanishingCrime fixture cites a figure the current context carries",
  validateNarration(staleVanishingText, visualContexts(data).vanishingCrime),
);

// The 1948 total changes: the cited figure disappears from the new
// context, and only the vanishingCrime context changes.
const crimeChanged = structuredClone(data);
crimeChanged.crime.years[0].total += 1;
check(
  "the changed crime total leaves the cited figure out of the new context",
  !validateNarration(staleVanishingText, visualContexts(crimeChanged).vanishingCrime),
);

const staleSet = storedFor(data, (key) =>
  key === "vanishingCrime" ? staleVanishingText : `Narration for ${key}.`,
);

log = [];
result = await narrate(crimeChanged, staleSet, {
  apiKey: "test-key",
  callMistral: failing(log),
});
check(
  "a stale narration whose cited figure disappeared is dropped when both attempts fail",
  log.length === 2 &&
    !("vanishingCrime" in result.visuals) &&
    !("vanishingCrime" in result.signatures) &&
    result.visuals.dock === "Narration for dock.",
  `calls: ${log.length}, visuals: ${Object.keys(result.visuals).length}`,
);

// A vanishingCrime narration citing figures that survive a category
// change: the 2025 total and rate stay in the new context.
const keptVanishingText = `In ${lastCrimeYear.year} the police registered ${gb(lastCrimeYear.total)} crimes, ${lastCrimeYear.totalPer1000} per 1,000 inhabitants.`;
const categoryChanged = structuredClone(data);
categoryChanged.crime.years[categoryChanged.crime.years.length - 1].propertyPer1000 += 1;
check(
  "the vanishingCrime fixture keeps every cited figure in the new context",
  validateNarration(keptVanishingText, visualContexts(categoryChanged).vanishingCrime),
);

const keptSet = storedFor(data, (key) =>
  key === "vanishingCrime" ? keptVanishingText : `Narration for ${key}.`,
);

log = [];
result = await narrate(categoryChanged, keptSet, {
  apiKey: "test-key",
  callMistral: failing(log),
});
check(
  "a narration whose figures all survive a context change is kept when both attempts fail",
  log.length === 2 &&
    result.visuals.vanishingCrime === keptVanishingText &&
    result.signatures.vanishingCrime === signatureOf(categoryChanged, "vanishingCrime"),
  `calls: ${log.length}`,
);

log = [];
result = await narrate(categoryChanged, result, {
  apiKey: "test-key",
  callMistral: recorder(log, () => "Never reached."),
});
check(
  "a narration kept by the staleness guard makes no call on the next unchanged run",
  log.length === 0 && result.visuals.vanishingCrime === keptVanishingText,
  `calls: ${log.length}`,
);

log = [];
result = await narrate(categoryChanged, keptSet, {
  apiKey: "test-key",
  maxCalls: 0,
  callMistral: recorder(log, () => "Never reached."),
});
check(
  "with the run budget exhausted a still-valid narration is kept without a call",
  log.length === 0 && result.visuals.vanishingCrime === keptVanishingText,
  `calls: ${log.length}`,
);

log = [];
result = await narrate(crimeChanged, staleSet, {
  apiKey: "test-key",
  maxCalls: 0,
  callMistral: recorder(log, () => "Never reached."),
});
check(
  "with the run budget exhausted a narration citing a vanished figure is dropped without a call",
  log.length === 0 &&
    !("vanishingCrime" in result.visuals) &&
    result.visuals.dock === "Narration for dock.",
  `calls: ${log.length}`,
);

console.log(
  failures.length === 0
    ? `Narration harness: ${passed} of ${total} checks passed.`
    : `Narration harness: ${passed} of ${total} checks passed, ${failures.length} failed.`,
);
process.exit(failures.length === 0 ? 0 : 1);

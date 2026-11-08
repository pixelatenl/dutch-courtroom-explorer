/*
  One-off narration generator for an already committed snapshot.
  Loads src/data/snapshot.json, runs the same narrate() step the
  snapshot job runs at the end of its pipeline against that committed
  data, and writes the resulting narration object back into the file.
  It never fetches anything from CBS, Eurostat or DJI: it narrates the
  committed aggregates only, so a run against an unchanged snapshot
  reuses every stored narration and makes zero calls.

  Usage: MISTRAL_API_KEY=... node scripts/narrate-existing.mjs
  Without the key the script is a no-op: it reports that narration is
  skipped and leaves the file untouched.
*/

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  narrate,
  callMistral,
  visualContexts,
  visualSignature,
} from "./narration.mjs";

const target = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "data",
  "snapshot.json",
);

const raw = await readFile(target, "utf8");
const snapshot = JSON.parse(raw);
const existing = snapshot.narration ?? null;

if (!(process.env.MISTRAL_API_KEY ?? "").trim()) {
  console.log(
    "narrate-existing: no MISTRAL_API_KEY, narration skipped (0 calls); snapshot.json left untouched.",
  );
  process.exit(0);
}

// Call seam that counts every Mistral call the run spends.
let calls = 0;
const counting = async (apiKey, context) => {
  calls += 1;
  return callMistral(apiKey, context);
};

const contexts = visualContexts(snapshot);
const storedSignatures = existing?.signatures ?? {};
const narration = await narrate(snapshot, existing, { callMistral: counting });

if (narration) {
  snapshot.narration = narration;
  await writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

for (const key of Object.keys(contexts)) {
  const signature = visualSignature(contexts[key]);
  if (storedSignatures[key] === signature && existing?.visuals?.[key]) {
    console.log(`narration: ${key} signature match, kept (0 calls)`);
  } else if (narration?.visuals?.[key]) {
    console.log(`narration: ${key} generated, validated, stored`);
  } else {
    console.log(`narration: ${key} not narrated this run, block hidden`);
  }
}
console.log(
  `narrate-existing: wrote ${target}; ${Object.keys(narration?.visuals ?? {}).length} of ${Object.keys(contexts).length} visual(s) narrated, ${calls} Mistral call(s) spent.`,
);

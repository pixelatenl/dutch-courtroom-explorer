# Dutch Courtroom Explorer

Who ends up in a Dutch courtroom, and what happens to them? The third
product of the Pixelate Open Data Project: a single-page explorer that
follows Dutch criminal justice from registered crime through suspects,
prosecutor decisions, verdicts and prison, rendered straight into the
page from open data. Live at [justice.pixelate.nl](https://justice.pixelate.nl).

## Data

All figures are fetched by `scripts/snapshot.mjs` into
`src/data/snapshot.json` (committed), each value carrying provenance:

- **CBS StatLine** (CC-BY 4.0, keyless OData v3): tables 83723NED
  (registered crime 1948 to 2025), 81947NED (suspects by offence, age,
  sex, background), 85658NED (suspects by education and income),
  83944NED (prosecution and adjudication), 81997NED (recidivism),
  81959NED (background and generation), 85836NED (detainee
  characteristics), 85841NED (30 September stock), 84726NED (murder
  and manslaughter victims).
- **Eurostat** (reuse policy): `crim_pris_cap` (prison capacity and
  persons held per country).
- **DJI** (manual block, committed by hand with provenance): cost per
  detainee per day from the Infographic gevangeniswezen (May 2026).

Suppressed CBS cells (".") are stored as null and render as gaps with
a note, never as zero. The snapshot refreshes monthly through the
snapshot workflow; the build workflow exports the static site to the
deploy branch on pushes to main.

## Stack

Next.js App Router static export (`output: "export"`), React 19,
TypeScript, Tailwind CSS v4. Pure SVG and CSS charts, no chart
dependency. The family layer (theme, header, footer, drawer, hero and
section patterns) is consumed from the
[open-data-family](https://github.com/pixelatenl/open-data-family)
registry via the shadcn CLI; do not edit those files in place.

## Develop

```bash
npm ci
npm run dev        # local dev server
npm run snapshot   # refresh src/data/snapshot.json from the sources
npm run build      # static export to out/
npm run typecheck
```

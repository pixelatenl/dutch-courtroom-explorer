/*
  Shared pure-SVG chart helpers. No chart library: scales are plain
  linear functions, ticks are "nice" numbers, and every figure comes
  from the snapshot. Null (suppressed) values stay gaps.
*/

export function linearScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): (value: number) => number {
  if (domainMax === domainMin) return () => (rangeMin + rangeMax) / 2;
  return (value) =>
    rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

/** Nice tick values for a [min, max] domain, roughly `count` of them. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min];
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step =
    norm >= 5 ? 10 * mag : norm >= 2 ? 5 * mag : norm >= 1 ? 2 * mag : mag;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6);
  }
  return ticks;
}

export function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / mag;
  const ceil = norm > 5 ? 10 : norm > 2 ? 5 : norm > 1 ? 2 : 1;
  return ceil * mag;
}

/** SVG path for a line through points, skipping nulls (gaps). */
export function linePath(
  points: { x: number; y: number | null }[],
): string {
  const segments: string[] = [];
  let current: string[] = [];
  for (const p of points) {
    if (p.y === null) {
      if (current.length) segments.push(current.join(" "));
      current = [];
    } else {
      current.push(`${current.length === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`);
    }
  }
  if (current.length) segments.push(current.join(" "));
  return segments.join(" ");
}

/** SVG path for an area under a line down to a baseline. */
export function areaPath(
  points: { x: number; y: number | null }[],
  baselineY: number,
): string {
  const line = linePath(points);
  if (!line) return "";
  const first = points.find((p) => p.y !== null);
  const last = [...points].reverse().find((p) => p.y !== null);
  if (!first || !last) return "";
  return `${line} L${last.x.toFixed(2)},${baselineY} L${first.x.toFixed(2)},${baselineY} Z`;
}

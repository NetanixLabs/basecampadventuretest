/**
 * Small, dependency-free charts for the admin, rendered on the server as SVG.
 * One measure per chart (never two scales), one hue, thin marks with rounded
 * data ends, recessive axes, a hover tooltip on every mark (native <title>),
 * and the numbers always available as a table underneath.
 */
type Point = { label: string; value: number; hint?: string };

const nice = (max: number) => {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= max) return m * p;
  return 10 * p;
};

export function ColumnChart({ data, format, label }: { data: Point[]; format: (n: number) => string; label: string }) {
  const W = 640;
  const H = 220;
  const P = { l: 48, r: 8, t: 12, b: 28 };
  const top = nice(Math.max(...data.map((d) => d.value), 0));
  const cw = (W - P.l - P.r) / Math.max(1, data.length);
  const bw = Math.max(6, Math.min(28, cw - 8));
  const y = (v: number) => P.t + (H - P.t - P.b) * (1 - v / top);
  const ticks = [0, top / 2, top];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--line, #d8e3e6)" strokeWidth="1" strokeDasharray={t ? "3 4" : undefined} />
            <text x={P.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--muted, #6b7478)">{format(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = P.l + i * cw + (cw - bw) / 2;
          const h = Math.max(0, y(0) - y(d.value));
          const r = Math.min(4, bw / 2, h);
          return (
            <g key={d.label}>
              {/* Hit target bigger than the bar */}
              <rect x={P.l + i * cw} y={P.t} width={cw} height={H - P.t - P.b} fill="transparent"><title>{`${d.label}: ${format(d.value)}${d.hint ? ` · ${d.hint}` : ""}`}</title></rect>
              {h > 0 ? <path d={`M${x},${y(0)} V${y(d.value) + r} Q${x},${y(d.value)} ${x + r},${y(d.value)} H${x + bw - r} Q${x + bw},${y(d.value)} ${x + bw},${y(d.value) + r} V${y(0)} Z`} fill="var(--pine, #00788a)" pointerEvents="none" /> : null}
              {i % Math.ceil(data.length / 12) === 0 ? <text x={x + bw / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--muted, #6b7478)">{d.label}</text> : null}
            </g>
          );
        })}
      </svg>
      <details className="mt-1 text-xs text-muted">
        <summary className="cursor-pointer">Show as table</summary>
        <table className="mt-2 w-full"><tbody>{data.map((d) => <tr key={d.label} className="border-b border-line/60"><td className="py-1">{d.label}</td><td className="py-1 text-right font-semibold text-ink">{format(d.value)}</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}

/** Ranked list with thin bars: best for "top N" (trips, countries). */
export function BarList({ data, format }: { data: Point[]; format: (n: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} title={`${d.label}: ${format(d.value)}${d.hint ? ` · ${d.hint}` : ""}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm"><span className="truncate">{d.label}</span><span className="shrink-0 font-semibold">{format(d.value)}</span></div>
          <div className="mt-1 h-2 rounded-full bg-line/50"><div className="h-2 rounded-full bg-pine" style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }} /></div>
          {d.hint ? <p className="mt-0.5 text-xs text-muted">{d.hint}</p> : null}
        </li>
      ))}
    </ul>
  );
}

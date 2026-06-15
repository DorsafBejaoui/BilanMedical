// Graphique combiné : courbe d'évolution + zone de référence ombrée (SVG, sans dépendance)
export default function RefChart({ data, refMin, refMax, unit, width = 260, height = 90 }) {
  if (!data || data.length === 0) return <span className="muted">—</span>;

  const padX = 8;
  const padY = 10;
  const values = data.map((d) => d.value);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (refMin != null) { lo = Math.min(lo, refMin); hi = Math.max(hi, refMin); }
  if (refMax != null) { lo = Math.min(lo, refMax); hi = Math.max(hi, refMax); }
  const span = hi - lo || Math.abs(hi) || 1;
  lo -= span * 0.12;
  hi += span * 0.12;
  const range = hi - lo || 1;

  const x = (i) => padX + (data.length === 1 ? width / 2 - padX : (i / (data.length - 1)) * (width - 2 * padX));
  const y = (v) => height - padY - ((v - lo) / range) * (height - 2 * padY);

  // Zone de référence (rectangle ombré)
  const bandTop = refMax != null ? y(refMax) : padY;
  const bandBottom = refMin != null ? y(refMin) : height - padY;

  const isOut = (v) => (refMin != null && v < refMin) || (refMax != null && v > refMax);
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');

  return (
    <svg className="refchart" viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {(refMin != null || refMax != null) && (
        <rect x="0" y={bandTop} width={width} height={Math.max(0, bandBottom - bandTop)} className="ref-band" />
      )}
      {data.length > 1 && <polyline className="line" points={points} fill="none" />}
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.value)} r="3.5" className={isOut(d.value) ? 'dot out' : 'dot'}>
          <title>{`${new Date(d.date).toLocaleDateString('fr-FR')} : ${d.value} ${unit || ''}`}</title>
        </circle>
      ))}
    </svg>
  );
}

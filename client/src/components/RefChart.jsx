// Graphique combiné : courbe d'évolution + zone de référence ombrée (SVG, sans dépendance)
export default function RefChart({ data, refMin, refMax, unit, width = 260, height = 90 }) {
  if (!data || data.length === 0) return <span className="muted">—</span>;

  const padX = 8;
  const padY = 10;
  const labelPad = 14; // espace réservé en haut pour les étiquettes de valeur
  const axisPad = 36; // espace réservé en bas pour les dates (verticales)
  const totalHeight = height + axisPad;

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
  const y = (v) => height - padY - ((v - lo) / range) * (height - 2 * padY - labelPad) ;

  // Zone de référence (rectangle ombré)
  const bandTop = refMax != null ? y(refMax) : padY;
  const bandBottom = refMin != null ? y(refMin) : height - padY;

  const isOut = (v) => (refMin != null && v < refMin) || (refMax != null && v > refMax);
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');

  // Formatage court de la valeur affichée au-dessus de chaque point
  const fmt = (v) => (Number.isInteger(v) ? v : Math.round(v * 100) / 100);

  // Date au format jj/mm/aa, affichée verticalement sous l'axe
  const fmtDate = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };
  const axisY = totalHeight - 4; // ancre basse des étiquettes de date

  return (
    <svg className="refchart" viewBox={`0 0 ${width} ${totalHeight}`} width="100%" height={totalHeight}>
      {(refMin != null || refMax != null) && (
        <rect x="0" y={bandTop} width={width} height={Math.max(0, bandBottom - bandTop)} className="ref-band" />
      )}
      {data.length > 1 && <polyline className="line" points={points} fill="none" />}
      <line x1="0" y1={height} x2={width} y2={height} className="axis-line" />
      {data.map((d, i) => {
        const cy = y(d.value);
        // Si le point est trop proche du haut, l'étiquette passe en dessous pour rester visible
        const labelY = cy - 11 < 4 ? cy + 14 : cy - 11;
        return (
          <g key={i}>
            <circle cx={x(i)} cy={cy} r="3.5" className={isOut(d.value) ? 'dot out' : 'dot'}>
              <title>{`${new Date(d.date).toLocaleDateString('fr-FR')} : ${d.value} ${unit || ''}`}</title>
            </circle>
            <text x={x(i)} y={labelY} textAnchor="middle" className={isOut(d.value) ? 'value-label out' : 'value-label'}>
              {fmt(d.value)}
            </text>
            <text
              x={x(i)}
              y={axisY}
              textAnchor="end"
              transform={`rotate(90 ${x(i)} ${axisY})`}
              className="date-label"
            >
              {fmtDate(d.date)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

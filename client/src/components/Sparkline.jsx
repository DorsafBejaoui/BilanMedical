// Mini-graphique en courbe (SVG, sans dépendance)
export default function Sparkline({ data, width = 600, height = 180 }) {
  if (!data || data.length === 0) {
    return <p className="muted">Aucune donnée à afficher.</p>;
  }
  if (data.length === 1) {
    return <p className="muted">Au moins deux mesures sont nécessaires pour tracer une courbe.</p>;
  }

  const pad = 28;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const x = (i) => pad + (i / (data.length - 1)) * (width - 2 * pad);
  const y = (v) => height - pad - ((v - min) / range) * (height - 2 * pad);

  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="axis" />
      <polyline className="line" points={points} fill="none" />
      {data.map((d, i) => (
        <circle key={d.id} cx={x(i)} cy={y(d.value)} r="3.5" className="dot">
          <title>{`${new Date(d.measured_at).toLocaleDateString('fr-FR')} : ${d.value} ${d.unit || ''}`}</title>
        </circle>
      ))}
      <text x={pad} y={y(max) - 6} className="label">{max}</text>
      <text x={pad} y={y(min) - 6} className="label">{min}</text>
    </svg>
  );
}

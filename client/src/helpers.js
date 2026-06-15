export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Valeur par défaut pour les champs date/datetime-local (HTML)
export function nowLocal(withTime = false) {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  const local = new Date(d - tzOffset).toISOString();
  return withTime ? local.slice(0, 16) : local.slice(0, 10);
}

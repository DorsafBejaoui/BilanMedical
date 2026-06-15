// Petit client HTTP pour l'API BilanMedical
async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || `Erreur ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  list: (resource) => request(`/${resource}`),
  get: (resource, id) => request(`/${resource}/${id}`),
  create: (resource, body) => request(`/${resource}`, { method: 'POST', body }),
  update: (resource, id, body) => request(`/${resource}/${id}`, { method: 'PUT', body }),
  remove: (resource, id) => request(`/${resource}/${id}`, { method: 'DELETE' }),
  stats: () => request('/stats'),
  series: (type) => request(`/measurements/series/${type}`),
  blood: {
    catalog: () => request('/blood/catalog'),
    tests: () => request('/blood/tests'),
    summary: () => request('/blood/summary'),
    create: (body) => request('/blood/tests', { method: 'POST', body }),
    update: (id, body) => request(`/blood/tests/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/blood/tests/${id}`, { method: 'DELETE' }),
  },
};

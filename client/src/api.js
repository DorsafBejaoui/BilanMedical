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
  profile: {
    get: () => request('/profile'),
    update: (body) => request('/profile', { method: 'PUT', body }),
  },
  synthesis: () => request('/synthesis'),
  blood: {
    catalog: () => request('/blood/catalog'),
    tests: () => request('/blood/tests'),
    summary: () => request('/blood/summary'),
    create: (body) => request('/blood/tests', { method: 'POST', body }),
    update: (id, body) => request(`/blood/tests/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/blood/tests/${id}`, { method: 'DELETE' }),
    importPdf: async (file) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/blood/import', { method: 'POST', body: fd });
      if (!res.ok) {
        const m = await res.json().catch(() => ({}));
        throw new Error(m.error || `Erreur ${res.status}`);
      }
      return res.json();
    },
  },
  radiology: {
    list: () => request('/radiology'),
    create: (body) => request('/radiology', { method: 'POST', body }),
    update: (id, body) => request(`/radiology/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/radiology/${id}`, { method: 'DELETE' }),
    importPdf: async (file) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/radiology/import', { method: 'POST', body: fd });
      if (!res.ok) {
        const m = await res.json().catch(() => ({}));
        throw new Error(m.error || `Erreur ${res.status}`);
      }
      return res.json();
    },
  },
};

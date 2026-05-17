// Thin fetch wrapper. Same-origin by default (widget is served from the Flask
// container), so no CORS overhead. The base can be overridden via
// VITE_API_BASE for dev against a remote backend.

const BASE = import.meta.env.VITE_API_BASE || '';

async function call(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // Non-JSON body (rare for our API).
  }
  if (!res.ok) {
    const err = new Error(payload?.error || `request_failed_${res.status}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

export const api = {
  availability: ({ days = 14, tz } = {}) =>
    call(`/api/availability?days=${days}${tz ? `&tz=${encodeURIComponent(tz)}` : ''}`),
  hold: ({ slot_start, slot_end }) =>
    call('/api/hold', { method: 'POST', body: { slot_start, slot_end } }),
  book: (payload) => call('/api/book', { method: 'POST', body: payload }),
};

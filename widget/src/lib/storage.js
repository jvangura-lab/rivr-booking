// localStorage with a 24h TTL. State persists across refreshes so a mid-funnel
// reload doesn't kill progress, but we don't haunt users with stale state next week.

const KEY = 'rivr_booking_v1';
const TTL_MS = 24 * 60 * 60 * 1000;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function save(payload) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...payload, savedAt: Date.now() }));
  } catch {
    // Quota exceeded / privacy mode — silently ignore. Funnel still works for the session.
  }
}

export function clear() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

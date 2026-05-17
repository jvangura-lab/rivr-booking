// Timezone + time formatting helpers.

export function userTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function formatTime(isoUtc, tz) {
  const d = new Date(isoUtc);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  });
}

export function formatDayLong(isoUtc, tz) {
  const d = new Date(isoUtc);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: tz,
  });
}

export function formatDayShort(isoUtc, tz) {
  const d = new Date(isoUtc);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: tz,
  });
}

export function dayKey(isoUtc, tz) {
  // YYYY-MM-DD in the target tz — used to group slots into day buckets.
  const d = new Date(isoUtc);
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: tz,
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function dayLabelParts(isoUtc, tz) {
  const d = new Date(isoUtc);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short', timeZone: tz });
  const month = d.toLocaleDateString(undefined, { month: 'short', timeZone: tz });
  const day = d.toLocaleDateString(undefined, { day: 'numeric', timeZone: tz });
  return { weekday, month, day };
}

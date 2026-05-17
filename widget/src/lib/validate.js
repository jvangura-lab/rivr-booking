// Lightweight email + URL helpers.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Domains commonly typoed by users completing forms. The pattern matters more
// than length — small allowlist beats fuzzy-matching every TLD on earth.
const COMMON_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
];

export function emailShapeOk(email) {
  return EMAIL_RE.test((email || '').trim());
}

// Returns a suggestion string (e.g. "gmail.com") if the email's domain is
// within 2 edits of a common one, else null.
export function emailDomainSuggestion(email) {
  const at = email.indexOf('@');
  if (at < 0) return null;
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain) return null;
  if (COMMON_DOMAINS.includes(domain)) return null;
  let best = { d: Infinity, candidate: null };
  for (const c of COMMON_DOMAINS) {
    const d = levenshtein(domain, c);
    if (d < best.d) best = { d, candidate: c };
  }
  return best.d > 0 && best.d <= 2 ? best.candidate : null;
}

export function normalizeWebsite(input) {
  const v = (input || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return 'https://' + v;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

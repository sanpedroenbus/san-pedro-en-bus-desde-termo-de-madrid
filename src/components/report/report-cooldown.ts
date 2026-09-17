// Soft client-side rate limit: one report every REPORT_COOLDOWN_MS per
// browser. This is not a security control -- localStorage is trivial to
// clear -- it just raises the bar past "tap submit twice by accident" for
// the average rider, complementing the server-side abuse-key rate limit.
const STORAGE_KEY = "sanpedroenbus:lastReportAt";
export const REPORT_COOLDOWN_MS = 5 * 60_000;

export function getReportCooldownRemainingMs(now = Date.now()): number {
  try {
    const lastReportAt = Number(localStorage.getItem(STORAGE_KEY));
    if (!Number.isFinite(lastReportAt) || lastReportAt <= 0) return 0;
    return Math.max(0, REPORT_COOLDOWN_MS - (now - lastReportAt));
  } catch {
    return 0;
  }
}

export function markReportSubmitted(now = Date.now()) {
  try {
    localStorage.setItem(STORAGE_KEY, String(now));
  } catch {
    // localStorage may be unavailable (private mode, blocked storage) -- the
    // cooldown is a soft deterrent, never a hard requirement to submit.
  }
}

export function clearReportCooldown() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // see markReportSubmitted
  }
}

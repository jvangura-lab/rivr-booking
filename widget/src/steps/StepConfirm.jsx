import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion.js';

// Confirmation reveal: gold dot → check draw → time slides up → details fade in.
// Skipped under prefers-reduced-motion (everything appears immediately).

export function StepConfirm({ booking, contactEmail, onRestart }) {
  const reduced = typeof window !== 'undefined' && prefersReducedMotion();
  const [phase, setPhase] = useState(reduced ? 3 : 0);

  useEffect(() => {
    if (reduced) return;
    const t1 = window.setTimeout(() => setPhase(1), 60);   // dot scales in
    const t2 = window.setTimeout(() => setPhase(2), 720);  // check + time
    const t3 = window.setTimeout(() => setPhase(3), 1400); // rest fades in
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [reduced]);

  return (
    <section className="step confirm" aria-live="polite">
      <div className={`confirm-stage phase-${phase}`}>
        <div className="confirm-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="64" height="64">
            <circle cx="32" cy="32" r="30" className="mark-ring" />
            <polyline points="20,33 28,41 44,24" className="mark-check" />
          </svg>
        </div>

        <div className="confirm-headline">
          <div className="text-label-caps eyebrow">Confirmed</div>
          <h1 className="text-display-2">
            You're on the <span className="serif">calendar</span>.
          </h1>
          <p className="confirm-when">{booking.when_display}</p>
          <p className="confirm-tz">{booking.tz_display}</p>
        </div>

        <div className="confirm-details">
          <p className="confirm-line">
            You'll meet <strong>Thor and Jonas</strong>. No prep — we'll talk about how RIVR fits your setup.
          </p>
          <p className="confirm-line muted">
            Confirmation on its way to <strong>{contactEmail}</strong>.
          </p>

          <div className="confirm-meet">
            <a className="btn btn-primary" href={booking.meet_url} target="_blank" rel="noreferrer">
              Open Google Meet <span className="arr" aria-hidden="true">→</span>
            </a>
          </div>

          <div className="confirm-addto">
            <span className="text-label-caps">Add to calendar</span>
            <div className="addto-links">
              <a href={booking.calendar_links?.google} target="_blank" rel="noreferrer">Google</a>
              <span aria-hidden="true">·</span>
              <a href={booking.calendar_links?.ics}>Apple / Outlook (.ics)</a>
            </div>
          </div>

          <button type="button" className="btn btn-secondary confirm-restart" onClick={onRestart}>
            Book another time
          </button>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef } from 'react';

// Horizontal scrollable strip of available days for mobile. Native scroll-snap
// gives momentum + boundary snap on iOS/Android.
// RIVR-NOTE: snapping is per-day right now. Week-chunk snap is a future polish
// once we have real traffic to test feel against.

export function WeekStrip({ tz, days, selectedDay, onSelect }) {
  const containerRef = useRef(null);
  const selectedRef = useRef(null);

  // Keep the selected day in view when it changes.
  useEffect(() => {
    if (!selectedRef.current || !containerRef.current) return;
    selectedRef.current.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [selectedDay]);

  return (
    <div className="week-strip" role="tablist" aria-label="Available dates" ref={containerRef}>
      {days.map((d) => {
        const iso = d + 'T12:00:00Z';
        const date = new Date(iso);
        const weekday = date
          .toLocaleDateString(undefined, { weekday: 'narrow', timeZone: tz })
          .toUpperCase();
        const dayNum = date.toLocaleDateString(undefined, {
          day: 'numeric',
          timeZone: tz,
        });
        const isSel = d === selectedDay;
        return (
          <button
            key={d}
            ref={isSel ? selectedRef : null}
            type="button"
            role="tab"
            aria-selected={isSel}
            className={`strip-day ${isSel ? 'selected' : ''}`}
            onClick={() => onSelect(d)}
          >
            <span className="strip-weekday">{weekday}</span>
            <span className="strip-num">{dayNum}</span>
            <span className="strip-dot" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

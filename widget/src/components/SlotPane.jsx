import { useEffect, useState } from 'react';
import { formatDayLong, formatTime } from '../lib/tz.js';

const MAX_VISIBLE = 9;

export function SlotPane({
  tz,
  pickedDay,
  slots,
  selected,
  onPick,
  onJumpNext,
  onChangeTz,
}) {
  const [showAll, setShowAll] = useState(false);

  // Collapse "show more" again when the day changes.
  useEffect(() => {
    setShowAll(false);
  }, [pickedDay]);

  const headerLabel = pickedDay
    ? formatDayLong(pickedDay + 'T12:00:00Z', tz)
    : '';

  const visible = showAll ? slots : slots.slice(0, MAX_VISIBLE);

  return (
    <div className="slot-pane" aria-live="polite">
      <header className="slot-pane-header">
        <span className="text-label-caps slot-pane-eyebrow">
          {pickedDay ? <>Available · {headerLabel}</> : <>Pick a day</>}
        </span>
        <TimezoneChip tz={tz} onChange={onChangeTz} />
      </header>

      <div className="slot-grid-pane" key={pickedDay || 'empty'}>
        {slots.length === 0 ? (
          <EmptyDay onJumpNext={onJumpNext} />
        ) : (
          <>
            {visible.map((s) => {
              const isSel = selected && selected.start === s.start;
              return (
                <button
                  key={s.start}
                  type="button"
                  className={`slot-pill ${isSel ? 'selected' : ''}`}
                  onClick={() => onPick(s)}
                >
                  {formatTime(s.start, tz)}
                </button>
              );
            })}
            {!showAll && slots.length > MAX_VISIBLE && (
              <button
                type="button"
                className="slot-show-more"
                onClick={() => setShowAll(true)}
              >
                Show {slots.length - MAX_VISIBLE} more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyDay({ onJumpNext }) {
  return (
    <div className="slot-empty">
      <p className="slot-empty-msg">No slots on this day.</p>
      <button type="button" className="btn btn-secondary slot-empty-cta" onClick={onJumpNext}>
        Try the next available <span className="arr" aria-hidden="true">→</span>
      </button>
    </div>
  );
}

function TimezoneChip({ tz, onChange }) {
  // Minimal v1: clicking opens a native prompt to type an IANA tz. Most users
  // never need this — auto-detect is right ~95% of the time.
  // RIVR-NOTE: replace with an inline searchable list if we see real users
  // bouncing through this prompt.
  function open() {
    const next = window.prompt('Timezone (IANA, e.g. America/New_York):', tz);
    if (next && next.trim() && next.trim() !== tz) onChange(next.trim());
  }
  return (
    <button type="button" className="tz-chip" onClick={open} aria-label="Change timezone">
      <span className="tz-chip-name">{tz}</span>
      <span className="tz-chevron" aria-hidden="true">▾</span>
    </button>
  );
}

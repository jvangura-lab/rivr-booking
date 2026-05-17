import { useMemo, useState } from 'react';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function pad(n) {
  return String(n).padStart(2, '0');
}
function makeKey(y, m0, d) {
  return `${y}-${pad(m0 + 1)}-${pad(d)}`;
}

function todayKey(tz) {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: tz,
  }).format(now);
}

export function MonthCalendar({ tz, availableDays, selectedDay, onSelect }) {
  const today = useMemo(() => todayKey(tz), [tz]);
  const [todayY, todayM, _todayD] = today.split('-').map(Number);

  // Initial month: month of selectedDay if set, else today's month.
  const [view, setView] = useState(() => {
    if (selectedDay) {
      const [y, m] = selectedDay.split('-').map(Number);
      return { year: y, month: m - 1 };
    }
    return { year: todayY, month: todayM - 1 };
  });
  const [slideDir, setSlideDir] = useState(null);

  function navMonth(delta) {
    const nm = new Date(view.year, view.month + delta, 1);
    setSlideDir(delta > 0 ? 'left' : 'right');
    setView({ year: nm.getFullYear(), month: nm.getMonth() });
  }

  const monthLabel = useMemo(
    () =>
      new Date(view.year, view.month, 1).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    [view],
  );

  // Build a 6×7 grid, Monday-start. Cells are day numbers or null (leading/trailing blanks).
  const cells = useMemo(() => {
    const firstOfMonth = new Date(view.year, view.month, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < startWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(d);
    while (out.length < 42) out.push(null);
    return out;
  }, [view]);

  const gridKey = `${view.year}-${view.month}-${slideDir || 'init'}`;

  return (
    <div className="month-cal">
      <header className="month-cal-header">
        <button
          type="button"
          className="month-nav"
          onClick={() => navMonth(-1)}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="month-label">{monthLabel}</span>
        <button
          type="button"
          className="month-nav"
          onClick={() => navMonth(1)}
          aria-label="Next month"
        >
          ›
        </button>
      </header>
      <div className="month-weekdays" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div
        className={`month-grid ${slideDir ? 'slide-' + slideDir : ''}`}
        key={gridKey}
      >
        {cells.map((d, i) => {
          if (d == null) return <span key={i} className="day empty" />;
          const key = makeKey(view.year, view.month, d);
          const isAvailable = availableDays.has(key);
          const isPast = key < today;
          const isSelected = key === selectedDay;
          const isToday = key === today;
          const cellClass = [
            'day',
            isAvailable && 'available',
            !isAvailable && !isPast && 'unavailable',
            isPast && 'past',
            isSelected && 'selected',
            isToday && 'today',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={key}
              type="button"
              className={cellClass}
              disabled={isPast}
              onClick={() => !isPast && onSelect(key)}
              style={{ animationDelay: `${i * 12}ms` }}
              aria-pressed={isSelected}
            >
              <span className="day-num">{d}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

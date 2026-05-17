import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { dayKey, dayLabelParts, formatTime, userTz } from '../lib/tz.js';
import { Button } from '../components/Button.jsx';
import { Reveal } from '../components/Reveal.jsx';

const STATE = {
  loading: 'loading',
  ready: 'ready',
  error: 'error',
  empty: 'empty',
  booking: 'booking',
};

export function StepTime({ qualification, contact, slot, onSlot, onBooked }) {
  const [tz, setTz] = useState(() => userTz());
  const [status, setStatus] = useState(STATE.loading);
  const [slots, setSlots] = useState([]);
  const [pickedDay, setPickedDay] = useState(null);
  const [selected, setSelected] = useState(slot);
  const [hold, setHold] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    setStatus(STATE.loading);
    api.availability({ days: 14, tz })
      .then((data) => {
        if (cancelled) return;
        const all = data.slots || [];
        setSlots(all);
        if (!all.length) {
          setStatus(STATE.empty);
          return;
        }
        setStatus(STATE.ready);
        const firstDay = dayKey(all[0].start, tz);
        setPickedDay((prev) => prev || firstDay);
      })
      .catch((e) => {
        if (cancelled) return;
        setErrMsg(e?.message || 'unknown');
        setStatus(STATE.error);
      });
    return () => {
      cancelled = true;
    };
  }, [tz]);

  // Bucket slots by day-in-user-tz.
  const byDay = useMemo(() => {
    const m = new Map();
    for (const s of slots) {
      const k = dayKey(s.start, tz);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(s);
    }
    return m;
  }, [slots, tz]);

  const days = useMemo(() => Array.from(byDay.keys()), [byDay]);

  async function pickSlot(s) {
    setSelected(s);
    setErrMsg('');
    try {
      const h = await api.hold({ slot_start: s.start, slot_end: s.end });
      setHold(h);
      onSlot(s, h);
    } catch (e) {
      if (e.status === 409) {
        // Slot got held by someone else in the moment. Reload availability.
        setErrMsg('That slot was just taken. Pick another.');
        setSelected(null);
        const fresh = await api.availability({ days: 14, tz });
        setSlots(fresh.slots || []);
      } else {
        setErrMsg('Could not hold that slot. Try another.');
        setSelected(null);
      }
    }
  }

  async function confirmBooking() {
    if (!selected || !hold) return;
    setStatus(STATE.booking);
    setErrMsg('');
    try {
      const booking = await api.book({
        hold_token: hold.hold_token,
        slot_start: selected.start,
        slot_end: selected.end,
        tz,
        contact,
        qualification,
      });
      onBooked(booking);
    } catch (e) {
      setStatus(STATE.ready);
      if (e.status === 410) {
        setErrMsg('Your hold expired. Pick the slot again.');
        setSelected(null);
        setHold(null);
      } else if (e.status === 409) {
        setErrMsg('That slot was just taken. Pick another.');
        setSelected(null);
        setHold(null);
        const fresh = await api.availability({ days: 14, tz });
        setSlots(fresh.slots || []);
      } else {
        setErrMsg('Something went wrong. Try again in a moment.');
      }
    }
  }

  return (
    <section className="step">
      <Reveal as="header">
        <div className="text-label-caps eyebrow">Step 3 of 4</div>
        <h1 className="text-display-2 serif-accent">
          Pick <span className="serif">a time</span>.
        </h1>
        <p className="text-body-lg lede">30 minutes with Thor and Jonas. Times shown in <strong>{tz}</strong>.</p>
      </Reveal>

      {status === STATE.loading && (
        <Reveal delay={120}>
          <div className="placeholder">Loading available times…</div>
        </Reveal>
      )}

      {status === STATE.error && (
        <Reveal delay={120}>
          <div className="placeholder placeholder-error">
            We couldn't load times right now ({errMsg}). Reach us at <a href="mailto:hello@rivr.example">hello@rivr.example</a>.
          </div>
        </Reveal>
      )}

      {status === STATE.empty && (
        <Reveal delay={120}>
          <div className="placeholder">
            No openings in the next two weeks. Drop us a line at <a href="mailto:hello@rivr.example">hello@rivr.example</a> and we'll find time.
          </div>
        </Reveal>
      )}

      {(status === STATE.ready || status === STATE.booking) && (
        <>
          <Reveal delay={120}>
            <div className="time-picker">
              <DayColumn days={days} tz={tz} picked={pickedDay} onPick={setPickedDay} />
              <SlotGrid
                slots={pickedDay ? byDay.get(pickedDay) || [] : []}
                tz={tz}
                selected={selected}
                onPick={pickSlot}
              />
            </div>
          </Reveal>

          <Reveal delay={240}>
            <div className="actions confirm-row">
              <div className="confirm-status">
                {errMsg ? (
                  <span className="confirm-error">{errMsg}</span>
                ) : selected ? (
                  <span>
                    Held until <strong>{formatTime(hold?.expires_at, tz)}</strong>
                  </span>
                ) : (
                  <span>Choose any slot above.</span>
                )}
              </div>
              <Button
                onClick={confirmBooking}
                disabled={!selected || !hold || status === STATE.booking}
                showArrow={status !== STATE.booking}
              >
                {status === STATE.booking ? 'Booking…' : 'Confirm booking'}
              </Button>
            </div>
          </Reveal>
        </>
      )}
    </section>
  );
}

function DayColumn({ days, tz, picked, onPick }) {
  return (
    <div className="day-col" role="tablist" aria-label="Available dates">
      {days.map((d) => {
        const iso = d + 'T12:00:00Z'; // tz-safe pivot for label formatting
        const { weekday, month, day } = dayLabelParts(iso, tz);
        const isPicked = d === picked;
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={isPicked}
            className={`day-cell ${isPicked ? 'is-picked' : ''}`}
            onClick={() => onPick(d)}
          >
            <span className="day-weekday">{weekday}</span>
            <span className="day-day">{day}</span>
            <span className="day-month">{month}</span>
          </button>
        );
      })}
    </div>
  );
}

function SlotGrid({ slots, tz, selected, onPick }) {
  if (!slots.length) {
    return <div className="slot-grid-empty">No slots on this day. Pick another.</div>;
  }
  return (
    <div className="slot-grid">
      {slots.map((s) => {
        const isSel = selected && selected.start === s.start;
        return (
          <button
            key={s.start}
            type="button"
            className={`slot ${isSel ? 'is-selected' : ''}`}
            onClick={() => onPick(s)}
          >
            {formatTime(s.start, tz)}
          </button>
        );
      })}
    </div>
  );
}

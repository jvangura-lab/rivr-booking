import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { dayKey, userTz } from '../lib/tz.js';
import { Button } from '../components/Button.jsx';
import { Reveal } from '../components/Reveal.jsx';
import { MonthCalendar } from '../components/MonthCalendar.jsx';
import { WeekStrip } from '../components/WeekStrip.jsx';
import { SlotPane } from '../components/SlotPane.jsx';

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

  // Pre-fetch 14 days on mount (and re-fetch on tz change). Day-switching is
  // instant after this — everything is in memory.
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

  const slotsByDay = useMemo(() => {
    const m = new Map();
    for (const s of slots) {
      const k = dayKey(s.start, tz);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(s);
    }
    return m;
  }, [slots, tz]);

  const availableDaySet = useMemo(
    () => new Set(slotsByDay.keys()),
    [slotsByDay],
  );
  const availableDaysSorted = useMemo(
    () => Array.from(slotsByDay.keys()).sort(),
    [slotsByDay],
  );

  async function pickSlot(s) {
    setSelected(s);
    setErrMsg('');
    try {
      const h = await api.hold({ slot_start: s.start, slot_end: s.end });
      setHold(h);
      onSlot(s, h);
    } catch (e) {
      if (e.status === 409) {
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

  function jumpToNextAvailable() {
    if (!availableDaysSorted.length) return;
    const next =
      availableDaysSorted.find((d) => d > (pickedDay || '')) ||
      availableDaysSorted[0];
    setPickedDay(next);
  }

  const currentSlots = pickedDay ? slotsByDay.get(pickedDay) || [] : [];

  return (
    <section className="step time-step">
      <Reveal as="header">
        <div className="text-label-caps eyebrow">Step 3 of 4</div>
        <h1 className="text-display-2 serif-accent">
          Pick <span className="serif">a time</span>.
        </h1>
        <p className="text-body-lg lede">
          30 minutes with Thor and Jonas.
        </p>
      </Reveal>

      {status === STATE.loading && (
        <Reveal delay={120}>
          <div className="placeholder">Loading available times…</div>
        </Reveal>
      )}

      {status === STATE.error && (
        <Reveal delay={120}>
          <div className="placeholder placeholder-error">
            We couldn't load times right now ({errMsg}). Reach us at{' '}
            <a href="mailto:hello@rivr.example">hello@rivr.example</a>.
          </div>
        </Reveal>
      )}

      {status === STATE.empty && (
        <Reveal delay={120}>
          <div className="placeholder">
            No openings in the next two weeks. Drop us a line at{' '}
            <a href="mailto:hello@rivr.example">hello@rivr.example</a> and we'll
            find time.
          </div>
        </Reveal>
      )}

      {(status === STATE.ready || status === STATE.booking) && (
        <>
          <Reveal delay={120}>
            <div className="picker-shell">
              <div className="cal-pane">
                <MonthCalendar
                  tz={tz}
                  availableDays={availableDaySet}
                  selectedDay={pickedDay}
                  onSelect={(d) => {
                    setPickedDay(d);
                    setSelected(null);
                    setHold(null);
                  }}
                />
              </div>
              <div className="mobile-strip">
                <WeekStrip
                  tz={tz}
                  days={availableDaysSorted}
                  selectedDay={pickedDay}
                  onSelect={(d) => {
                    setPickedDay(d);
                    setSelected(null);
                    setHold(null);
                  }}
                />
              </div>
              <div className="slot-pane-wrap">
                <SlotPane
                  tz={tz}
                  pickedDay={pickedDay}
                  slots={currentSlots}
                  selected={selected}
                  onPick={pickSlot}
                  onJumpNext={jumpToNextAvailable}
                  onChangeTz={setTz}
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={240}>
            <footer className="picker-footer">
              <div className="footer-meta">
                Times in your local zone · 30 minutes · Google Meet
              </div>
              <div className="footer-cta">
                {errMsg && <span className="confirm-error">{errMsg}</span>}
                <Button
                  onClick={confirmBooking}
                  disabled={!selected || !hold || status === STATE.booking}
                  showArrow={status !== STATE.booking}
                >
                  {status === STATE.booking ? 'Booking…' : 'Continue'}
                </Button>
              </div>
            </footer>
          </Reveal>
        </>
      )}
    </section>
  );
}

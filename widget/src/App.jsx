import { useEffect, useReducer, useRef, useState } from 'react';
import { Progress } from './components/Progress.jsx';
import { useIframeHeight } from './lib/motion.js';
import * as storage from './lib/storage.js';
import { StepQualify } from './steps/StepQualify.jsx';
import { StepDetails } from './steps/StepDetails.jsx';
import { StepTime } from './steps/StepTime.jsx';
import { StepConfirm } from './steps/StepConfirm.jsx';

const TOTAL_STEPS = 4;

const initialState = {
  step: 1,
  direction: 'forward', // 'forward' | 'back' — drives slide direction
  qualification: {
    appointments: '',
    scheduler: '',
    scheduler_other: '',
    timeline: '',
  },
  contact: { name: '', email: '', website: '', role: '' },
  slot: null, // { start, end }
  hold: null, // { token, expires_at }
  booking: null, // { booking_id, meet_url, when_display, tz_display, calendar_links }
};

// Pull only known keys out of a restored object so renamed/removed fields
// don't leak forward (e.g. legacy `outreach` from prior versions).
function pick(template, source) {
  const out = {};
  for (const k of Object.keys(template)) {
    out[k] = source && k in source ? source[k] : template[k];
  }
  return out;
}

function reducer(state, action) {
  switch (action.type) {
    case 'restore':
      return {
        ...state,
        ...action.payload,
        qualification: pick(initialState.qualification, action.payload.qualification),
        contact: pick(initialState.contact, action.payload.contact),
      };
    case 'next':
      return { ...state, step: Math.min(state.step + 1, TOTAL_STEPS), direction: 'forward' };
    case 'back':
      return { ...state, step: Math.max(state.step - 1, 1), direction: 'back' };
    case 'goto':
      return { ...state, step: action.step, direction: action.direction || 'forward' };
    case 'qualification':
      return { ...state, qualification: { ...state.qualification, ...action.patch } };
    case 'contact':
      return { ...state, contact: { ...state.contact, ...action.patch } };
    case 'slot':
      return { ...state, slot: action.slot };
    case 'hold':
      return { ...state, hold: action.hold };
    case 'booking':
      return { ...state, booking: action.booking };
    case 'reset':
      return { ...initialState };
    default:
      return state;
  }
}

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const restoredRef = useRef(false);

  // Restore on mount (24h TTL handled in storage.load).
  useEffect(() => {
    const saved = storage.load();
    if (saved?.state) {
      // Don't restore step 4 — that's a one-shot confirmation.
      const restoreState = saved.state.step >= TOTAL_STEPS
        ? { ...saved.state, step: 1, booking: null }
        : saved.state;
      dispatch({ type: 'restore', payload: restoreState });
    }
    restoredRef.current = true;
  }, []);

  // Persist on every change (skip the first paint before restore).
  useEffect(() => {
    if (!restoredRef.current) return;
    if (state.step >= TOTAL_STEPS) return; // don't persist the confirmation
    storage.save({ state });
  }, [state]);

  // Iframe height reporting — fires on every step change.
  useIframeHeight([state.step]);

  return (
    <div className="shell">
      <Topbar canBack={state.step > 1 && state.step < TOTAL_STEPS} onBack={() => dispatch({ type: 'back' })} />
      <Progress step={state.step} total={TOTAL_STEPS} complete={state.step >= TOTAL_STEPS} />
      <StepFrame key={state.step} direction={state.direction}>
        {state.step === 1 && (
          <StepQualify
            value={state.qualification}
            onChange={(patch) => dispatch({ type: 'qualification', patch })}
            onNext={() => dispatch({ type: 'next' })}
          />
        )}
        {state.step === 2 && (
          <StepDetails
            value={state.contact}
            onChange={(patch) => dispatch({ type: 'contact', patch })}
            onNext={() => dispatch({ type: 'next' })}
          />
        )}
        {state.step === 3 && (
          <StepTime
            qualification={state.qualification}
            contact={state.contact}
            slot={state.slot}
            onSlot={(slot, hold) => {
              dispatch({ type: 'slot', slot });
              dispatch({ type: 'hold', hold });
            }}
            onBooked={(booking) => {
              dispatch({ type: 'booking', booking });
              dispatch({ type: 'next' });
              storage.clear();
            }}
          />
        )}
        {state.step === 4 && state.booking && (
          <StepConfirm
            booking={state.booking}
            contactEmail={state.contact.email}
            onRestart={() => dispatch({ type: 'reset' })}
          />
        )}
      </StepFrame>
    </div>
  );
}

function Topbar({ canBack, onBack }) {
  return (
    <div className="topbar">
      <div className="brand">
        <span className="brand-dot" aria-hidden="true" />
        <span>RIVR</span>
      </div>
      {canBack ? (
        <button type="button" className="back-btn" onClick={onBack}>
          <span className="arr" aria-hidden="true">←</span>
          <span>Back</span>
        </button>
      ) : (
        <span style={{ width: 1 }} />
      )}
    </div>
  );
}

function StepFrame({ children, direction }) {
  return (
    <div className="step-frame">
      <div className={`step-anim${direction === 'back' ? ' reverse' : ''}`}>
        {children}
      </div>
    </div>
  );
}

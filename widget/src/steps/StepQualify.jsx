import { useEffect, useRef } from 'react';
import { ChoiceGroup } from '../components/ChoiceGroup.jsx';
import { Field } from '../components/Field.jsx';
import { Button } from '../components/Button.jsx';
import { Reveal } from '../components/Reveal.jsx';

const APPOINTMENTS = ['Under 20', '20–50', '50–100', '100+'];

// RIVR-NOTE: Mindbody and Vagaro users typically already have in-platform
// booking, so they're underrepresented on this funnel. Kept here because some
// users on those systems still want a better front-of-funnel experience —
// revisit if conversion data shows they don't fit.
const SCHEDULERS = [
  'Google Calendar',
  'Cal.com',
  'Apple Calendar',
  'Vagaro',
  'Mindbody',
  'Other',
  'None',
];

const TIMELINE = ['Under 5 days', '1–2 weeks', '~1 month', '2 months+'];

export function StepQualify({ value, onChange, onNext }) {
  const otherInputRef = useRef(null);
  const wantsOther = value.scheduler === 'Other';

  useEffect(() => {
    if (wantsOther) otherInputRef.current?.focus();
  }, [wantsOther]);

  const complete =
    !!value.appointments &&
    !!value.scheduler &&
    !!value.timeline &&
    (!wantsOther || !!(value.scheduler_other || '').trim());

  return (
    <section className="step">
      <Reveal as="header">
        <div className="text-label-caps eyebrow">Step 1 of 4</div>
        <h1 className="text-display-2 serif-accent">
          A few <span className="serif">questions</span>.
        </h1>
        <p className="text-body-lg lede">
          We work with a small number of operators at a time. This helps us route the call.
        </p>
      </Reveal>

      <Reveal delay={120}>
        <ChoiceGroup
          label="Appointments per month?"
          name="appointments"
          options={APPOINTMENTS}
          value={value.appointments}
          onChange={(v) => onChange({ appointments: v })}
        />
      </Reveal>

      <Reveal delay={210}>
        <div className="choice-block">
          <ChoiceGroup
            label="What's your current scheduling calendar?"
            name="scheduler"
            options={SCHEDULERS}
            value={value.scheduler}
            onChange={(v) => onChange({ scheduler: v })}
          />
          {wantsOther && (
            <div className="choice-extra">
              <Field
                ref={otherInputRef}
                label="Which one?"
                name="scheduler_other"
                type="text"
                value={value.scheduler_other || ''}
                onChange={(e) => onChange({ scheduler_other: e.target.value })}
                placeholder="e.g. Square, Acuity, custom"
              />
            </div>
          )}
        </div>
      </Reveal>

      <Reveal delay={300}>
        <ChoiceGroup
          label="When are you looking to launch?"
          name="timeline"
          options={TIMELINE}
          value={value.timeline}
          onChange={(v) => onChange({ timeline: v })}
        />
      </Reveal>

      <Reveal delay={390}>
        <div className="actions right">
          <Button onClick={onNext} disabled={!complete} showArrow>
            Continue
          </Button>
        </div>
      </Reveal>
    </section>
  );
}

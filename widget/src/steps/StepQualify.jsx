import { ChoiceGroup } from '../components/ChoiceGroup.jsx';
import { Button } from '../components/Button.jsx';
import { Reveal } from '../components/Reveal.jsx';

const OUTREACH = ['Nothing yet', 'Manual', 'Another tool', 'Agency'];
const APPOINTMENTS = ['Under 20', '20–50', '50–100', '100+'];
const SCHEDULER = ['Vagaro', 'Boulevard', 'Mindbody', 'Other', 'None'];

export function StepQualify({ value, onChange, onNext }) {
  const complete = !!value.outreach && !!value.appointments && !!value.scheduler;

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
          label="Your current outreach setup?"
          name="outreach"
          options={OUTREACH}
          value={value.outreach}
          onChange={(v) => onChange({ outreach: v })}
        />
      </Reveal>

      <Reveal delay={210}>
        <ChoiceGroup
          label="Appointments booked per month?"
          name="appointments"
          options={APPOINTMENTS}
          value={value.appointments}
          onChange={(v) => onChange({ appointments: v })}
        />
      </Reveal>

      <Reveal delay={300}>
        <ChoiceGroup
          label="Scheduling system you use?"
          name="scheduler"
          options={SCHEDULER}
          value={value.scheduler}
          onChange={(v) => onChange({ scheduler: v })}
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

import { useRef, useState } from 'react';
import { Field } from '../components/Field.jsx';
import { Button } from '../components/Button.jsx';
import { Reveal } from '../components/Reveal.jsx';
import { emailDomainSuggestion, emailShapeOk, normalizeWebsite } from '../lib/validate.js';

export function StepDetails({ value, onChange, onNext }) {
  const [touched, setTouched] = useState({});
  const [emailSuggestion, setEmailSuggestion] = useState(null);
  const emailRef = useRef(null);

  function checkEmailOnBlur() {
    setTouched((t) => ({ ...t, email: true }));
    if (value.email && emailShapeOk(value.email)) {
      setEmailSuggestion(emailDomainSuggestion(value.email));
    } else {
      setEmailSuggestion(null);
    }
  }

  function acceptSuggestion() {
    const at = value.email.indexOf('@');
    if (at < 0 || !emailSuggestion) return;
    onChange({ email: value.email.slice(0, at + 1) + emailSuggestion });
    setEmailSuggestion(null);
    emailRef.current?.focus();
  }

  const nameError = touched.name && !value.name.trim() ? 'Please add your name' : '';
  const emailError =
    touched.email && value.email && !emailShapeOk(value.email)
      ? 'That email doesn’t look right'
      : touched.email && !value.email
        ? 'Work email is required'
        : '';

  const canContinue = !!value.name.trim() && emailShapeOk(value.email);

  function handleSubmit() {
    setTouched({ name: true, email: true, website: true, role: true });
    if (!canContinue) return;
    if (value.website) onChange({ website: normalizeWebsite(value.website) });
    onNext();
  }

  return (
    <section className="step">
      <Reveal as="header">
        <div className="text-label-caps eyebrow">Step 2 of 4</div>
        <h1 className="text-display-2 serif-accent">
          Tell us a bit <span className="serif">about you</span>.
        </h1>
        <p className="text-body-lg lede">Takes 20 seconds. We only ask what we'll actually use on the call.</p>
      </Reveal>

      <form
        className="fields"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <Reveal delay={120}>
          <Field
            label="Name"
            name="name"
            type="text"
            autoComplete="name"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            error={nameError}
            placeholder="Your full name"
          />
        </Reveal>

        <Reveal delay={210}>
          <Field
            ref={emailRef}
            label="Work email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={value.email}
            onChange={(e) => {
              onChange({ email: e.target.value });
              if (emailSuggestion) setEmailSuggestion(null);
            }}
            onBlur={checkEmailOnBlur}
            error={emailError}
            suggestion={emailSuggestion}
            onSuggestionClick={acceptSuggestion}
            placeholder="you@company.com"
          />
        </Reveal>

        <Reveal delay={300}>
          <Field
            label="Company website"
            name="website"
            type="url"
            inputMode="url"
            autoComplete="url"
            value={value.website}
            onChange={(e) => onChange({ website: e.target.value })}
            onBlur={() => {
              setTouched((t) => ({ ...t, website: true }));
              if (value.website) onChange({ website: normalizeWebsite(value.website) });
            }}
            optional
            placeholder="company.com"
          />
        </Reveal>

        <Reveal delay={390}>
          <Field
            label="Your role"
            name="role"
            type="text"
            autoComplete="organization-title"
            value={value.role}
            onChange={(e) => onChange({ role: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, role: true }))}
            optional
            placeholder="Founder, GM, etc."
          />
        </Reveal>

        <Reveal delay={480}>
          <div className="actions right">
            <Button type="submit" disabled={!canContinue} showArrow>
              Continue
            </Button>
          </div>
        </Reveal>
      </form>
    </section>
  );
}

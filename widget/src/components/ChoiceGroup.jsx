// Button-select group: large radio cards. More premium than a dropdown.

export function ChoiceGroup({ label, name, options, value, onChange }) {
  return (
    <fieldset className="choices">
      <legend className="choices-legend">{label}</legend>
      <div className="choices-grid">
        {options.map((opt, i) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`choice ${selected ? 'is-selected' : ''}`}
              onClick={() => onChange(opt)}
              style={{ transitionDelay: `${60 + i * 30}ms` }}
            >
              <span className="choice-label">{opt}</span>
              <span className="choice-tick" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

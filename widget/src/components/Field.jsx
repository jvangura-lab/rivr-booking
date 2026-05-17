import { forwardRef } from 'react';

export const Field = forwardRef(function Field(
  { label, hint, error, suggestion, onSuggestionClick, optional, ...inputProps },
  ref,
) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label className="field-label" htmlFor={inputProps.id || inputProps.name}>
        <span>{label}</span>
        {optional ? <span className="field-optional">Optional</span> : null}
      </label>
      <input
        ref={ref}
        className="field-input"
        id={inputProps.id || inputProps.name}
        autoComplete={inputProps.autoComplete || 'off'}
        spellCheck={false}
        {...inputProps}
      />
      <div className="field-meta">
        {error ? <span className="field-error">{error}</span> : null}
        {!error && suggestion ? (
          <button type="button" className="field-suggestion" onClick={onSuggestionClick}>
            Did you mean <strong>{suggestion}</strong>?
          </button>
        ) : null}
        {!error && !suggestion && hint ? <span className="field-hint">{hint}</span> : null}
      </div>
    </div>
  );
});

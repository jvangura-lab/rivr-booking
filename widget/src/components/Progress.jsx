export function Progress({ step, total, complete = false }) {
  // step is 1-indexed. When `complete` is true (confirmation reached), all
  // segments fill — the funnel is finished.
  return (
    <div className="progress" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={total} aria-label={`Step ${step} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => {
        const idx = i + 1;
        const state = complete || idx < step ? 'done' : idx === step ? 'active' : '';
        return <span key={i} className={`progress-step ${state}`} />;
      })}
    </div>
  );
}

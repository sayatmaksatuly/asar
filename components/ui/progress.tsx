export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const safe = Math.max(0, Math.min(max, value));
  return <div className="progress-wrap"><div className="progress-label"><span>{label}</span><span>{safe} / {max}</span></div><div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={safe}><span style={{ width: `${(safe / max) * 100}%` }} /></div></div>;
}

export function Stepper({ steps, current, label }: { steps: string[]; current: number; label: string }) {
  return <nav aria-label={label}><ol className="stepper">{steps.map((step, index) => <li className={index + 1 === current ? "is-current" : index + 1 < current ? "is-complete" : ""} aria-current={index + 1 === current ? "step" : undefined} key={step}><span>{index + 1}</span><strong>{step}</strong></li>)}</ol></nav>;
}

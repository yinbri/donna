const STEPS = ['Apply', 'Research', 'Screen', 'Feedback'];

export function Steps({ at }: { at: number }) {
  return (
    <ol className="steps" aria-label="Progress">
      {STEPS.map((s, i) => (
        <li key={s} className={i < at ? 'done' : i === at ? 'now' : ''} aria-current={i === at ? 'step' : undefined}>
          <i />
          {s}
        </li>
      ))}
    </ol>
  );
}

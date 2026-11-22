import { useState, type ReactNode } from 'react';
import type { Role } from '../server/contracts';
import { defaultPrefs, isDefault, MAX_TRAITS, MUST_HAVE_MIN, PACE, SENIORITY, SHAPE, STACK_BOOST, STACK_PRESETS, TRAITS, WEIGHTS, type HiringPrefs } from './hiringPrefs';

function Seg<T extends string | number>({
  label,
  options,
  value,
  onChange,
  small,
}: {
  label: string;
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  small?: boolean;
}) {
  return (
    <div className={`seg${small ? ' seg-sm' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.label} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const opts = <T extends string>(xs: readonly T[]) => xs.map((x) => ({ label: x, value: x }));

/** Multi-select chips. `max` caps how many can be on; extra taps do nothing until one is cleared. */
function Chips({ label, items, picked, onChange, max, removable }: { label: string; items: readonly string[]; picked: string[]; onChange: (next: string[]) => void; max?: number; removable?: boolean }) {
  const full = max !== undefined && picked.length >= max;
  return (
    <div className="chips" role="group" aria-label={label}>
      {items.map((x) => {
        const on = picked.includes(x);
        return (
          <button
            key={x}
            type="button"
            className={`pchip${on ? ' on' : ''}`}
            aria-pressed={on}
            disabled={!on && full}
            onClick={() => onChange(on ? picked.filter((p) => p !== x) : [...picked, x])}
          >
            {on && (
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path d={removable ? 'M4 4l8 8M12 4l-8 8' : 'm3.5 8.5 3 3 6-7'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {x}
          </button>
        );
      })}
    </div>
  );
}

/** Free-text add for anything not in the presets; Enter or the button adds a chip. */
function AddChip({ onAdd, existing }: { onAdd: (x: string) => void; existing: string[] }) {
  const [v, setV] = useState('');
  const add = () => {
    const x = v.trim().slice(0, 32);
    if (x && !existing.some((e) => e.toLowerCase() === x.toLowerCase())) onAdd(x);
    setV('');
  };
  return (
    <div className="chip-add">
      <input
        type="text"
        value={v}
        placeholder="Add your own, e.g. Elixir"
        aria-label="Add a tech stack item"
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
      />
      <button type="button" className="btn btn-sm" onClick={add} disabled={!v.trim()}>
        Add
      </button>
    </div>
  );
}

/** One settings row: what it is on the left, the control on the right. */
function Row({ title, help, htmlFor, stack, children }: { title: string; help: string; htmlFor?: string; stack?: boolean; children: ReactNode }) {
  return (
    <div className={`prefs-row${stack ? ' stack' : ''}`}>
      <div className="prefs-row-text">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="prefs-row-title">
            {title}
          </label>
        ) : (
          <span className="prefs-row-title">{title}</span>
        )}
        <span className="prefs-row-help">{help}</span>
      </div>
      <div className="prefs-row-control">{children}</div>
    </div>
  );
}

/** Founder-tunable hiring parameters for one role. */
export function HiringPrefsPanel({ role, prefs, onChange }: { role: Role; prefs: HiringPrefs; onChange: (p: HiringPrefs) => void }) {
  const custom = !isDefault(prefs);
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<HiringPrefs>) => onChange({ ...prefs, ...patch });
  const weight = (r: string) => prefs.weights[r] ?? 1;

  const summary = [
    prefs.seniority !== 'Any' && prefs.seniority,
    prefs.shape !== 'Any' && prefs.shape,
    prefs.pace !== 'Balanced' && prefs.pace,
    prefs.stack.length > 0 && prefs.stack.slice(0, 3).join(', ') + (prefs.stack.length > 3 ? ` +${prefs.stack.length - 3}` : ''),
    prefs.traits.length > 0 && `${prefs.traits.length} trait${prefs.traits.length === 1 ? '' : 's'}`,
    prefs.mustHave.length > 0 && `${prefs.mustHave.length} must-have${prefs.mustHave.length === 1 ? '' : 's'}`,
    `bar ${prefs.bar.toFixed(1)}`,
  ].filter(Boolean);

  return (
    <section className={`prefs${open ? ' open' : ''}`} aria-label="Hiring preferences">
      <button type="button" className="prefs-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="prefs-title">
          Hiring preferences
          {custom && <span className="prefs-on">Tuned</span>}
        </span>
        <span className="prefs-summary">{custom ? summary.join(' · ') : 'Tell Donna what kind of engineer you want'}</span>
        <svg className="prefs-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="prefs-body">
          <div className="prefs-group">
            <h3 className="prefs-group-title">Who you're looking for</h3>
            <Row stack title="Level" help="Donna uses this when you ask her who to meet.">
              <Seg label="Level" options={opts(SENIORITY)} value={prefs.seniority} onChange={(seniority) => set({ seniority })} />
            </Row>
            <Row stack title="Engineer shape" help="The kind of work you need covered first.">
              <Seg label="Engineer shape" options={opts(SHAPE)} value={prefs.shape} onChange={(shape) => set({ shape })} />
            </Row>
            <Row stack title="Working style" help="How you'd trade speed against rigor.">
              <Seg label="Working style" options={opts(PACE)} value={prefs.pace} onChange={(pace) => set({ pace })} />
            </Row>
          </div>

          <div className="prefs-group">
            <h3 className="prefs-group-title">Tech stack</h3>
            <p className="prefs-row-help">
              Matched against what Donna found in research and heard on the call. A full match adds up to +{STACK_BOOST} to fit.
            </p>
            <Chips
              label="Tech stack"
              items={[...STACK_PRESETS, ...prefs.stack.filter((s) => !(STACK_PRESETS as readonly string[]).includes(s))]}
              picked={prefs.stack}
              onChange={(stack) => set({ stack })}
            />
            <AddChip existing={prefs.stack} onAdd={(x) => set({ stack: [...prefs.stack, x] })} />
          </div>

          <div className="prefs-group">
            <h3 className="prefs-group-title">Personality and working style</h3>
            <p className="prefs-row-help">
              Pick up to {MAX_TRAITS}. Ask Donna looks for evidence of these in the call; they don't change scores. Work traits only, never
              anything personal.
            </p>
            <Chips label="Personality traits" items={TRAITS} picked={prefs.traits} max={MAX_TRAITS} onChange={(traits) => set({ traits })} />
          </div>

          <div className="prefs-group">
            <h3 className="prefs-group-title">How Donna ranks</h3>
            <ul className="prefs-criteria" aria-label="Rubric weights">
              {role.rubric.map((r) => {
                const must = prefs.mustHave.includes(r);
                return (
                  <li key={r} className="prefs-crit">
                    <span className="prefs-crit-name">{r}</span>
                    <Seg
                      small
                      label={`Weight for ${r}`}
                      options={WEIGHTS as readonly { label: string; value: number }[]}
                      value={weight(r)}
                      onChange={(w) => set({ weights: { ...prefs.weights, [r]: w } })}
                    />
                    <label className={`prefs-must${must ? ' on' : ''}`} title={`Anyone under ${MUST_HAVE_MIN}/10 here drops below everyone else`}>
                      <input
                        type="checkbox"
                        checked={must}
                        onChange={() => set({ mustHave: must ? prefs.mustHave.filter((m) => m !== r) : [...prefs.mustHave, r] })}
                      />
                      Must-have
                    </label>
                  </li>
                );
              })}
            </ul>
            <Row title="Bar to advance" help="Weighted fit score a candidate needs to show as above your bar." htmlFor="prefs-bar">
              <div className="prefs-bar">
                <input
                  id="prefs-bar"
                  type="range"
                  min={5}
                  max={9.5}
                  step={0.5}
                  value={prefs.bar}
                  onChange={(e) => set({ bar: Number(e.target.value) })}
                  style={{ ['--fill' as string]: `${((prefs.bar - 5) / 4.5) * 100}%` }}
                />
                <output htmlFor="prefs-bar" className="prefs-bar-value">
                  {prefs.bar.toFixed(1)}
                </output>
              </div>
            </Row>
          </div>

          <div className="prefs-group">
            <h3 className="prefs-group-title">
              <label htmlFor="prefs-notes">In your words</label>
            </h3>
            <textarea
              id="prefs-notes"
              className="prefs-notes"
              rows={3}
              maxLength={600}
              placeholder="e.g. Someone who has been on-call for a system real users depend on, and can ship a rough v1 in a week."
              value={prefs.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </div>

          <footer className="prefs-foot">
            <p>Weights, must-haves and stack matches re-rank the panel's scores. Ask Donna reads everything here. Level, shape, stack, traits and your words also steer Donna's follow-ups on new screens.</p>
            <div className="prefs-foot-actions">
              <button type="button" className="btn btn-sm" disabled={!custom} onClick={() => onChange(defaultPrefs())}>
                Reset
              </button>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </footer>
        </div>
      )}
    </section>
  );
}

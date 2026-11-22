import { useState, type ReactNode } from 'react';
import type { Role } from '../server/contracts';
import { defaultPrefs, isDefault, MUST_HAVE_MIN, PACE, SENIORITY, SHAPE, WEIGHTS, type HiringPrefs } from './hiringPrefs';

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
            <p>Weights and must-haves re-rank the panel's scores. Ask Donna reads everything here. Saved in this browser.</p>
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

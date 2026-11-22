import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { createCandidate, useRoles } from '../dev/uiApi';
import { Steps } from './Steps';
import { CompanyLogo } from './CompanyLogo';
import { Shell } from '../components/Shell';

export function ApplyRoute() {
  return (
    <Shell>
      <ApplyPage />
    </Shell>
  );
}

export function ApplyPage() {
  const roles = useRoles();
  const navigate = useNavigate();
  const [picked, setRoleId] = useState<string | undefined>(undefined);
  const roleId = picked ?? roles[0]?.id;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!github.trim() && !linkedin.trim()) {
      setError('Add your GitHub username or LinkedIn URL so Donna can ask about your real work.');
      return;
    }
    if (!consent) {
      setError('Please tick the consent box to continue.');
      return;
    }
    if (!roleId) {
      setError('Roles are still loading. Try again in a second.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const c = await createCandidate({
        roleId,
        name: name.trim(),
        email: email.trim(),
        githubUser: github.trim().replace(/^@/, '').replace(/^https?:\/\/github\.com\//, '') || undefined,
        linkedinUrl: linkedin.trim() || undefined,
        consent,
      });
      navigate(`/apply/${c.id}/research${location.search}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <div className="narrow">
      <Steps at={0} />
      <p className="eyebrow">Step 1 of 4</p>
      <h1 className="title">Take a 3-minute screen with Donna</h1>
      <p className="lede small">
        Donna is an AI recruiting coordinator. She'll look at what you've built, ask you three questions about it, and
        give you feedback right after.
      </p>

      <form className="form" onSubmit={submit}>
        <fieldset className="roles">
          <legend className="label">Role</legend>
          <div className="role-grid">
            {roles.map((r) => (
              <label key={r.id} className={`role-card ${roleId === r.id ? 'on' : ''}`}>
                <input type="radio" name="role" value={r.id} checked={roleId === r.id} onChange={() => setRoleId(r.id)} />
                <CompanyLogo company={r.companyName} />
                <span className="role-text">
                  <strong>{r.companyName}</strong>
                  <span>
                    {r.title.replace(/\s*\(not an official posting\)/i, '')}
                    {!r.isOfficialPosting && !/general interest/i.test(r.title) && ' · unofficial'}
                  </span>
                </span>
                {r.isOfficialPosting && <span className="role-tag">Official posting</span>}
                <span className="role-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field-row">
          <label className="field">
            <span className="label">Name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className="field">
            <span className="label">Email</span>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span className="label">GitHub username</span>
            <input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="octocat" />
          </label>
          <label className="field">
            <span className="label">LinkedIn URL</span>
            <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/…" />
          </label>
        </div>

        <label className="consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            I understand Donna is an AI interviewer, the call is recorded and scored, my public profile will be looked
            up using only what I entered here, and my first name and highlights may be shown to the company's founder.
          </span>
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn btn-primary btn-wide" type="submit" disabled={busy}>
          {busy ? 'Starting…' : 'Continue'}
        </button>
        <p className="fineprint">Unofficial hackathon demo. This is not an application to the company.</p>
      </form>
    </div>
  );
}

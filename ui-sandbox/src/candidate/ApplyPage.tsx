import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCandidate, listRoles } from '../lib/api';
import { Steps } from './Steps';

export function ApplyPage() {
  const roles = listRoles();
  const navigate = useNavigate();
  const [roleId, setRoleId] = useState(roles[0].id);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!github.trim() && !linkedin.trim()) {
      setError('Add your GitHub username or LinkedIn URL so Donna can ask about your real work.');
      return;
    }
    if (!consent) {
      setError('Please tick the consent box to continue.');
      return;
    }
    const c = createCandidate({
      roleId,
      name: name.trim(),
      email: email.trim(),
      githubUser: github.trim().replace(/^@/, '').replace(/^https?:\/\/github\.com\//, '') || undefined,
      linkedinUrl: linkedin.trim() || undefined,
    });
    navigate(`/apply/${c.id}/research${location.search}`);
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
          {roles.map((r) => (
            <label key={r.id} className={`role-opt ${roleId === r.id ? 'on' : ''}`}>
              <input type="radio" name="role" value={r.id} checked={roleId === r.id} onChange={() => setRoleId(r.id)} />
              <span>
                <strong>{r.title}</strong>
                <small>
                  {r.companyName}
                  {!r.isOfficialPosting && ' · general interest, not an official posting'}
                </small>
              </span>
            </label>
          ))}
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

        <button className="btn btn-primary btn-wide" type="submit">
          Continue
        </button>
        <p className="fineprint">Unofficial hackathon demo. This is not an application to the company.</p>
      </form>
    </div>
  );
}

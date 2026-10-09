/* Careers — a real application flow, laid out to the 2026-10-09 careers board: hero
   with the team photo, "Why work with us?", open positions, a "send your CV" strip and
   the application form. Positions are the live, staff-posted roles; when none are open
   the cards are the teams themselves, each taking an open application — the board's
   four example roles were never real adverts. Submitting calls the submitJobApplication
   callable and hands back a JOB-XXXXXX reference; it degrades to the careers inbox email
   if the backend isn't configured. */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { submitJobApplication, attachApplicationCv } from '../lib/firebase.js';
import { CV_ACCEPT } from '../lib/cv-text.js';
import { subscribeJobOpenings } from '../lib/careers.js';
import { useAuth } from '../lib/useAuth.jsx';
import PageHero from '../components/PageHero.jsx';
import { Icon } from '../components/LineIcon.jsx';
import teamPhoto from '../assets/pages/careers-team.webp';
import teamPhoto2x from '../assets/pages/careers-team@2x.webp';
import '../styles/pages.css';

const CAREERS_EMAIL = 'general@yotemarket.com';

/* A CV crosses the wire base64-encoded inside the callable, which inflates it by a third
   against a 10 MB request ceiling. 5 MB is the honest limit to state, and it is far more
   than a CV needs — anything above it is a scan that should have been a document. */
const CV_MAX_BYTES = 5 * 1024 * 1024;

/** A picked file → its base64 payload, without the data: prefix. */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('That file could not be read.'));
    r.onload = () => { const t = String(r.result || ''); const c = t.indexOf(','); resolve(c >= 0 ? t.slice(c + 1) : t); };
    r.readAsDataURL(file);
  });
}

// `id` must match CAREER_DEPTS in firebase/functions/index.js.
const DEPARTMENTS = [
  { id: 'engineering', icon: 'code', title: 'Engineering', desc: 'Build the apps, dashboards and platform that power the mall.' },
  { id: 'operations', icon: 'gear', title: 'Operations & Logistics', desc: 'Keep orders, store pickups and merchant checks running smoothly day to day.' },
  { id: 'support', icon: 'headset', title: 'Customer Support', desc: 'Help shoppers, merchants and riders get the most out of YoteMarket.' },
  { id: 'growth', icon: 'users', title: 'Growth & Partnerships', desc: 'Onboard merchants and grow the YoteMarket ecosystem.' },
  { id: 'finance', icon: 'receipt', title: 'Finance & Admin', desc: 'Keep payouts, subscriptions and compliance running smoothly.' },
  { id: 'marketing', icon: 'megaphone', title: 'Marketing & Brand', desc: 'Tell the YoteMarket story and bring more Kenyans on board.' },
];

// "Why work with us?" — what working here is actually like, each line something the
// company can stand behind (the board's "millions of Kenyans" and "mentorship" had nothing
// behind them, and there is no separate culture page: "How we work" points here).
const WHY = [
  { icon: 'rocket', title: 'Real-world impact', text: 'Your work goes straight to the local shops selling on YoteMarket and the shoppers buying from them.' },
  { icon: 'bolt', title: 'Ship fast', text: 'The web app goes live on every merge, so a good idea can reach real users the same day.' },
  { icon: 'users', title: 'Build for every role', text: 'One platform for shoppers, merchants, scouts and riders, priced in shillings and paid by M‑Pesa.' },
  { icon: 'chart', title: 'Join early', text: 'YoteMarket is young, so the people who join now help shape how the product and the team grow.' },
];

// Staff post a role's type in lowercase ('full-time'); show it as a label.
const fmtType = (t) => { const v = String(t || ''); return v ? v[0].toUpperCase() + v.slice(1) : ''; };

const deptOf = (id) => DEPARTMENTS.find((d) => d.id === id);
const deptName = (id) => (deptOf(id) || {}).title || 'Other';

function Careers() {
  const { user } = useAuth();
  const formRef = useRef(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', dept: 'engineering', role: '', links: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { ref, cv: 'saved' | 'failed' | null }
  const [err, setErr] = useState('');
  const [cv, setCv] = useState(null);     // the chosen CV file, not yet sent
  const [cvErr, setCvErr] = useState('');
  const cvRef = useRef(null);
  const [openings, setOpenings] = useState([]); // live, staff-posted roles
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Prefill from the signed-in profile.
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.displayName || '', email: f.email || user.email || '' }));
  }, [user]);

  // Live open roles — staff post/close them in the console, no deploy needed.
  useEffect(() => subscribeJobOpenings(setOpenings), []);

  // Picking a department selects it and drops the candidate straight into the form.
  const pickDept = (id) => {
    set('dept', id);
    setDone(null);
    try { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* older browsers */ }
  };

  // Checked here rather than only on the server so a 20 MB scan is refused before somebody
  // spends their data allowance uploading it.
  const pickCv = (file) => {
    setCvErr('');
    if (!file) { setCv(null); return; }
    if (file.size > CV_MAX_BYTES) {
      setCvErr(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 5 MB. Send the document rather than a scan of it.`);
      setCv(null); return;
    }
    setCv(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim()) { setErr('Please tell us your name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setErr('Please enter a valid email so we can reach you.'); return; }
    if (form.message.trim().length < 20) { setErr('Tell us a bit more about yourself — a couple of sentences at least.'); return; }
    setBusy(true);
    try {
      const r = await submitJobApplication({
        name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
        dept: form.dept, role: form.role.trim(), links: form.links.trim(), message: form.message.trim(),
      });
      // The application is in. The CV is a separate call ON PURPOSE: a file that fails to
      // upload — bad connection, a backend that predates this feature — must never cost
      // somebody their application, so this can only ever downgrade the confirmation
      // message, never turn a submitted application into an error.
      let cvState = null;
      if (cv) {
        try {
          await attachApplicationCv({
            applicationId: r.id, ref: r.ref, filename: cv.name,
            contentType: cv.type || 'application/octet-stream',
            dataBase64: await fileToBase64(cv),
          });
          cvState = 'saved';
        } catch { cvState = 'failed'; }
      }
      setDone({ ref: r.ref, cv: cvState });
      setCv(null);
    } catch (e2) {
      const msg = String(e2?.message || '');
      setErr(msg.includes('Backend not configured')
        ? `Our application form isn’t available right now — please email your CV to ${CAREERS_EMAIL}.`
        : (msg || 'Could not send your application. Please try again.'));
    } finally { setBusy(false); }
  };

  const deptLabel = (deptOf(form.dept) || {}).title || 'the team';
  const sortedRoles = [...openings].sort((a, b) =>
    String(a.dept).localeCompare(String(b.dept)) || String(a.title).localeCompare(String(b.title)));
  const toForm = () => { try { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* older browsers */ } };
  // Picking a listed role prefills the form (role and team) and jumps to it.
  const pickRole = (r) => {
    setForm((f) => ({ ...f, role: r.title || '', dept: deptOf(r.dept) ? r.dept : f.dept }));
    setDone(null);
    toForm();
  };
  // "Send your CV" with no role in mind: an open application, team left as chosen.
  const sendCv = () => { setDone(null); toForm(); };

  return (
    <main className="pg careers">
      <PageHero
        pill={{ icon: 'users', text: 'Join our team' }}
        title={<>Build the future of<br /><span className="g">local commerce in Kenya.</span></>}
        lead="At YoteMarket we build the tools Kenyan shops sell with, shoppers buy with and scouts earn with. Join the Nairobi team putting local stores online."
        actions={<>
          <a className="ph-btn" href="#positions">View open positions <Icon name="arrow" /></a>
          <a className="ph-btn is-ghost" href="#why"><Icon name="users" /> How we work</a>
        </>}
        art={{ src: teamPhoto, src2x: teamPhoto2x, width: 895, height: 363,
          alt: 'Young people in YoteMarket tops working together at a laptop in a bright office' }}
        note={'Local shops.\nBuilt in\nNairobi.'}
        noteMark
      />

      <section className="pg-sec" id="why">
        <div className="pg-wrap">
          <div className="pg-head">
            <span className="pg-kicker">How we work</span>
            <h2 className="pg-h2">Why work with us?</h2>
          </div>
          <div className="pg-cards careers-why">
            {WHY.map((w) => (
              <article className="pg-card pg-icard" key={w.title}>
                <span className="pg-ic"><Icon name={w.icon} /></span>
                <div>
                  <h3>{w.title}</h3>
                  <p>{w.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pg-sec careers-open" id="positions" aria-live="polite">
        <div className="pg-wrap">
          <div className="pg-head">
            <span className="pg-kicker">Open positions</span>
            <h2 className="pg-h2">Join our team</h2>
            <p className="pg-sub">
              {sortedRoles.length === 0
                ? 'No roles are advertised right now. Every open application lands in our hiring inbox — pick the team you would fit, tell us what you’d bring, and we’ll keep it on file for when a role opens.'
                : `${sortedRoles.length} open ${sortedRoles.length === 1 ? 'role' : 'roles'}. Pick one to apply, or send an open application below.`}
            </p>
          </div>
          <div className={'careers-roles' + (sortedRoles.length ? '' : ' is-teams')}>
            {sortedRoles.length > 0 ? sortedRoles.map((r) => {
              const d = deptOf(r.dept);
              return (
                <button type="button" className="pg-card careers-role" key={r.id} onClick={() => pickRole(r)}>
                  <span className="pg-ic"><Icon name={d ? d.icon : 'briefcase'} /></span>
                  <span className="careers-role-body">
                    <b>{r.title}</b>
                    <span className="pg-chip">{deptName(r.dept)}</span>
                    {r.location && <span className="careers-meta"><Icon name="pin" /> {r.location}</span>}
                    {r.type && <span className="careers-meta"><Icon name="briefcase" /> {fmtType(r.type)}</span>}
                    {r.summary && <span className="careers-sum">{r.summary}</span>}
                  </span>
                  <span className="pg-arrow" aria-hidden="true"><Icon name="arrow" /></span>
                  <span className="sr-only">Apply for {r.title}</span>
                </button>
              );
            }) : DEPARTMENTS.map((d) => (
              <button type="button" className={'pg-card careers-role' + (form.dept === d.id ? ' is-on' : '')} key={d.id}
                aria-pressed={form.dept === d.id}
                onClick={() => { set('dept', d.id); set('role', ''); setDone(null); toForm(); }}>
                <span className="pg-ic"><Icon name={d.icon} /></span>
                <span className="careers-role-body">
                  <b>{d.title}</b>
                  <span className="pg-chip">Open application</span>
                  <span className="careers-sum">{d.desc}</span>
                </span>
                <span className="pg-arrow" aria-hidden="true"><Icon name="arrow" /></span>
              </button>
            ))}
          </div>

          <div className="pg-strip careers-cv">
            <span className="pg-ic"><Icon name="form" /></span>
            <div>
              <h3>Don&rsquo;t see a role that fits?</h3>
              <p>Send an open application with your CV. It goes to the same hiring inbox and stays on file for when a role opens.</p>
            </div>
            <button type="button" className="pg-btn" onClick={sendCv}>Send your CV <Icon name="arrow" /></button>
          </div>
        </div>
      </section>

      <section className="pg-sec careers-apply">
        <div className="pg-wrap">
          <section className="career-box" ref={formRef}>
            {done ? (
              <div className="career-done">
                <div className="career-check"><Icon name="check" /></div>
                <h2>Application received</h2>
                <p>
                  Thanks {form.name.split(' ')[0]} — your reference is <b className="career-ref">{done.ref}</b>.
                  We’ve logged it against <b>{deptLabel}</b> and will write to <b>{form.email}</b> if we take it forward.
                </p>
                {done.cv === 'saved' && (
                  <p className="career-cv-ok"><Icon name="clip" /> Your CV is attached to the application.</p>
                )}
                {done.cv === 'failed' && (
                  /* The application is safely in — only the file did not make it, so this
                     says exactly that rather than leaving them wondering whether to re-apply. */
                  <p className="career-cv-warn">
                    <Icon name="alert" /> Your application is in, but the CV
                    didn’t upload. Email it to <a href={`mailto:${CAREERS_EMAIL}?subject=CV%20for%20${done.ref}`}>{CAREERS_EMAIL}</a> quoting {done.ref}.
                  </p>
                )}
                <button className="pg-btn is-ghost" onClick={() => { setDone(null); setForm((f) => ({ ...f, role: '', links: '', message: '' })); }}>
                  Apply for another role
                </button>
              </div>
            ) : (
              <>
                <div className="career-head">
                  <h2>Apply to {deptLabel}</h2>
                  <p>One short form, no account needed. Every application reaches the hiring team.</p>
                </div>
                <form onSubmit={submit} className="career-form">
                  <div className="career-row">
                    <label>Your name <span className="req">*</span>
                      <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Jane Wanjiru" autoComplete="name" required />
                    </label>
                    <label>Email <span className="req">*</span>
                      <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" inputMode="email" autoComplete="email" required />
                    </label>
                  </div>
                  <div className="career-row">
                    <label>Phone
                      <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="07XX XXX XXX" inputMode="tel" autoComplete="tel" />
                    </label>
                    <label>Team
                      <select value={form.dept} onChange={(e) => set('dept', e.target.value)}>
                        {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                        <option value="other">Something else</option>
                      </select>
                    </label>
                  </div>
                  <label>Role you're after
                    <input value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Flutter engineer, Support agent" />
                  </label>
                  <label>CV / portfolio links
                    <input value={form.links} onChange={(e) => set('links', e.target.value)} placeholder="Link to your CV, LinkedIn, GitHub or portfolio" />
                  </label>
                  {/* Attaching the document beats linking to it: a link rots, sits behind a
                      Drive permission prompt, or points at a profile that changes between
                      applying and being read. The field input is hidden and driven by the
                      button, so the click opens one dialog and the control can be styled. */}
                  <div className="career-cv">
                    <span className="career-cv-label">Attach your CV <span className="career-cv-opt">optional</span></span>
                    <div className="career-cv-row">
                      <button type="button" className="pg-btn is-ghost career-cv-btn" onClick={() => cvRef.current?.click()}>
                        <Icon name="clip" /> {cv ? 'Choose a different file' : 'Choose a file'}
                      </button>
                      {cv && (
                        <span className="career-cv-file">
                          <Icon name="file" /> {cv.name} <span>({(cv.size / 1024).toFixed(0)} KB)</span>
                          <button type="button" className="career-cv-x" onClick={() => { setCv(null); setCvErr(''); }} aria-label="Remove attached CV">
                            <Icon name="x" />
                          </button>
                        </span>
                      )}
                    </div>
                    <input
                      ref={cvRef} type="file" accept={CV_ACCEPT} hidden
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        // Cleared first so picking the SAME file again still fires a change
                        // event — otherwise a retry after a rejection does nothing at all.
                        e.target.value = '';
                        pickCv(f);
                      }}
                    />
                    <span className="career-cv-hint">PDF, Word (.docx) or plain text, up to 5 MB. Held privately for the hiring team, never published.</span>
                    {cvErr && <span className="career-cv-err"><Icon name="alert" /> {cvErr}</span>}
                  </div>
                  <label>Tell us about yourself <span className="req">*</span>
                    <textarea value={form.message} onChange={(e) => set('message', e.target.value)} rows={5} placeholder="What you've built or run, what you're great at, and why YoteMarket." required />
                  </label>
                  {err && <div className="career-err"><Icon name="alert" /> {err}</div>}
                  <button className="pg-btn career-submit" type="submit" disabled={busy}>
                    {busy ? <><span className="pg-spin" aria-hidden="true"></span> Sending…</> : <><Icon name="send" /> Send application</>}
                  </button>
                  <p className="career-privacy">
                    <Icon name="lock" /> Your details are used only to consider you for a role, and deleted if you ask. Prefer email? <a href={`mailto:${CAREERS_EMAIL}?subject=Careers%20at%20YoteMarket`}>{CAREERS_EMAIL}</a>
                  </p>
                </form>
              </>
            )}
          </section>

          <p className="careers-field">
            Looking for flexible field work instead? Earn as a{' '}
            <Link to="/marketers">marketer</Link>, or sign up as a{' '}
            <Link to="/rider">rider</Link> for when delivery resumes. No office required.
          </p>
        </div>
      </section>

    </main>
  );
}

export default Careers;

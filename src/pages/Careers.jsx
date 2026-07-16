/* Careers — a real application flow. Departments select into the form; submitting
   calls the submitJobApplication callable and hands back a JOB-XXXXXX reference.
   Degrades to the careers inbox email if the backend isn't configured. */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { submitJobApplication } from '../lib/firebase.js';
import { subscribeJobOpenings } from '../lib/careers.js';
import { useAuth } from '../lib/useAuth.jsx';

const CAREERS_EMAIL = 'general@yotemarket.com';

// `id` must match CAREER_DEPTS in firebase/functions/index.js.
const DEPARTMENTS = [
  { id: 'engineering', icon: 'fa-code', tint: 'linear-gradient(135deg,#7C2BD4,#A020F0)', title: 'Engineering', desc: 'Build the apps, dashboards and platform that power the mall.' },
  { id: 'operations', icon: 'fa-truck-ramp-box', tint: 'linear-gradient(135deg,#3b82f6,#2563eb)', title: 'Operations & Logistics', desc: 'Run the hubs and last-mile delivery network across counties.' },
  { id: 'support', icon: 'fa-headset', tint: 'linear-gradient(135deg,#009B3A,#057a30)', title: 'Customer Support', desc: 'Help shoppers, merchants and riders get the most out of YoteMarket.' },
  { id: 'growth', icon: 'fa-handshake', tint: 'linear-gradient(135deg,#E89B0C,#F4B530)', title: 'Growth & Partnerships', desc: 'Onboard merchants and grow the YoteMarket ecosystem.' },
  { id: 'finance', icon: 'fa-calculator', tint: 'linear-gradient(135deg,#5B16A8,#7C2BD4)', title: 'Finance & Admin', desc: 'Keep payouts, compliance and the office running smoothly.' },
  { id: 'marketing', icon: 'fa-bullhorn', tint: 'linear-gradient(135deg,#ec4899,#A020F0)', title: 'Marketing & Brand', desc: 'Tell the YoteMarket story and bring more Kenyans on board.' },
];

function Careers() {
  const { user } = useAuth();
  const formRef = useRef(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', dept: 'engineering', role: '', links: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { ref }
  const [err, setErr] = useState('');
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
      setDone({ ref: r.ref });
    } catch (e2) {
      const msg = String(e2?.message || '');
      setErr(msg.includes('Backend not configured')
        ? `Our application form isn’t available right now — please email your CV to ${CAREERS_EMAIL}.`
        : (msg || 'Could not send your application. Please try again.'));
    } finally { setBusy(false); }
  };

  const deptLabel = (DEPARTMENTS.find((d) => d.id === form.dept) || {}).title || 'the team';
  const countFor = (id) => openings.filter((o) => o.dept === id).length;
  const deptRoles = openings.filter((o) => o.dept === form.dept)
    .sort((a, b) => String(a.title).localeCompare(String(b.title)));
  // Picking a listed role prefills the form and jumps to it.
  const pickRole = (title) => {
    set('role', title);
    setDone(null);
    try { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* older browsers */ }
  };

  return (
    <main>
      <section className="pad">
        <div className="wrap">
          <div className="page-head">
            <span className="eyebrow"><i className="fas fa-briefcase"></i> Careers</span>
            <h1>Build Kenya's virtual mall with us</h1>
            <p>
              We're growing our team in Nairobi. If you want to do your best work on a product used across the
              country, we'd love to meet you. Pick the team you'd fit — then tell us about yourself.
            </p>
          </div>

          <div className="dept-grid">
            {DEPARTMENTS.map((d) => (
              <article
                className={'dept-card career-pick' + (form.dept === d.id ? ' is-on' : '')}
                key={d.id}
                role="button"
                tabIndex={0}
                aria-pressed={form.dept === d.id}
                onClick={() => pickDept(d.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickDept(d.id); } }}
              >
                <div className="di" style={{ background: d.tint }}><i className={`fas ${d.icon}`}></i></div>
                <h4>{d.title}</h4>
                <p>{d.desc}</p>
                <span className="career-apply">
                  {countFor(d.id) > 0 && <span className="career-count">{countFor(d.id)} open</span>}
                  {form.dept === d.id ? <><i className="fas fa-check"></i> Selected</> : <>View roles <i className="fas fa-arrow-right"></i></>}
                </span>
              </article>
            ))}
          </div>

          {/* Open roles in the selected team — live from the console. */}
          <section className="career-roles" aria-live="polite">
            <div className="career-roles-head">
              <h2>Open roles · {deptLabel}</h2>
              <span>{deptRoles.length} {deptRoles.length === 1 ? 'position' : 'positions'}</span>
            </div>
            {deptRoles.length ? (
              <div className="role-list">
                {deptRoles.map((r) => (
                  <article className="role-card" key={r.id}>
                    <div className="role-main">
                      <h4>{r.title}</h4>
                      <div className="role-meta">
                        <span><i className="fas fa-briefcase"></i> {r.type}</span>
                        {r.location && <span><i className="fas fa-location-dot"></i> {r.location}</span>}
                      </div>
                      {r.summary && <p>{r.summary}</p>}
                    </div>
                    <button className="btn btn-primary" onClick={() => pickRole(r.title)}>Apply <i className="fas fa-arrow-right"></i></button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="role-empty">
                <i className="fas fa-inbox"></i>
                <div>
                  <b>No advertised roles in {deptLabel} right now.</b>
                  <p>We still read every open application — tell us what you'd bring and we'll keep you on file for when one opens.</p>
                </div>
                <button className="btn btn-outline" onClick={() => { setDone(null); try { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* noop */ } }}>Send an open application</button>
              </div>
            )}
          </section>

          <section className="career-box" ref={formRef}>
            {done ? (
              <div className="career-done">
                <div className="career-check"><i className="fas fa-check"></i></div>
                <h2>Application received</h2>
                <p>
                  Thanks {form.name.split(' ')[0]} — your reference is <b className="career-ref">{done.ref}</b>.
                  We’ve logged it against <b>{deptLabel}</b> and will reply to <b>{form.email}</b>.
                </p>
                <button className="btn btn-outline" onClick={() => { setDone(null); setForm((f) => ({ ...f, role: '', links: '', message: '' })); }}>
                  Apply for another role
                </button>
              </div>
            ) : (
              <>
                <div className="career-head">
                  <h2>Apply to {deptLabel}</h2>
                  <p>One short form — no account needed. We read every application.</p>
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
                    <input value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Flutter engineer, Hub supervisor" />
                  </label>
                  <label>CV / portfolio links
                    <input value={form.links} onChange={(e) => set('links', e.target.value)} placeholder="Link to your CV, LinkedIn, GitHub or portfolio" />
                  </label>
                  <label>Tell us about yourself <span className="req">*</span>
                    <textarea value={form.message} onChange={(e) => set('message', e.target.value)} rows={5} placeholder="What you've built or run, what you're great at, and why YoteMarket." required />
                  </label>
                  {err && <div className="career-err"><i className="fas fa-circle-exclamation"></i> {err}</div>}
                  <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
                    {busy ? <><i className="fas fa-circle-notch fa-spin"></i> Sending…</> : <><i className="fas fa-paper-plane"></i> Send application</>}
                  </button>
                  <p className="career-privacy">
                    <i className="fas fa-lock"></i> Your details are used only to consider you for a role. Prefer email? <a href={`mailto:${CAREERS_EMAIL}?subject=Careers%20at%20YoteMarket`}>{CAREERS_EMAIL}</a>
                  </p>
                </form>
              </>
            )}
          </section>

          <p className="price-note" style={{ marginTop: '28px' }}>
            Looking for flexible field work instead? Earn as a{' '}
            <Link to="/marketers" style={{ color: 'var(--purple)', fontWeight: 600 }}>marketer</Link> or{' '}
            <Link to="/rider" style={{ color: 'var(--purple)', fontWeight: 600 }}>rider</Link> — no office required.
          </p>
        </div>
      </section>

      <style>{`
      .career-pick{ cursor:pointer; transition:border-color .15s, transform .15s, box-shadow .15s; }
      .career-pick:hover{ transform:translateY(-2px); }
      .career-pick.is-on{ border-color:var(--purple); box-shadow:0 0 0 3px color-mix(in srgb,var(--purple) 18%, transparent); }
      .career-apply{ display:inline-flex; align-items:center; gap:7px; margin-top:12px; font-size:13px; font-weight:700; color:var(--purple); flex-wrap:wrap; }
      .career-count{ font-size:11px; font-weight:800; padding:2px 8px; border-radius:9999px; background:color-mix(in srgb,var(--purple) 14%, transparent); }

      .career-roles{ margin-top:34px; }
      .career-roles-head{ display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
      .career-roles-head h2{ font-size:22px; font-weight:800; color:var(--t1); }
      .career-roles-head span{ font-size:13px; color:var(--t3); font-weight:600; }
      .role-list{ display:flex; flex-direction:column; gap:12px; }
      .role-card{ display:flex; align-items:center; justify-content:space-between; gap:18px; flex-wrap:wrap;
        background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:20px 22px; transition:border-color .15s, transform .15s; }
      .role-card:hover{ border-color:var(--purple); transform:translateY(-1px); }
      .role-main{ flex:1; min-width:220px; }
      .role-main h4{ font-size:16.5px; font-weight:700; color:var(--t1); }
      .role-meta{ display:flex; gap:14px; flex-wrap:wrap; margin-top:6px; font-size:12.5px; color:var(--t3); }
      .role-meta i{ margin-right:5px; }
      .role-main p{ margin-top:9px; font-size:14px; color:var(--t2); line-height:1.6; }
      .role-empty{ display:flex; align-items:center; gap:16px; flex-wrap:wrap; background:var(--surface2); border:1px dashed var(--line2); border-radius:18px; padding:22px; }
      .role-empty > i{ font-size:22px; color:var(--t3); }
      .role-empty div{ flex:1; min-width:220px; }
      .role-empty b{ color:var(--t1); font-size:15px; }
      .role-empty p{ margin-top:5px; font-size:13.5px; color:var(--t3); line-height:1.6; }
      .career-box{ margin-top:34px; background:var(--surface); border:1px solid var(--line); border-radius:24px; padding:34px; box-shadow:var(--shadow-lg); scroll-margin-top:90px; }
      .career-head h2{ font-size:26px; font-weight:800; color:var(--t1); }
      .career-head p{ color:var(--t3); margin-top:8px; font-size:15px; }
      .career-form{ margin-top:22px; display:flex; flex-direction:column; gap:16px; }
      .career-row{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
      .career-form label{ display:flex; flex-direction:column; gap:7px; font-size:13.5px; font-weight:600; color:var(--t2); }
      .career-form .req{ color:var(--purple); }
      .career-form input, .career-form select, .career-form textarea{ padding:12px 14px; border-radius:12px; border:1px solid var(--line2);
        background:var(--bg2); color:var(--t1); font-size:15px; font-family:inherit; outline:none; transition:.15s; resize:vertical; }
      .career-form input:focus, .career-form select:focus, .career-form textarea:focus{ border-color:var(--purple); background:var(--surface); box-shadow:0 0 0 3px color-mix(in srgb,var(--purple) 16%, transparent); }
      .career-form .btn-lg{ justify-content:center; margin-top:4px; }
      .career-err{ display:flex; align-items:center; gap:9px; font-size:14px; color:#dc2626; background:color-mix(in srgb,#dc2626 10%, transparent); border-radius:11px; padding:11px 14px; }
      .career-privacy{ font-size:12.5px; color:var(--t3); display:flex; align-items:center; gap:7px; margin:0; flex-wrap:wrap; }
      .career-privacy a{ color:var(--purple); font-weight:600; }
      .career-done{ text-align:center; }
      .career-check{ width:64px; height:64px; border-radius:50%; margin:0 auto 18px; display:flex; align-items:center; justify-content:center;
        background:color-mix(in srgb,#10b981 16%, transparent); color:#10b981; font-size:26px; }
      .career-done h2{ font-size:24px; font-weight:800; color:var(--t1); }
      .career-done p{ color:var(--t2); margin:12px 0 22px; line-height:1.7; }
      .career-ref{ font-family:'JetBrains Mono',monospace; color:var(--purple); background:var(--surface2); padding:2px 9px; border-radius:7px; }
      @media (max-width:640px){ .career-row{ grid-template-columns:1fr; } .career-box{ padding:24px; } }
      `}</style>
    </main>
  );
}

export default Careers;

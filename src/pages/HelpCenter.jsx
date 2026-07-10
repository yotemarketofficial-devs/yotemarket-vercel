/* HelpCenter.jsx — public Help Center (/help): searchable FAQ knowledge base +
   "Submit a request" ticket form + a signed-in "My requests" tracker. Ticket
   submission calls the createSupportTicket callable; degrades gracefully to an
   email fallback when the backend isn't configured. */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FAQS, FAQ_CATEGORIES, TICKET_CATEGORIES } from '../lib/faqs.js';
import { createSupportTicket, listMySupportTickets } from '../lib/firebase.js';
import { useAuth } from '../lib/useAuth.jsx';

const SUPPORT_EMAIL = 'support@yotemarket.com';

const STATUS_META = {
  open:     { label: 'Open',     color: 'var(--gold)' },
  pending:  { label: 'In progress', color: 'var(--purple)' },
  resolved: { label: 'Resolved', color: '#10b981' },
  closed:   { label: 'Closed',   color: 'var(--t3)' },
};

function FaqItem({ item, open, onToggle }) {
  return (
    <div className={`help-faq ${open ? 'open' : ''}`}>
      <button className="help-faq-q" onClick={onToggle} aria-expanded={open}>
        <span>{item.q}</span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} aria-hidden="true" />
      </button>
      <div className="help-faq-a" style={{ maxHeight: open ? 500 : 0 }}>
        <p>{item.a}</p>
      </div>
    </div>
  );
}

export default function HelpCenter() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');
  const [openIdx, setOpenIdx] = useState(null);

  useEffect(() => { document.title = 'Help Center — YoteMarket'; }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((f) => {
      if (cat !== 'all' && f.cat !== cat) return false;
      if (!q) return true;
      return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
    });
  }, [query, cat]);

  return (
    <main className="help">
      {/* Hero + search */}
      <section className="help-hero">
        <div className="wrap">
          <span className="eyebrow"><i className="fas fa-life-ring" /> Help Center</span>
          <h1>How can we <span className="g">help?</span></h1>
          <p className="lead">Search answers, browse common questions, or send us a request — we usually reply within a day.</p>
          <div className="help-search">
            <i className="fas fa-magnifying-glass" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpenIdx(null); }}
              placeholder="Search help (e.g. refund, pickup code, M-Pesa)…"
              aria-label="Search help articles"
            />
            {query && <button className="help-search-clear" onClick={() => setQuery('')} aria-label="Clear search"><i className="fas fa-xmark" /></button>}
          </div>
        </div>
      </section>

      <div className="wrap help-body">
        {/* Category chips */}
        <div className="help-cats">
          <button className={`help-chip ${cat === 'all' ? 'on' : ''}`} onClick={() => { setCat('all'); setOpenIdx(null); }}>
            <i className="fas fa-border-all" /> All topics
          </button>
          {FAQ_CATEGORIES.map((c) => (
            <button key={c.id} className={`help-chip ${cat === c.id ? 'on' : ''}`} onClick={() => { setCat(c.id); setOpenIdx(null); }}>
              <i className={`fas ${c.icon}`} /> {c.label}
            </button>
          ))}
        </div>

        {/* FAQ list */}
        <section className="help-faqs">
          {results.length === 0 ? (
            <div className="help-empty">
              <i className="fas fa-comment-dots" />
              <p>No answers match “{query}”. Try another word — or send us a request below.</p>
            </div>
          ) : (
            results.map((item, i) => (
              <FaqItem key={item.q} item={item} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? null : i)} />
            ))
          )}
        </section>

        {/* Ticket + contact */}
        <div className="help-grid">
          <TicketForm user={user} />
          <aside className="help-side">
            <MyRequests user={user} />
            <div className="help-contact-card">
              <h3>Prefer to talk?</h3>
              <a href={`mailto:${SUPPORT_EMAIL}`}><i className="fas fa-envelope" /> {SUPPORT_EMAIL}</a>
              <a href="tel:0720730861"><i className="fas fa-phone" /> 0720 730 861</a>
              <p className="help-hours">Mon–Sat · 8am–6pm EAT</p>
              <div className="help-links">
                <Link to="/terms">Terms of Service</Link>
                <Link to="/privacy">Privacy Policy</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <HelpStyles />
    </main>
  );
}

/* ── Submit a request ─────────────────────────────────────────────────────── */
function TicketForm({ user }) {
  const [form, setForm] = useState({ name: '', email: '', category: 'order', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { ref }
  const [err, setErr] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Prefill from the signed-in profile.
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.displayName || '', email: f.email || user.email || '' }));
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setErr('Please enter a valid email so we can reply.'); return; }
    if (!form.subject.trim()) { setErr('Add a short subject.'); return; }
    if (form.message.trim().length < 5) { setErr('Tell us a little more about the issue.'); return; }
    setBusy(true);
    try {
      const r = await createSupportTicket({
        name: form.name.trim(), email: form.email.trim(), category: form.category,
        subject: form.subject.trim(), message: form.message.trim(),
      });
      setDone({ ref: r.ref });
    } catch (e2) {
      const msg = String(e2?.message || '');
      if (msg.includes('Backend not configured')) {
        setErr(`Our request form isn’t available right now — please email us at ${SUPPORT_EMAIL} and we’ll help.`);
      } else {
        setErr(msg || 'Could not send your request. Please try again.');
      }
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <section className="help-ticket help-ticket-done">
        <div className="help-done-check"><i className="fas fa-check" /></div>
        <h2>Request received</h2>
        <p>Thanks — your reference is <b className="help-ref">{done.ref}</b>. We’ve logged it and will reply to <b>{form.email}</b>{user ? ' (and in the app)' : ''}.</p>
        <button className="btn btn-outline" onClick={() => { setDone(null); setForm((f) => ({ ...f, subject: '', message: '' })); }}>Submit another request</button>
      </section>
    );
  }

  return (
    <section className="help-ticket">
      <div className="help-ticket-head">
        <h2>Still need help?</h2>
        <p>Send us a request and we’ll get back to you by email — usually within a day.</p>
      </div>
      <form onSubmit={submit} className="help-form">
        <div className="help-form-row">
          <label>Your name
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Jane Wanjiru" />
          </label>
          <label>Email <span className="req">*</span>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" required />
          </label>
        </div>
        <label>What’s it about?
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {TICKET_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label>Subject <span className="req">*</span>
          <input value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="e.g. Haven’t received my pickup code" required />
        </label>
        <label>How can we help? <span className="req">*</span>
          <textarea value={form.message} onChange={(e) => set('message', e.target.value)} rows={5} placeholder="Share the details — include your order reference or M-Pesa code if relevant." required />
        </label>
        {err && <div className="help-err"><i className="fas fa-circle-exclamation" /> {err}</div>}
        <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
          {busy ? <><i className="fas fa-circle-notch fa-spin" /> Sending…</> : <><i className="fas fa-paper-plane" /> Send request</>}
        </button>
        <p className="help-privacy"><i className="fas fa-lock" /> Your details are used only to answer your request.</p>
      </form>
    </section>
  );
}

/* ── My requests (signed-in tracker) ──────────────────────────────────────── */
function MyRequests({ user }) {
  const [state, setState] = useState({ loading: false, loaded: false, tickets: [] });
  const load = async () => {
    setState((s) => ({ ...s, loading: true }));
    try { const r = await listMySupportTickets(); setState({ loading: false, loaded: true, tickets: r.tickets || [] }); }
    catch { setState({ loading: false, loaded: true, tickets: [] }); }
  };
  if (!user) return null;
  return (
    <div className="help-mine">
      <div className="help-mine-head">
        <h3><i className="fas fa-inbox" /> My requests</h3>
        {!state.loaded && <button className="help-link-btn" onClick={load} disabled={state.loading}>{state.loading ? 'Loading…' : 'View'}</button>}
      </div>
      {state.loaded && (state.tickets.length === 0
        ? <p className="help-mine-empty">You haven’t opened any requests yet.</p>
        : <ul className="help-mine-list">
            {state.tickets.map((t) => {
              const m = STATUS_META[t.status] || STATUS_META.open;
              const lastReply = (t.replies || []).filter((r) => r.author === 'staff').slice(-1)[0];
              return (
                <li key={t.id}>
                  <div className="help-mine-top">
                    <span className="help-mine-subj">{t.subject}</span>
                    <span className="help-mine-status" style={{ color: m.color, background: `color-mix(in srgb, ${m.color} 14%, transparent)` }}>{m.label}</span>
                  </div>
                  <div className="help-mine-ref">{t.ref}</div>
                  {lastReply && <div className="help-mine-reply"><b>Support:</b> {lastReply.text}</div>}
                </li>
              );
            })}
          </ul>)}
    </div>
  );
}

/* ── scoped styles (marketing tokens) ─────────────────────────────────────── */
function HelpStyles() {
  return (
    <style>{`
      .help-hero{ position:relative; padding:56px 0 34px; overflow:hidden; }
      .help-hero::before{ content:""; position:absolute; inset:0; z-index:0; pointer-events:none;
        background:radial-gradient(60% 80% at 12% 0%, color-mix(in srgb,var(--purple) 22%, transparent), transparent 60%),
                   radial-gradient(50% 70% at 95% 10%, color-mix(in srgb,var(--gold-bright) 16%, transparent), transparent 55%); }
      .help-hero .wrap{ position:relative; z-index:1; }
      .help-hero h1{ font-size:clamp(34px,5vw,54px); margin-top:16px; }
      .help-hero .lead{ margin-top:14px; }
      .help-search{ position:relative; margin-top:26px; max-width:560px; }
      .help-search i.fa-magnifying-glass{ position:absolute; left:18px; top:50%; transform:translateY(-50%); color:var(--t3); }
      .help-search input{ width:100%; padding:16px 44px 16px 46px; border-radius:14px; border:1px solid var(--line2);
        background:var(--surface); color:var(--t1); font-size:16px; font-family:inherit; box-shadow:var(--shadow); outline:none; transition:.15s; }
      .help-search input:focus{ border-color:var(--purple); box-shadow:0 0 0 4px color-mix(in srgb,var(--purple) 18%, transparent); }
      .help-search-clear{ position:absolute; right:12px; top:50%; transform:translateY(-50%); width:30px; height:30px; border:none; background:var(--surface2); color:var(--t2); border-radius:50%; cursor:pointer; }

      .help-body{ padding-bottom:72px; }
      .help-cats{ display:flex; flex-wrap:wrap; gap:10px; margin:6px 0 26px; }
      .help-chip{ display:inline-flex; align-items:center; gap:8px; padding:9px 15px; border-radius:999px; font-size:14px; font-weight:600;
        border:1px solid var(--line2); background:var(--surface); color:var(--t2); cursor:pointer; transition:.15s; font-family:inherit; }
      .help-chip:hover{ border-color:var(--purple); color:var(--purple); }
      .help-chip.on{ background:var(--grad); color:#fff; border-color:transparent; box-shadow:0 10px 22px -10px color-mix(in srgb,var(--purple) 70%, transparent); }

      .help-faqs{ display:flex; flex-direction:column; gap:12px; max-width:820px; }
      .help-faq{ border:1px solid var(--line); border-radius:16px; background:var(--surface); box-shadow:var(--shadow); overflow:hidden; transition:border-color .2s; }
      .help-faq.open{ border-color:color-mix(in srgb,var(--purple) 40%, var(--line)); }
      .help-faq-q{ width:100%; display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 22px;
        background:none; border:none; cursor:pointer; text-align:left; font-family:inherit; font-size:16.5px; font-weight:600; color:var(--t1); }
      .help-faq-q i{ color:var(--purple); font-size:14px; flex-shrink:0; }
      .help-faq-a{ overflow:hidden; transition:max-height .3s ease; }
      .help-faq-a p{ margin:0; padding:0 22px 20px; color:var(--t2); line-height:1.7; font-size:15.5px; }

      .help-empty{ text-align:center; padding:48px 20px; color:var(--t3); }
      .help-empty i{ font-size:34px; color:var(--purple); opacity:.5; margin-bottom:12px; }

      .help-grid{ display:grid; grid-template-columns:1.5fr 1fr; gap:28px; margin-top:52px; align-items:start; }
      .help-ticket{ background:var(--surface); border:1px solid var(--line); border-radius:24px; padding:34px; box-shadow:var(--shadow-lg); }
      .help-ticket-head h2{ font-size:26px; font-weight:800; color:var(--t1); }
      .help-ticket-head p{ color:var(--t3); margin-top:8px; font-size:15px; }
      .help-form{ margin-top:22px; display:flex; flex-direction:column; gap:16px; }
      .help-form-row{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
      .help-form label{ display:flex; flex-direction:column; gap:7px; font-size:13.5px; font-weight:600; color:var(--t2); }
      .help-form .req{ color:var(--purple); }
      .help-form input, .help-form select, .help-form textarea{ padding:12px 14px; border-radius:12px; border:1px solid var(--line2);
        background:var(--bg2); color:var(--t1); font-size:15px; font-family:inherit; outline:none; transition:.15s; resize:vertical; }
      .help-form input:focus, .help-form select:focus, .help-form textarea:focus{ border-color:var(--purple); background:var(--surface); box-shadow:0 0 0 3px color-mix(in srgb,var(--purple) 16%, transparent); }
      .help-form .btn-lg{ justify-content:center; margin-top:4px; }
      .help-err{ display:flex; align-items:center; gap:9px; font-size:14px; color:#dc2626; background:color-mix(in srgb,#dc2626 10%, transparent); border-radius:11px; padding:11px 14px; }
      .help-privacy{ font-size:12.5px; color:var(--t3); display:flex; align-items:center; gap:7px; margin:0; }

      .help-ticket-done{ text-align:center; }
      .help-done-check{ width:64px; height:64px; border-radius:50%; margin:0 auto 18px; display:flex; align-items:center; justify-content:center;
        background:color-mix(in srgb,#10b981 16%, transparent); color:#10b981; font-size:26px; }
      .help-ticket-done h2{ font-size:24px; font-weight:800; color:var(--t1); }
      .help-ticket-done p{ color:var(--t2); margin:12px 0 22px; line-height:1.7; }
      .help-ref{ font-family:'JetBrains Mono',monospace; color:var(--purple); background:var(--surface2); padding:2px 9px; border-radius:7px; }

      .help-side{ display:flex; flex-direction:column; gap:20px; }
      .help-mine, .help-contact-card{ background:var(--surface2); border:1px solid var(--line); border-radius:20px; padding:24px; }
      .help-mine-head{ display:flex; align-items:center; justify-content:space-between; }
      .help-mine-head h3, .help-contact-card h3{ font-size:16px; font-weight:700; color:var(--t1); margin:0; display:flex; align-items:center; gap:9px; }
      .help-mine-head h3 i, .help-contact-card i{ color:var(--purple); }
      .help-link-btn{ background:none; border:none; color:var(--purple); font-weight:600; font-size:14px; cursor:pointer; font-family:inherit; }
      .help-mine-empty{ font-size:14px; color:var(--t3); margin:12px 0 0; }
      .help-mine-list{ list-style:none; padding:0; margin:14px 0 0; display:flex; flex-direction:column; gap:12px; }
      .help-mine-list li{ border:1px solid var(--line); border-radius:13px; padding:13px 15px; background:var(--surface); }
      .help-mine-top{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
      .help-mine-subj{ font-weight:600; color:var(--t1); font-size:14px; }
      .help-mine-status{ font-size:11px; font-weight:700; padding:3px 9px; border-radius:999px; white-space:nowrap; }
      .help-mine-ref{ font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--t3); margin-top:4px; }
      .help-mine-reply{ font-size:13px; color:var(--t2); margin-top:8px; line-height:1.55; }
      .help-contact-card a{ display:flex; align-items:center; gap:10px; color:var(--t2); font-size:14.5px; margin-top:12px; font-weight:500; }
      .help-contact-card a:hover{ color:var(--purple); }
      .help-hours{ font-size:13px; color:var(--t3); margin:14px 0 0; }
      .help-links{ display:flex; gap:16px; margin-top:16px; padding-top:16px; border-top:1px solid var(--line); }
      .help-links a{ font-size:13px; color:var(--t3); }
      .help-links a:hover{ color:var(--purple); }

      @media (max-width:860px){ .help-grid{ grid-template-columns:1fr; } }
      @media (max-width:520px){ .help-form-row{ grid-template-columns:1fr; } .help-ticket{ padding:24px; } }
    `}</style>
  );
}

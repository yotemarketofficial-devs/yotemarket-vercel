import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { submitRiderApplication } from '../lib/firebase.js';
import { useAuth } from '../lib/useAuth.jsx';

// Offered vehicles — a subset of RIDER_VEHICLES in firebase/functions/index.js.
// Bicycle and on-foot are intentionally NOT offered. The server still accepts them
// so applications submitted before this change stay valid and render in the console.
const VEHICLES = [
  { id: 'motorbike', label: 'Motorbike', icon: 'fa-motorcycle' },
  { id: 'tuktuk', label: 'Tuk-tuk', icon: 'fa-car-side' },
  { id: 'car', label: 'Car', icon: 'fa-car' },
  { id: 'van', label: 'Van / pickup', icon: 'fa-truck' },
];
const AVAILABILITY = [
  { id: 'full-time', label: 'Full-time' },
  { id: 'part-time', label: 'Part-time' },
  { id: 'weekends', label: 'Weekends only' },
];

const FEATURES = [
  { icon: 'fa-route', tint: 'linear-gradient(135deg,#7C2BD4,#A020F0)', title: 'Smart routes', desc: 'We route you efficiently so every run is worth your time.' },
  { icon: 'fa-coins', tint: 'linear-gradient(135deg,#E89B0C,#F4B530)', title: 'Per-run payouts', desc: 'Transparent pay shown up front — see exactly what you\'ll earn before you accept.' },
  { icon: 'fa-mobile-screen', tint: 'linear-gradient(135deg,#009B3A,#057a30)', title: 'Cash out to M-Pesa', desc: 'Earnings settle straight to your M-Pesa — no fees, no waiting.' },
  { icon: 'fa-clock', tint: 'linear-gradient(135deg,#3b82f6,#2563eb)', title: 'Flexible hours', desc: 'Zero-hour contract — ride when it suits you, wherever you are.' },
];

/* Join form — a real application into rider_applications, vetted by logistics. */
function RiderJoin({ formRef }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', county: '', vehicle: 'motorbike', plate: '', licence: '', logbook: '', policeClearance: '', availability: 'full-time', note: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { ref }
  const [err, setErr] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.displayName || '', email: f.email || user.email || '' }));
  }, [user]);

  const needsPlate = ['motorbike', 'tuktuk', 'car', 'van'].includes(form.vehicle);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim()) { setErr('Please tell us your name.'); return; }
    if (form.phone.replace(/\D/g, '').length < 9) { setErr('Enter the M-Pesa number we should pay and reach you on.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setErr('Enter a valid email — you’ll sign in to the rider app with it.'); return; }
    if (!form.county.trim()) { setErr('Tell us where you’ll be riding.'); return; }
    setBusy(true);
    try {
      const r = await submitRiderApplication({
        name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), county: form.county.trim(),
        vehicle: form.vehicle, plate: form.plate.trim(), licence: form.licence.trim(),
        logbook: form.logbook.trim(), policeClearance: form.policeClearance.trim(),
        availability: form.availability, note: form.note.trim(),
      });
      setDone({ ref: r.ref });
    } catch (e2) {
      const msg = String(e2?.message || '');
      setErr(msg.includes('Backend not configured')
        ? 'Applications aren’t available right now — please try again shortly.'
        : (msg || 'Could not send your application. Please try again.'));
    } finally { setBusy(false); }
  };

  return (
    <section className="pad" style={{ paddingTop: '8px' }} id="join">
      <div className="wrap">
        <div className="rider-box" ref={formRef}>
          {done ? (
            <div className="rider-done">
              <div className="rider-check"><i className="fas fa-check"></i></div>
              <h2>You're on the list</h2>
              <p>
                Asante {form.name.split(' ')[0]} — your reference is <b className="rider-ref">{done.ref}</b>.
                Our logistics team vets applications and will reach you on <b>{form.phone}</b> with next steps.
              </p>
              <Link className="btn btn-outline" to="/">Back to home</Link>
            </div>
          ) : (
            <>
              <div className="rider-head">
                <div className="kicker">Join the network</div>
                <h2>Start riding with YoteMarket</h2>
                <p>Tell us about you and your ride. It takes a minute — no account needed, and we'll call you to verify.</p>
              </div>
              <form onSubmit={submit} className="rider-form">
                <div className="rider-row">
                  <label>Full name <span className="req">*</span>
                    <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Otieno Kamau" autoComplete="name" required />
                  </label>
                  <label>M-Pesa phone <span className="req">*</span>
                    <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="07XX XXX XXX" inputMode="tel" autoComplete="tel" required />
                  </label>
                </div>
                <div className="rider-row">
                  <label>Email <span className="req">*</span>
                    <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" inputMode="email" autoComplete="email" required />
                  </label>
                  <label>Where will you ride? <span className="req">*</span>
                    <input value={form.county} onChange={(e) => set('county', e.target.value)} placeholder="e.g. Nairobi — Westlands, Kilimani" required />
                  </label>
                </div>

                <div>
                  <span className="rider-lbl">Your ride</span>
                  <div className="rider-vehicles">
                    {VEHICLES.map((v) => (
                      <button type="button" key={v.id} onClick={() => set('vehicle', v.id)}
                        className={'rider-veh' + (form.vehicle === v.id ? ' is-on' : '')} aria-pressed={form.vehicle === v.id}>
                        <i className={`fas ${v.icon}`}></i> {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rider-row">
                  {needsPlate && (
                    <label>Number plate
                      <input value={form.plate} onChange={(e) => set('plate', e.target.value.toUpperCase())} placeholder="KMD 123A" />
                    </label>
                  )}
                  <label>Driving licence no.
                    <input value={form.licence} onChange={(e) => set('licence', e.target.value)} placeholder="Optional — speeds up vetting" />
                  </label>
                  <label>Availability
                    <select value={form.availability} onChange={(e) => set('availability', e.target.value)}>
                      {AVAILABILITY.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </label>
                </div>

                <div className="rider-row">
                  <label>Logbook / authorization no.
                    <input value={form.logbook} onChange={(e) => set('logbook', e.target.value)} placeholder="Optional — speeds up vetting" />
                  </label>
                  <label>Police clearance no.
                    <input value={form.policeClearance} onChange={(e) => set('policeClearance', e.target.value)} placeholder="Optional — speeds up vetting" />
                  </label>
                </div>

                <label>Anything else?
                  <textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={3} placeholder="Riding experience, areas you know well, when you can start…" />
                </label>

                {err && <div className="rider-err"><i className="fas fa-circle-exclamation"></i> {err}</div>}
                <button className="btn btn-gold btn-lg" type="submit" disabled={busy}>
                  {busy ? <><i className="fas fa-circle-notch fa-spin"></i> Sending…</> : <><i className="fas fa-motorcycle"></i> Apply to ride</>}
                </button>
                <p className="rider-privacy"><i className="fas fa-lock"></i> Your details are used only to vet and onboard you as a rider.</p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function RiderPage() {
  const formRef = useRef(null);
  const toForm = (e) => {
    e.preventDefault();
    try { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* older browsers */ }
  };
  return (
    <main>
      <section className="wrap app-hero">
        <div>
          <span className="eyebrow"><i className="fas fa-motorcycle"></i> YoteMarket Rider</span>
          <h1>Ride with us. <span className="g">Earn more.</span></h1>
          <p className="lead">
            Deliver orders from local hubs and get paid per run — straight to M-Pesa. Ride when it suits you and
            keep every shilling of your payout.
          </p>
          <div className="app-badges">
            <a className="store" href="#" aria-label="Get it on Google Play">
              <i className="fab fa-google-play"></i>
              <span className="st"><small>GET IT ON</small><b>Google Play</b></span>
            </a>
            <a className="btn btn-gold btn-lg" href="#join" onClick={toForm}><i className="fas fa-id-card"></i> Join the rider network</a>
          </div>
          <div className="trust">
            <span>Zero-hour contract</span><span className="dot"></span>
            <span>Instant M-Pesa payouts</span><span className="dot"></span>
            <span>No fuel deductions</span>
          </div>
        </div>

        <div className="download" style={{ aspectRatio: 'auto' }}>
          <div className="glow"></div>
          <div style={{ position: 'relative' }}>
            <div className="icon-row">
              <div className="appicon"><img src="/assets/rider_app_icon.png" alt="YoteMarket Rider app icon" /></div>
              <div className="meta">
                <div className="n">YoteMarket Rider</div>
                <div className="s">Deliver · Earn · Cash out</div>
                <div className="stars">
                  <i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i>
                  <i className="fas fa-star"></i><i className="fas fa-star-half-alt"></i> 4.8
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
              {[['Per run', 'Transparent pay'], ['M-Pesa', 'Instant payouts'], ['Flexible', 'Your own hours'], ['No fuel', 'No deductions']].map(([v, l]) => (
                <div key={l} style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '14px', padding: '16px' }}>
                  <div style={{ color: 'var(--gold-bright)', fontSize: '22px', fontWeight: 800 }}>{v}</div>
                  <div style={{ color: 'rgba(255,255,255,.78)', fontSize: '13px', marginTop: '2px' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pad" style={{ paddingTop: '32px' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">Why ride with YoteMarket</div>
            <h2>Fair pay, clear routes, instant payouts</h2>
          </div>
          <div className="app-feature-grid">
            {FEATURES.map((f) => (
              <article className="app-feature" key={f.title}>
                <div className="fi" style={{ background: f.tint }}>
                  <i className={`fas ${f.icon}`}></i>
                </div>
                <div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <RiderJoin formRef={formRef} />

      <section className="pad" style={{ paddingTop: '8px', paddingBottom: '80px' }}>
        <div className="wrap" style={{ textAlign: 'center' }}>
          <div className="page-actions" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary btn-lg" to="/">Back to home</Link>
            <Link className="btn btn-outline btn-lg" to="/mobile">Get the shopper app</Link>
          </div>
        </div>
      </section>

      <style>{`
      .rider-box{ background:var(--surface); border:1px solid var(--line); border-radius:24px; padding:34px; box-shadow:var(--shadow-lg); scroll-margin-top:90px; }
      .rider-head h2{ font-size:26px; font-weight:800; color:var(--t1); margin-top:6px; }
      .rider-head p{ color:var(--t3); margin-top:8px; font-size:15px; }
      .rider-form{ margin-top:22px; display:flex; flex-direction:column; gap:16px; }
      .rider-row{ display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; }
      /* label is BLOCK, not flex-column: as a column flex container the caption text
         and the "*" became separate flex items, dropping the asterisk onto its own
         line under the word. Inline flow keeps "Full name *" together. */
      .rider-form label, .rider-lbl{ display:block; font-size:13.5px; font-weight:600; color:var(--t2); }
      .rider-form .req{ color:var(--gold-bright,var(--purple)); margin-left:2px; }
      .rider-form input, .rider-form select, .rider-form textarea{ display:block; width:100%; box-sizing:border-box; margin-top:7px;
        padding:12px 14px; border-radius:12px; border:1px solid var(--line2);
        background:var(--bg2); color:var(--t1); font-size:15px; font-family:inherit; outline:none; transition:.15s; resize:vertical; }
      .rider-form input:focus, .rider-form select:focus, .rider-form textarea:focus{ border-color:var(--purple); background:var(--surface); box-shadow:0 0 0 3px color-mix(in srgb,var(--purple) 16%, transparent); }
      .rider-vehicles{ display:flex; flex-wrap:wrap; gap:9px; margin-top:9px; }
      .rider-veh{ display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:9999px; cursor:pointer;
        border:1px solid var(--line2); background:var(--bg2); color:var(--t2); font-family:inherit; font-size:13.5px; font-weight:600; transition:.15s; }
      .rider-veh:hover{ border-color:var(--purple); }
      .rider-veh.is-on{ border-color:var(--purple); background:color-mix(in srgb,var(--purple) 12%, transparent); color:var(--purple); }
      .rider-form .btn-lg{ justify-content:center; margin-top:4px; }
      .rider-err{ display:flex; align-items:center; gap:9px; font-size:14px; color:#dc2626; background:color-mix(in srgb,#dc2626 10%, transparent); border-radius:11px; padding:11px 14px; }
      .rider-privacy{ font-size:12.5px; color:var(--t3); display:flex; align-items:center; gap:7px; margin:0; }
      .rider-done{ text-align:center; }
      .rider-check{ width:64px; height:64px; border-radius:50%; margin:0 auto 18px; display:flex; align-items:center; justify-content:center;
        background:color-mix(in srgb,#10b981 16%, transparent); color:#10b981; font-size:26px; }
      .rider-done h2{ font-size:24px; font-weight:800; color:var(--t1); }
      .rider-done p{ color:var(--t2); margin:12px 0 22px; line-height:1.7; }
      .rider-ref{ font-family:'JetBrains Mono',monospace; color:var(--purple); background:var(--surface2); padding:2px 9px; border-radius:7px; }
      @media (max-width:640px){ .rider-box{ padding:24px; } }
      `}</style>
    </main>
  );
}

export default RiderPage;

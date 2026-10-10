import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/useAuth.jsx';
import { submitRiderApplication, fulfilmentStatus } from '../lib/firebase.js';
import PageHero from '../components/PageHero.jsx';
import { Icon } from '../components/LineIcon.jsx';
import riderPhoto from '../assets/pages/rider-hero.webp';
import riderPhoto2x from '../assets/pages/rider-hero@2x.webp';
import '../styles/pages.css';

// Offered vehicles — a subset of RIDER_VEHICLES in firebase/functions/index.js.
// Bicycle and on-foot are intentionally NOT offered. The server still accepts them
// so applications submitted before this change stay valid and render in the console.
const VEHICLES = [
  { id: 'motorbike', label: 'Motorbike', icon: 'scooter' },
  { id: 'tuktuk', label: 'Tuk-tuk', icon: 'tuktuk' },
  { id: 'car', label: 'Car', icon: 'car' },
  { id: 'van', label: 'Van / pickup', icon: 'truck' },
];
const AVAILABILITY = [
  { id: 'full-time', label: 'Full-time' },
  { id: 'part-time', label: 'Part-time' },
  { id: 'weekends', label: 'Weekends only' },
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
    <section className="pg-sec rider-join" id="join">
      <div className="pg-wrap">
        <div className="career-box rider-box" ref={formRef}>
          {done ? (
            <div className="career-done">
              <div className="career-check"><Icon name="check" /></div>
              <h2>You're on the list</h2>
              <p>
                Asante {form.name.split(' ')[0]} — your reference is <b className="career-ref">{done.ref}</b>.
                Our logistics team vets applications and will reach you on <b>{form.phone}</b> with next steps.
              </p>
              <Link className="pg-btn is-ghost" to="/mobile">Get the shopper app</Link>
            </div>
          ) : (
            <>
              <div className="career-head">
                <span className="pg-kicker">Join the network</span>
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
                        <Icon name={v.icon} /> {v.label}
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

                {err && <div className="career-err"><Icon name="alert" /> {err}</div>}
                <button className="pg-btn career-submit" type="submit" disabled={busy}>
                  {busy ? <><span className="pg-spin" aria-hidden="true"></span> Sending…</> : <><Icon name="scooter" /> Apply to ride</>}
                </button>
                <p className="career-privacy"><Icon name="lock" /> Your details are used only to vet and onboard you as a rider.</p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* /rider — laid out to the 2026-10-09 rider board: hero photo, a three-step "how it
   works", four feature cards, the requirements and a call-to-action band, then the
   application form (a real application into rider_applications, vetted by logistics).
   Delivery is TEMPORARILY suspended (Terms, clause 1): the page reads the same live
   fulfilmentStatus() the checkout reads, and while carriage is paused it says so above
   the fold and frames the form as signing up for when runs restart. */

const STEPS = [
  { icon: 'box', title: 'Pick up batched orders', text: 'Collect several orders from local shops on one run.' },
  { icon: 'pin', title: 'Deliver to neighbourhood hubs', text: 'Drop them at the pickup hub, and confirm each handover in the Rider app.' },
  { icon: 'wallet', title: 'Get paid per run', text: 'Each completed run adds to the earnings you track in the app, paid to your M\u2011Pesa.' },
];

const PERKS = [
  { icon: 'calendar', title: 'Flexible runs', text: 'You are an independent contractor: you choose your hours, your area and your vehicle.' },
  { icon: 'form', title: 'Clear instructions', text: 'The Rider app shows each run’s pickups and the hub to drop at.' },
  { icon: 'headset', title: 'A real person', text: 'Our logistics team vets every application and calls you with next steps.' },
  { icon: 'route', title: 'Batched routes', text: 'Several orders per trip, so each run is worth your time.' },
];

const NEEDS = [
  { icon: 'scooter', title: 'A vehicle', text: 'Motorbike, tuk-tuk, car or van' },
  { icon: 'wallet', title: 'An M\u2011Pesa number', text: 'Your earnings are paid to it' },
  { icon: 'phone', title: 'A smartphone', text: 'Android 6.0 or newer, for the Rider app' },
  { icon: 'id', title: 'Your documents', text: 'Licence, logbook and police clearance numbers speed up vetting' },
];

function RiderPage() {
  const formRef = useRef(null);
  // null = unknown (no backend, offline): say nothing either way, as the checkout does.
  const [paused, setPaused] = useState(null);
  useEffect(() => {
    let live = true;
    fulfilmentStatus().then((s) => { if (live) setPaused(s ? s.riderDelivery === false : null); }).catch(() => {});
    return () => { live = false; };
  }, []);
  const toForm = (e) => {
    e.preventDefault();
    try { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* older browsers */ }
  };

  return (
    <main className="pg rider">
      <PageHero
        pill={{ icon: 'scooter', text: 'Become a YoteMarket rider' }}
        title={<>Deliver for YoteMarket<br /><span className="g">and get paid per run.</span></>}
        lead="Carry orders from local shops to neighbourhood pickup hubs on your own schedule, and get paid for every run to your M‑Pesa."
        actions={<>
          <a className="ph-btn" href="#join" onClick={toForm}>Become a rider <Icon name="arrow" /></a>
          <a className="ph-btn is-ghost" href="#how"><Icon name="play" /> How it works</a>
        </>}
        art={{ src: riderPhoto, src2x: riderPhoto2x, width: 930, height: 329,
          alt: 'A smiling rider in a purple YoteMarket helmet and jacket, with his delivery box, outside a YoteMarket pickup point' }}
      >
        {paused && (
          <p className="rider-paused" role="status">
            <Icon name="clock" />
            <span><b>Delivery runs are paused</b> while we restructure the service to meet new regulations. Sign up now and we’ll call you when runs restart.</span>
          </p>
        )}
      </PageHero>

      <section className="pg-sec" id="how">
        <div className="pg-wrap">
          <div className="rider-how pg-card">
            <div className="rider-how-head">
              <span className="pg-kicker">How it works</span>
              <h2 className="pg-h2">Simple 3-step delivery process</h2>
            </div>
            <ol className="rider-steps">
              {STEPS.map((st, i) => (
                <li key={st.title} className="pg-card">
                  <span className="rider-step-top">
                    <span className="rider-num">{i + 1}</span>
                    <span className="pg-ic is-sm"><Icon name={st.icon} /></span>
                  </span>
                  <h3>{st.title}</h3>
                  <p>{st.text}</p>
                  {i < STEPS.length - 1 && <Icon name="arrow" className="rider-step-arrow" />}
                </li>
              ))}
            </ol>
          </div>

          <div className="pg-cards rider-perks">
            {PERKS.map((p) => (
              <article className="pg-card pg-icard" key={p.title}>
                <span className="pg-ic"><Icon name={p.icon} /></span>
                <div><h3>{p.title}</h3><p>{p.text}</p></div>
              </article>
            ))}
          </div>

          <div className="rider-bottom">
            <div className="pg-card rider-needs">
              <h2>What you need</h2>
              <p>To apply, you’ll need:</p>
              <ul>
                {NEEDS.map((n) => (
                  <li key={n.title}><Icon name={n.icon} /><b>{n.title}</b><span>{n.text}</span></li>
                ))}
              </ul>
            </div>
            <div className="pg-band rider-cta">
              <span className="pg-kicker">Start your journey</span>
              <h2>Ready to ride with YoteMarket?</h2>
              <p>Apply in a minute, no account needed. We’ll call you to verify.</p>
              <a className="pg-btn is-white" href="#join" onClick={toForm}>Apply now <Icon name="arrow" /></a>
              <ul>
                <li><Icon name="coins" /> Per-run pay</li>
                <li><Icon name="clock" /> Flexible hours</li>
                <li><Icon name="wallet" /> M‑Pesa payouts</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <RiderJoin formRef={formRef} />
    </main>
  );
}

export default RiderPage;

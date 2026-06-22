/* index.jsx — Marketer Program recruitment landing ("Stack checkpoints. Get hired.").
   The marketing landing of the marketers subdomain — reached from "Earn" on the main site.
   The actual scout app lives at /marketers/app. Native React port of campaigns/marketer-job. */
import React from 'react';
import { Link } from 'react-router-dom';
import './earn.css';
const { useState } = React;

const PROOF_TINTS = ['#7c3aed', '#10b981', '#f59e0b', '#ec4899'];

export default function EarnLanding() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="top-logo">
            <img src="/assets/logo-white.png" alt="YoteMarket" />
            <span className="badge">Marketer Program</span>
          </div>
          <div className="top-cta">
            <Link className="calc-link" to="/marketers/app"><i className="fas fa-right-to-bracket"></i> Sign in</Link>
            <a className="btn-gold" href="#apply" style={{ padding: '10px 22px', fontSize: '14px' }}>Apply now</a>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="hero" style={{ paddingTop: '60px' }}>
        <div className="banner-bg"></div>
        <div className="banner-scrim"></div>
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-eyebrow"><span className="dot"></span>Founding cohort · Now hiring scouts across Kenya</div>
            <h1 className="hero-headline">
              Stack checkpoints.<br />
              Get <em>hired.</em>
            </h1>
            <p className="hero-sub">
              Refer merchants to YoteMarket and get paid for every verified one. <strong>We're a new platform building our first marketing team — top scouts each month get invited to interview</strong> for full-time Growth Marketer roles.
            </p>
            <div className="hero-ctas">
              <a className="btn-gold" href="#apply"><i className="fas fa-bolt"></i> Apply to scout</a>
              <Link className="btn-ghost-light" to="/marketers/app"><i className="fas fa-calculator"></i> Open the calculator</Link>
            </div>
            <div className="hero-proof">
              <div className="avatars">
                {PROOF_TINTS.map((c, i) => (
                  <div key={i} className="av" style={{ background: c }}><i className="fas fa-user"></i></div>
                ))}
              </div>
              <div className="meta">
                <b>Founding scouts wanted</b>
                First cohort · limited slots
              </div>
            </div>
          </div>

          <div className="payout-card">
            <h3>What you can earn</h3>
            <p className="sub">Verified merchants → KSH in your M-Pesa</p>
            <div className="payout-rows">
              <div className="payout-row">
                <div className="pr-stage"><span className="stage">Qualify</span><span className="merchants">10 verified merchants</span></div>
                <span className="pr-amount">KSH 300</span>
              </div>
              <div className="payout-row">
                <div className="pr-stage"><span className="stage">First cash-out</span><span className="merchants">30 verified merchants</span></div>
                <span className="pr-amount">KSH 500</span>
              </div>
              <div className="payout-row gold">
                <div className="pr-stage"><span className="stage">Checkpoint 1</span><span className="merchants">40 verified · 20 KSH re-rate</span></div>
                <span className="pr-amount">KSH 900</span>
              </div>
              <div className="payout-row gold">
                <div className="pr-stage"><span className="stage">Checkpoint 2</span><span className="merchants">70 verified merchants</span></div>
                <span className="pr-amount">KSH 1,500</span>
              </div>
              <div className="payout-row gold">
                <div className="pr-stage"><span className="stage">Checkpoint 3</span><span className="merchants">100 verified · top tier</span></div>
                <span className="pr-amount">KSH 2,100</span>
              </div>
            </div>
            <div className="payout-foot"><i className="fas fa-info-circle"></i> Top monthly scouts → invited to interview for full-time marketing roles</div>
          </div>
        </div>
      </section>

      {/* ===== THE PITCH ===== */}
      <section className="pitch">
        <div className="section-inner">
          <div className="pitch-grid">
            <div>
              <span className="section-eyebrow">This is how we're hiring</span>
              <h2 className="section-h">The leaderboard <em>is</em> the application.</h2>
              <p className="section-sub">YoteMarket is a young platform with a growing team. Anyone can sign up to refer merchants and earn checkpoint payouts. Each month our team reviews the leaderboard — and top scouts get invited to interview for paid Growth Marketer roles. No CV-sift. No connections needed. Just results.</p>
              <div style={{ marginTop: '30px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <a className="btn-gold" href="#apply"><i className="fas fa-arrow-right"></i> Start scouting</a>
                <a className="btn-ghost-light" href="#how"><i className="fas fa-circle-question"></i> How it works</a>
              </div>
            </div>
            <div className="pitch-card">
              <h4>What top scouts unlock</h4>
              <ul>
                <li><i className="fas fa-briefcase"></i><span><b>Direct interview track</b> — top monthly scouts skip the cold-app process and meet our hiring team directly.</span></li>
                <li><i className="fas fa-coins"></i><span><b>Same-day M-Pesa payouts</b> — withdraw from KSH 500. Funds land in under 5 minutes.</span></li>
                <li><i className="fas fa-tags"></i><span><b>Co-branded launch kit</b> — posters, WhatsApp templates, demo videos. We make the pitch easy.</span></li>
                <li><i className="fas fa-trophy"></i><span><b>Founding-cohort bonus</b> — the first scouts who clear Checkpoint 3 get an extra recognition bonus.</span></li>
                <li><i className="fas fa-graduation-cap"></i><span><b>Weekly coaching calls</b> — our team teaches you how to pitch shops and handle the common pushback.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="how" id="how">
        <div className="section-inner">
          <span className="section-eyebrow">How the program works</span>
          <h2 className="section-h">Four steps. <em>Forty days.</em> One interview.</h2>
          <p className="section-sub">We expect most scouts to hit Checkpoint 1 within a month. The full hiring window opens after 90 days of activity, so we can see consistent performance.</p>
          <div className="how-steps">
            <div className="step"><span className="step-n">01</span><h5>Apply &amp; get verified</h5><p>Fill the form below with your county and where you sell. We approve scout applications within 24 hours and send your unique referral link.</p></div>
            <div className="step"><span className="step-n">02</span><h5>Refer local merchants</h5><p>Share your link with shop owners, market traders, and online sellers. <strong style={{ color: '#FCD34D' }}>Their first month on YoteMarket is free</strong> when they use your code — normally KSH 500/mo.</p></div>
            <div className="step"><span className="step-n">03</span><h5>They get verified</h5><p>A merchant counts when they follow us on 3+ socials <em>and</em> list 2+ items. You see live verification status on your scout dashboard.</p></div>
            <div className="step"><span className="step-n">04</span><h5>Cash out &amp; get scouted</h5><p>Withdraw from KSH 500 anytime. Hit Checkpoint 3 in a quarter and you're on the shortlist for a paid Growth Marketer role.</p></div>
          </div>
        </div>
      </section>

      {/* ===== EARNINGS EXAMPLES ===== */}
      <section className="earnings">
        <div className="section-inner">
          <span className="section-eyebrow">Real payout examples</span>
          <h2 className="section-h">Three scouts. <em>One month.</em> What they earned.</h2>
          <p className="section-sub">From the actual payout formula — try the full calculator to model your own scenarios.</p>
          <div className="earnings-grid">
            <div className="ec locked">
              <div className="ec-stage">Just qualified</div>
              <div className="ec-pay"><sup>KSH</sup>300</div>
              <div className="ec-when">10 verified merchants · ~ first 2 weeks</div>
              <ul><li>Earned the 300 qualification bonus</li><li>Can't withdraw yet — need KSH 500 minimum</li><li>Refer 20 more to unlock first cash-out</li></ul>
            </div>
            <div className="ec featured">
              <div className="ec-stage">Checkpoint 1 hit</div>
              <div className="ec-pay"><sup>KSH</sup>900</div>
              <div className="ec-when">40 verified merchants · steady scout</div>
              <ul><li>All 30 bonus merchants re-rated to 20 KSH</li><li>Withdraw to M-Pesa same day</li><li>On track for the monthly leaderboard</li></ul>
            </div>
            <div className="ec">
              <div className="ec-stage">Top performer</div>
              <div className="ec-pay"><sup>KSH</sup>2,100</div>
              <div className="ec-when">100 verified merchants · our target top tier</div>
              <ul><li>All three checkpoints cleared</li><li>Invited to interview for full-time role</li><li>Founding-cohort recognition bonus</li></ul>
            </div>
          </div>
          <div style={{ marginTop: '36px', textAlign: 'center' }}>
            <Link className="btn-ghost-light" to="/marketers/app"><i className="fas fa-calculator"></i> Open the full payout calculator</Link>
          </div>
        </div>
      </section>

      {/* ===== WHO WE'RE LOOKING FOR ===== */}
      <section className="testimonials">
        <div className="section-inner">
          <span className="section-eyebrow">Who scouts well</span>
          <h2 className="section-h">You probably already know <em>the shops we need</em>.</h2>
          <p className="section-sub">YoteMarket is just starting. We need scouts who already have relationships with merchants — not strangers cold-calling. Most successful scouts come from one of these backgrounds:</p>
          <div className="test-grid">
            <div className="tc">
              <div className="quote">·</div>
              <blockquote>You sell or trade in a market, salon, or local shop. You know other shop owners in your area and can introduce them in person.</blockquote>
              <div className="person"><i className="fas fa-store" style={{ fontSize: '36px', color: '#FCD34D', width: '44px', textAlign: 'center' }}></i><div className="who"><b>Market traders &amp; shop owners</b><span>The most natural scouts</span></div></div>
            </div>
            <div className="tc">
              <div className="quote">·</div>
              <blockquote>You sell on Instagram, TikTok or run a WhatsApp shopping group. You can share your link in places we can't reach.</blockquote>
              <div className="person"><i className="fab fa-instagram" style={{ fontSize: '36px', color: '#FCD34D', width: '44px', textAlign: 'center' }}></i><div className="who"><b>Social-media sellers</b><span>Strong online reach</span></div></div>
            </div>
            <div className="tc">
              <div className="quote">·</div>
              <blockquote>You're between jobs, a recent grad, or hustling. You're hungry, you know your neighbourhood, and you want a marketing career.</blockquote>
              <div className="person"><i className="fas fa-user-tie" style={{ fontSize: '36px', color: '#FCD34D', width: '44px', textAlign: 'center' }}></i><div className="who"><b>Job-seekers &amp; recent grads</b><span>Where most of our hires will come from</span></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== APPLY ===== */}
      <section className="apply" id="apply">
        <div className="section-inner">
          <div className="apply-card">
            <span className="section-eyebrow" style={{ position: 'relative' }}>Sign up to scout</span>
            <h2>Apply to be a YoteMarket Marketer</h2>
            <p className="apply-sub">Approval within 24 hours. Get your unique referral link by SMS &amp; WhatsApp.</p>

            {!submitted ? (
              <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}>
                <div className="row">
                  <div><label>Full name</label><input type="text" placeholder="Jane Wanjiku" required /></div>
                  <div><label>Phone (Safaricom)</label><input type="tel" placeholder="07XX XXX XXX" required /></div>
                </div>
                <div className="row">
                  <div><label>Email</label><input type="email" placeholder="you@example.com" required /></div>
                  <div><label>County</label>
                    <select required defaultValue="">
                      <option value="" disabled>Select your county…</option>
                      <option>Nairobi</option><option>Mombasa</option><option>Kisumu</option><option>Nakuru</option>
                      <option>Eldoret (Uasin Gishu)</option><option>Kiambu</option><option>Machakos</option><option>Kakamega</option>
                      <option>Other (Kenya)</option>
                    </select>
                  </div>
                </div>
                <div className="row">
                  <div><label>Where will you scout?</label>
                    <select required defaultValue="">
                      <option value="" disabled>Pick your channel…</option>
                      <option>Physical markets / shops</option>
                      <option>Social media (TikTok, Instagram)</option>
                      <option>WhatsApp groups &amp; SMS</option>
                      <option>Door-to-door / community</option>
                      <option>Mix of the above</option>
                    </select>
                  </div>
                  <div><label>Have you done sales before?</label>
                    <select required defaultValue="">
                      <option value="" disabled>Choose one…</option>
                      <option>Yes — formally (job)</option>
                      <option>Yes — informally (own hustle)</option>
                      <option>No, but I'm a fast learner</option>
                    </select>
                  </div>
                </div>
                <div className="row single">
                  <div><label>Why YoteMarket? (one line)</label><input type="text" placeholder="e.g. I want a stable marketing career and I know shops in Westlands" /></div>
                </div>
                <div className="checkbox-row">
                  <input type="checkbox" id="agree" required defaultChecked />
                  <label htmlFor="agree">I agree to be contacted by YoteMarket via SMS, WhatsApp, and email. I understand top-performing scouts will be invited to interview, and I'll receive my referral link within 24 hours.</label>
                </div>
                <button className="btn-gold submit" type="submit"><i className="fas fa-paper-plane"></i> Submit my scout application</button>
                <div className="apply-note"><i className="fas fa-lock"></i> Your phone is shared only with the YoteMarket scout team. Never sold.</div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(52,211,153,0.2)', border: '2px solid var(--green-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-bright)', fontSize: '30px' }}><i className="fas fa-check"></i></div>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '26px', color: 'var(--white)' }}>Application received!</h3>
                <p style={{ margin: 0, color: 'var(--mute)', maxWidth: '380px', lineHeight: 1.5 }}>We'll review it within 24 hours and send your unique referral link by SMS &amp; WhatsApp. Karibu YoteMarket.</p>
                <Link className="btn-gold" to="/marketers/app" style={{ marginTop: '6px' }}><i className="fas fa-calculator"></i> Open the scout dashboard</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== KIT FOOTER ===== */}
      <footer className="kit">
        <div className="kit-inner">
          <h6>Marketing kit · Share these with shops in your area</h6>
          <div className="kit-grid">
            <Link className="kit-tile" to="/marketers/app"><i className="fas fa-chart-line"></i><b>Scout dashboard</b><span>Track referrals &amp; earnings live</span></Link>
            <Link className="kit-tile" to="/marketers/app"><i className="fas fa-trophy"></i><b>Leaderboard</b><span>See where you rank nationwide</span></Link>
            <Link className="kit-tile" to="/marketers/app"><i className="fas fa-calculator"></i><b>Payout simulator</b><span>Interactive earnings calculator</span></Link>
            <Link className="kit-tile" to="/marketers/app"><i className="fas fa-wallet"></i><b>M-Pesa payouts</b><span>Cash out from KSH 500</span></Link>
          </div>
          <div className="footer-strip">
            <span>© 2026 YoteMarket — Marketer Recruitment Program</span>
            <span className="contact">
              <a href="mailto:general@yotemarket.com"><i className="fas fa-envelope"></i>general@yotemarket.com</a>
              <a href="https://marketers.yotemarket.com"><i className="fas fa-globe"></i>marketers.yotemarket.com</a>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}

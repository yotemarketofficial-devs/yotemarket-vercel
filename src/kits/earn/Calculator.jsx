/* Calculator.jsx — interactive payout calculator for the recruitment landing.
   A self-contained duplicate of the scout app's Simulator: it reuses the shared
   payout math (../marketers/econ.js) but renders with the earn-kit's gold/purple
   styling so prospects can model earnings WITHOUT signing in — and the scout
   dashboard's Simulator is left completely untouched. */
import React from 'react';
import { calcEarnings, nextCheckpoint, merchantsToWithdrawal, ksh, MK_CONFIG } from '../marketers/econ.js';
const { useState, useMemo } = React;

const GOLD = '#FCD34D';
const PURPLE = '#8b3fea';

/* Responsive earnings curve (viewBox-scaled SVG, fixed earn-kit colours). */
function Curve({ current }){
  const MAX = 115;
  const W = 680; const H = 230;
  const M = { top: 14, right: 16, bottom: 26, left: 52 };
  const iw = W - M.left - M.right; const ih = H - M.top - M.bottom;
  const data = useMemo(() => Array.from({ length: MAX + 1 }, (_, m) => ({ m, total: calcEarnings(m).total })), []);
  const yMax = Math.max(500, Math.ceil(Math.max(...data.map((d) => d.total)) / 500) * 500);
  const X = (m) => M.left + (m / MAX) * iw;
  const Y = (v) => M.top + ih - (v / yMax) * ih;
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${X(d.m).toFixed(1)},${Y(d.total).toFixed(1)}`).join(' ');
  const area = `${path} L${X(MAX)},${Y(0)} L${X(0)},${Y(0)} Z`;
  const yTicks = Array.from({ length: 5 }, (_, i) => (yMax / 4) * i);
  const xTicks = Array.from({ length: Math.floor(MAX / 20) + 1 }, (_, i) => i * 20);
  const cpDots = MK_CONFIG.checkpoints.map((c) => { const tm = c + MK_CONFIG.qualifyThreshold; return { m: tm, total: calcEarnings(tm).total }; });
  const fmtY = (v) => (v >= 1000 ? `${v / 1000}k` : String(v));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img" aria-label="Earnings curve">
      <defs><linearGradient id="ec-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={GOLD} stopOpacity="0.28" /><stop offset="100%" stopColor={GOLD} stopOpacity="0" />
      </linearGradient></defs>
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={M.left} x2={M.left + iw} y1={Y(v)} y2={Y(v)} stroke="rgba(255,255,255,.14)" strokeDasharray="2 5" />
          <text x={M.left - 8} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="#b3a3d6" fontFamily="Poppins">{fmtY(v)}</text>
        </g>
      ))}
      {xTicks.map((m) => <text key={m} x={X(m)} y={M.top + ih + 18} textAnchor="middle" fontSize="11" fill="#b3a3d6" fontFamily="Poppins">{m}</text>)}
      <path d={area} fill="url(#ec-grad)" />
      <path d={path} fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinejoin="round" />
      {cpDots.map((d) => <circle key={d.m} cx={X(d.m)} cy={Y(d.total)} r="3.5" fill="#34d399" stroke="#2a0e64" strokeWidth="2" />)}
      <circle cx={X(current)} cy={Y(calcEarnings(current).total)} r="6" fill="#2a0e64" stroke={GOLD} strokeWidth="2.5" />
    </svg>
  );
}

function Mini({ k, v, gold }){
  return (
    <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ fontSize: 10.5, letterSpacing: '.04em', textTransform: 'uppercase', color: '#b3a3d6', fontWeight: 600 }}>{k}</div>
      <div style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 18, marginTop: 4, color: gold ? GOLD : '#fff' }}>{v}</div>
    </div>
  );
}

export default function Calculator(){
  const [m, setM] = useState(40);
  const earn = calcEarnings(m);
  const nextCp = nextCheckpoint(m);
  const toWd = merchantsToWithdrawal(m);
  const presets = [['Just qualified', 10], ['First cash-out', 30], ['Checkpoint 1', 40], ['Checkpoint 3', 100]];
  const rows = [['Qualify', 10], ['Min withdrawal', 30], ['Checkpoint 1', 40], ['Mid', 55], ['Checkpoint 2', 70], ['Checkpoint 3', 100]];

  return (
    <section className="calculator" id="calculator" style={{ position: 'relative' }}>
      <div className="section-inner">
        <span className="section-eyebrow">Try it yourself · no sign-up</span>
        <h2 className="section-h">Model your <em>payout</em>.</h2>
        <p className="section-sub">Drag the slider to any number of verified merchants — it's the exact formula we pay from.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 26, marginTop: 30, alignItems: 'start' }} className="calc-grid">
          {/* slider + curve */}
          <div style={{ background: 'linear-gradient(150deg, #3a1a78, #2a0e64)', border: '1px solid rgba(252,211,77,.18)', borderRadius: 24, padding: 26, boxShadow: 'var(--shadow-deep)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ color: '#d4c5ec', fontWeight: 600, fontSize: 14 }}>Verified merchants</span>
              <span style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 30, color: '#fff' }}>{m}</span>
            </div>
            <input type="range" min="0" max="115" value={m} onChange={(e) => setM(+e.target.value)} className="calc-range" style={{ width: '100%', accentColor: GOLD }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {presets.map(([l, v]) => (
                <button key={l} onClick={() => setM(v)} style={{
                  padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  border: '1px solid ' + (m === v ? GOLD : 'rgba(255,255,255,.18)'),
                  background: m === v ? GOLD : 'rgba(255,255,255,.06)', color: m === v ? '#2a0e64' : '#d4c5ec',
                }}>{l} · {v}</button>
              ))}
            </div>
            <div style={{ marginTop: 18 }}><Curve current={m} /></div>
          </div>

          {/* result */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'linear-gradient(150deg, #5b2c9c, #3a1a78)', border: '1px solid rgba(252,211,77,.22)', borderRadius: 24, padding: 24 }}>
              <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: '#b3a3d6', fontWeight: 700 }}>Total earnings</div>
              <div key={earn.total} style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 46, lineHeight: 1.05, color: GOLD, margin: '6px 0' }}>{ksh(earn.total)}</div>
              <div style={{ fontSize: 13.5, color: '#d4c5ec' }}>
                {earn.qualified
                  ? <>Qualification {ksh(earn.qualifyPay)} + bonus {ksh(earn.bonusPay)}</>
                  : <>{earn.toQualify} more verified to unlock the {ksh(MK_CONFIG.qualifyBonus)} qualification</>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                <Mini k="@ 20 KSH" v={earn.highRateCount} gold />
                <Mini k="@ 10 KSH" v={earn.lowRateCount} />
              </div>
            </div>
            <div style={{ borderRadius: 18, padding: 18, border: '1px solid ' + (earn.withdrawable ? 'rgba(52,211,153,.5)' : 'rgba(255,255,255,.12)'), background: earn.withdrawable ? 'rgba(52,211,153,.12)' : 'rgba(255,255,255,.04)' }}>
              <div style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#b3a3d6', fontWeight: 700 }}>Withdrawal</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginTop: 3, color: earn.withdrawable ? '#34d399' : '#d4c5ec' }}>{earn.withdrawable ? 'Eligible' : 'Locked'}</div>
              <div style={{ fontSize: 13, color: '#d4c5ec', marginTop: 3 }}>
                {earn.withdrawable
                  ? `Balance above ${ksh(MK_CONFIG.minWithdrawal)} — cash out to M-Pesa.`
                  : (toWd != null ? `${toWd} more merchants to reach ${ksh(MK_CONFIG.minWithdrawal)}.` : '—')}
              </div>
              {nextCp && <div style={{ fontSize: 13, color: GOLD, marginTop: 8, fontWeight: 600 }}>+{ksh(nextCp.gain)} when you reach {nextCp.totalMerchantsAt} ({nextCp.need} more).</div>}
            </div>
          </div>
        </div>

        {/* stage table */}
        <div style={{ marginTop: 24, overflowX: 'auto', borderRadius: 18, border: '1px solid rgba(255,255,255,.1)' }}>
          <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr style={{ textAlign: 'left', color: '#b3a3d6' }}>
              {['Stage', 'Verified', 'Bonus', 'Earnings', 'Withdraw?'].map((h) => <th key={h} style={{ padding: '12px 18px', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map(([l, mm]) => {
                const r = calcEarnings(mm); const hot = mm === m;
                return (
                  <tr key={mm} style={{ borderTop: '1px solid rgba(255,255,255,.08)', background: hot ? 'rgba(252,211,77,.1)' : 'transparent' }}>
                    <td style={{ padding: '11px 18px', fontWeight: 600, color: hot ? GOLD : '#fff' }}>{l}</td>
                    <td style={{ padding: '11px 18px', color: '#d4c5ec' }}>{mm}</td>
                    <td style={{ padding: '11px 18px', color: '#b3a3d6' }}>{r.bonusMerchants}</td>
                    <td style={{ padding: '11px 18px', fontWeight: 700, color: GOLD }}>{ksh(r.total)}</td>
                    <td style={{ padding: '11px 18px', color: r.withdrawable ? '#34d399' : '#b3a3d6' }}>{r.withdrawable ? 'Yes' : 'No'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 30, textAlign: 'center' }}>
          <a className="btn-gold" href="#apply" style={{ display: 'inline-flex' }}><i className="fas fa-bolt" /> Apply to start earning this</a>
        </div>
      </div>
      <style>{`@media (max-width:860px){ .calc-grid{ grid-template-columns:1fr !important; } }`}</style>
    </section>
  );
}

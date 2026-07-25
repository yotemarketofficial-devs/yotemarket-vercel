/* team.jsx — Merchant dashboard: store team (owner only). Add employees by email who
   run the store signed in with their own account. Cashier = POS + orders; Manager =
   everything except Wallet, Subscription & Team. Backed by the store-team callables. */
import React from 'react';
import { FA, Btn, SectionCard } from './primitives.jsx';
import { ScreenCoach } from './ScreenCoach.jsx';
import { listStoreEmployees, addStoreEmployee, setStoreEmployeeRole, removeStoreEmployee } from '../../lib/firebase.js';
const { useState, useEffect } = React;

const TEAM_COACH = [
  { selector: '[data-coach="team-add"]', title: 'Build your team', body: 'Invite a Cashier (Point of sale + orders) or a Manager (everything except money & team) by their email — they must have signed in to YoteMarket once. They run the store from their own account with exactly the access you choose.' },
];

export function TeamManager({ toast }){
  const [list, setList] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('cashier');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () => { listStoreEmployees().then((r) => setList(r.employees || [])).catch(() => setList([])); };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!email.trim()) { setErr('Enter their email.'); return; }
    setBusy(true); setErr('');
    try { await addStoreEmployee({ email: email.trim(), role }); setEmail(''); toast && toast('Employee added'); load(); }
    catch (e) { setErr(e.message || 'Could not add employee.'); } finally { setBusy(false); }
  };
  const changeRole = async (uid, r) => { try { await setStoreEmployeeRole({ uid, role: r }); load(); } catch (e) { toast && toast(e.message || 'Could not change role'); } };
  const remove = async (uid, name) => {
    if (!window.confirm(`Remove ${name} from your team?`)) return;
    try { await removeStoreEmployee({ uid }); load(); toast && toast('Employee removed'); } catch (e) { toast && toast(e.message || 'Could not remove'); }
  };

  return (
    <div className="fadeup" style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:680 }}>
      <ScreenCoach id="team" steps={TEAM_COACH} />
      <div>
        <h1 className="ym-h1" style={{ marginBottom:6 }}>Team</h1>
        <p className="ym-sub">Add employees to help run your store — they sign in with their own account.</p>
      </div>

      <SectionCard title="Add an employee" sub="They must have signed into YoteMarket at least once." data-coach="team-add">
        <div style={{ padding:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:1, minWidth:200 }}>
            <label className="ym-label">Email</label>
            <input className="ym-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="employee@email.com" inputMode="email" />
          </div>
          <div>
            <label className="ym-label">Role</label>
            <select className="ym-input" value={role} onChange={(e) => setRole(e.target.value)} style={{ width:150 }}>
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <Btn kind="primary" icon={busy ? 'fa-circle-notch' : 'fa-user-plus'} disabled={busy} onClick={add}>Add</Btn>
        </div>
        {err && <div style={{ padding:'0 16px 14px', color:'var(--m-danger,#dc2626)', fontSize:13 }}><FA i="fa-triangle-exclamation" /> {err}</div>}
        <div style={{ padding:'0 16px 16px', fontSize:12.5, color:'var(--m-fg3)' }}>
          <b>Cashier</b> — Point of sale + orders. <b>Manager</b> — everything except Wallet, Subscription &amp; Team.
        </div>
      </SectionCard>

      <SectionCard title={`Team${list && list.length ? ` · ${list.length}` : ''}`}>
        {list === null ? <div style={{ padding:16, color:'var(--m-fg3)' }}>Loading…</div>
          : list.length === 0 ? <div style={{ padding:16, color:'var(--m-fg3)' }}>No employees yet — add one above.</div>
          : <div style={{ padding:8 }}>
              {list.map((e) => (
                <div key={e.uid} style={{ display:'flex', alignItems:'center', gap:12, padding:12, borderRadius:12 }}>
                  <div style={{ width:40, height:40, borderRadius:9999, background:'var(--m-surface-3)', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, flexShrink:0 }}>{(e.name || e.email || '?').slice(0, 1).toUpperCase()}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="ym-h3" style={{ fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.name || e.email}</div>
                    <div className="ym-cap" style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.email}{e.at ? ` · added ${e.at}` : ''}</div>
                  </div>
                  <select className="ym-input" value={e.role} onChange={(ev) => changeRole(e.uid, ev.target.value)} style={{ width:130, height:40, flexShrink:0 }}>
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                  </select>
                  <button onClick={() => remove(e.uid, e.name || e.email)} title="Remove" style={{ width:38, height:38, borderRadius:10, border:'1px solid var(--m-border)', background:'var(--m-surface)', color:'var(--m-fg2)', cursor:'pointer', flexShrink:0 }}><FA i="fa-trash" /></button>
                </div>
              ))}
            </div>}
      </SectionCard>
    </div>
  );
}

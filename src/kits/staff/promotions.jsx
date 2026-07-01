/* promotions.jsx — Staff portal: promotions & offers (free-month campaigns,
   coupons, and the receipts backfill). Admin-only. Uses the staff UI primitives
   so it matches the rest of the console. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, kes } from './ui.jsx';
import { grantFreeMonths, listPromos, createPromo, setPromoActive, backfillReceipts, backfillStoreLogos, backfillPoints } from '../../lib/firebase.js';
const { useState, useEffect, useCallback } = React;

export function Promotions(){
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [months, setMonths] = useState(1);
  const [granting, setGranting] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [logoFilling, setLogoFilling] = useState(false);
  const [pointsFilling, setPointsFilling] = useState(false);
  const [form, setForm] = useState({ code:'', type:'percent', value:'', name:'', maxRedemptions:'', expiresAt:'' });
  const [creating, setCreating] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await listPromos(); setPromos(r.promos || []); } catch (e) { setMsg({ ok:false, text:e.message || 'Could not load promotions.' }); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const grant = async () => {
    if (!window.confirm(`Grant ${months} free month(s) to ALL merchants? This activates or extends every merchant's subscription.`)) return;
    setGranting(true); setMsg(null);
    try { const r = await grantFreeMonths({ months: Number(months) }); setMsg({ ok:true, text:`Granted ${months} free month(s) to ${r.granted} merchant(s).` }); load(); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Grant failed.' }); } finally { setGranting(false); }
  };
  const backfill = async () => {
    setBackfilling(true); setMsg(null);
    try { const r = await backfillReceipts(); setMsg({ ok:true, text:`Receipts generated — orders ${r.orders}, POS ${r.pos}, top-ups ${r.topups}, subscriptions ${r.subs}.` }); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Backfill failed.' }); } finally { setBackfilling(false); }
  };
  const fillLogos = async () => {
    setLogoFilling(true); setMsg(null);
    try { const r = await backfillStoreLogos(); setMsg({ ok:true, text:`Store logos patched — ${r.conversations} chat(s), ${r.follows} followed-store record(s).` }); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Logo backfill failed.' }); } finally { setLogoFilling(false); }
  };
  const fillPoints = async () => {
    setPointsFilling(true); setMsg(null);
    try { const r = await backfillPoints(); setMsg({ ok:true, text:`YotePoints awarded — ${r.points} pts across ${r.orders} delivered order(s).` }); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Points backfill failed.' }); } finally { setPointsFilling(false); }
  };
  const create = async () => {
    setCreating(true); setMsg(null);
    try {
      await createPromo({
        code: form.code, type: form.type, value: Number(form.value),
        name: form.name || undefined,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : undefined,
      });
      setForm({ code:'', type:'percent', value:'', name:'', maxRedemptions:'', expiresAt:'' });
      setMsg({ ok:true, text:'Coupon created.' }); load();
    } catch (e) { setMsg({ ok:false, text:e.message || 'Could not create coupon.' }); } finally { setCreating(false); }
  };
  const toggle = async (p) => { try { await setPromoActive({ id:p.id, active:!p.active }); load(); } catch (e) { setMsg({ ok:false, text:e.message || 'Failed.' }); } };
  const remove = async (p) => { if (!window.confirm(`Delete ${p.code || p.name}?`)) return; try { await setPromoActive({ id:p.id, remove:true }); load(); } catch (e) { setMsg({ ok:false, text:e.message || 'Failed.' }); } };
  const offer = (p) => p.type === 'percent' ? `${p.value}% off` : p.type === 'fixed' ? `${kes(p.value)} off` : `${p.value} free month${p.value > 1 ? 's' : ''}`;

  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="tags" title="Promotions & offers" sub="Subscription discounts, free months and coupon codes for merchants — admin only" />
      {msg && <div className="text-sm flex items-center gap-2" style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}><Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} />{msg.text}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background:'var(--amber-soft, #fef3c7)', color:'var(--amber)' }}><Icon name="gift" /></div><h3 className="font-bold t1">Free-month campaign</h3></div>
          <p className="text-sm t3">Activate or extend every merchant's subscription by the chosen number of months — free. Idempotent: re-running the same monthly campaign won't double-grant.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm t2">Months</span>
            <select value={months} onChange={e => setMonths(e.target.value)} className="ym-input" style={{ width:80 }}>{[1,2,3,6].map(m => <option key={m} value={m}>{m}</option>)}</select>
            <Btn kind="primary" size="md" icon={granting ? 'spinner' : 'gift'} onClick={grant} disabled={granting}>{granting ? 'Granting…' : `Grant to all merchants`}</Btn>
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background:'var(--green-soft, #d1fae5)', color:'var(--green)' }}><Icon name="receipt" /></div><h3 className="font-bold t1">Digital receipts</h3></div>
          <p className="text-sm t3">Generate receipts for every past paid transaction (orders, POS sales, top-ups, subscriptions) so they show in each user's Receipts. Idempotent — safe to re-run.</p>
          <Btn kind="primary" size="md" icon={backfilling ? 'spinner' : 'receipt'} onClick={backfill} disabled={backfilling}>{backfilling ? 'Generating…' : 'Generate missing receipts'}</Btn>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background:'var(--pri-soft)', color:'var(--pri)' }}><Icon name="store" /></div><h3 className="font-bold t1">Store logos</h3></div>
          <p className="text-sm t3">Patch store logos into existing chats and followed-store records created before logo support. Idempotent — only touches records missing the current logo.</p>
          <Btn kind="primary" size="md" icon={logoFilling ? 'spinner' : 'store'} onClick={fillLogos} disabled={logoFilling}>{logoFilling ? 'Patching…' : 'Backfill store logos'}</Btn>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background:'var(--amber-soft, #fef3c7)', color:'var(--amber)' }}><Icon name="gift" /></div><h3 className="font-bold t1">YotePoints</h3></div>
          <p className="text-sm t3">Award YotePoints for past delivered orders that pre-date the earning logic (1 pt per KSh 100). Idempotent — only awards orders not yet credited.</p>
          <Btn kind="primary" size="md" icon={pointsFilling ? 'spinner' : 'gift'} onClick={fillPoints} disabled={pointsFilling}>{pointsFilling ? 'Awarding…' : 'Backfill YotePoints'}</Btn>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <h3 className="font-bold t1">Create a coupon</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="CODE e.g. WELCOME20" className="ym-input" />
          <select value={form.type} onChange={e => set('type', e.target.value)} className="ym-input">
            <option value="percent">% off subscription</option>
            <option value="fixed">KSh off subscription</option>
            <option value="free_months">Free months</option>
          </select>
          <input value={form.value} onChange={e => set('value', e.target.value.replace(/[^0-9.]/g, ''))} inputMode="numeric" placeholder={form.type === 'percent' ? 'Percent (e.g. 20)' : form.type === 'fixed' ? 'KSh off' : 'Months'} className="ym-input" />
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Name (optional)" className="ym-input" />
          <input value={form.maxRedemptions} onChange={e => set('maxRedemptions', e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Max redemptions (optional)" className="ym-input" />
          <input type="date" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} className="ym-input" />
        </div>
        <Btn kind="primary" size="md" icon={creating ? 'spinner' : 'plus'} onClick={create} disabled={creating || !form.code || !form.value}>{creating ? 'Creating…' : 'Create coupon'}</Btn>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold t1 mb-3">All promotions</h3>
        {loading ? <div className="text-sm t3 py-6 text-center"><Icon name="spinner" className="mr-2" />Loading…</div>
          : promos.length === 0 ? <div className="text-sm t3 py-6 text-center">No promotions yet.</div>
            : (
              <div className="space-y-2">
                {promos.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ border:'1px solid var(--line)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold t1 text-sm">{p.code || p.name}</span>
                        <Pill tone={p.active ? 'active' : 'inactive'}>{p.active ? 'Active' : 'Off'}</Pill>
                        <span className="text-xs t3">{p.kind === 'campaign' ? 'campaign' : 'coupon'}</span>
                      </div>
                      <div className="text-xs t3 mt-0.5">{offer(p)}{p.redemptions ? ` · ${p.redemptions} used` : ''}{p.grantedCount ? ` · ${p.grantedCount} granted` : ''}</div>
                    </div>
                    {p.kind !== 'campaign' && <button onClick={() => toggle(p)} className="text-xs font-semibold" style={{ color:'var(--pri)' }}>{p.active ? 'Disable' : 'Enable'}</button>}
                    <button onClick={() => remove(p)} className="text-xs font-semibold" style={{ color:'var(--red)' }}>Delete</button>
                  </div>
                ))}
              </div>
            )}
      </Card>
    </div>
  );
}

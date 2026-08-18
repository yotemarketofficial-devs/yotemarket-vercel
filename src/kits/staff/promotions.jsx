/* promotions.jsx — Staff portal: promotions & offers (free-month campaigns,
   coupons, and the receipts backfill). Admin-only. Uses the staff UI primitives
   so it matches the rest of the console. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, kes } from './ui.jsx';
import { grantFreeMonths, grantMerchantFreeMonths, listPromos, createPromo, setPromoActive, backfillReceipts, backfillStoreLogos, backfillPoints, backfillOrders, backfillFollowerCounts, backfillStoreTiers, staffReconcilePayouts } from '../../lib/firebase.js';
import { DELIVERY_TIERS, PLAN_ORDER } from '../dashboard/pricing.js';
import { useDialogs } from './dialogs.jsx';
const SOFTWARE_PLANS = ['Entry', 'Growth', 'Pro'];
const { useState, useEffect, useCallback } = React;

export function Promotions(){
  const { confirm } = useDialogs();
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [months, setMonths] = useState(1);
  const [capacity, setCapacity] = useState('');
  const [granting, setGranting] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [logoFilling, setLogoFilling] = useState(false);
  const [pointsFilling, setPointsFilling] = useState(false);
  const [ordersFilling, setOrdersFilling] = useState(false);
  const [followersFilling, setFollowersFilling] = useState(false);
  const [tiersFilling, setTiersFilling] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [form, setForm] = useState({ code:'', type:'percent', value:'', name:'', maxRedemptions:'', expiresAt:'', packageKind:'delivery', subTier: DELIVERY_TIERS[0].id, plan:'Starter', newOnly:false });
  const [creating, setCreating] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setPkgKind = (k) => setForm(f => ({ ...f, packageKind:k, plan: k === 'software' ? 'Entry' : 'Starter' }));
  // Targeted (single-merchant) free-month offer on a chosen package.
  const [tgt, setTgt] = useState({ email:'', kind:'delivery', tierId: DELIVERY_TIERS[0].id, plan:'Starter', months:1 });
  const [tgtBusy, setTgtBusy] = useState(false);
  const setTgtKind = (k) => setTgt(t => ({ ...t, kind:k, plan: k === 'software' ? 'Entry' : 'Starter' }));
  const grantTargeted = async () => {
    if (!tgt.email.trim()) { setMsg({ ok:false, text:'Enter the merchant’s email.' }); return; }
    setTgtBusy(true); setMsg(null);
    try {
      const r = await grantMerchantFreeMonths({
        email: tgt.email.trim(), months: Number(tgt.months), kind: tgt.kind, plan: tgt.plan,
        ...(tgt.kind === 'delivery' ? { subTier: tgt.tierId } : {}),
      });
      setMsg({ ok:true, text:`Granted ${tgt.months} free month(s) of the ${r.plan} plan to ${tgt.email}.` }); load();
    } catch (e) { setMsg({ ok:false, text:e.message || 'Grant failed.' }); } finally { setTgtBusy(false); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await listPromos(); setPromos(r.promos || []); } catch (e) { setMsg({ ok:false, text:e.message || 'Could not load promotions.' }); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const grant = async () => {
    const cap = capacity ? Number(capacity) : null;
    const who = cap ? `the first ${cap} merchant(s)` : 'ALL merchants';
    if (!await confirm({ title: `Grant ${months} free month(s) to ${who}? This activates or extends their subscription.` })) return;
    setGranting(true); setMsg(null);
    try {
      const r = await grantFreeMonths({ months: Number(months), ...(cap ? { capacity: cap } : {}) });
      const tail = r.remaining != null ? ` · ${r.remaining} slot(s) left` : '';
      setMsg({ ok:true, text:`Granted ${months} free month(s) to ${r.granted} merchant(s).${tail}` }); load();
    }
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
  const fillOrders = async () => {
    setOrdersFilling(true); setMsg(null);
    try { const r = await backfillOrders(); setMsg({ ok:true, text:`Orders updated — ${r.numbered} numbered, ${r.named} customer name(s) filled in.` }); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Order backfill failed.' }); } finally { setOrdersFilling(false); }
  };
  const fillFollowers = async () => {
    setFollowersFilling(true); setMsg(null);
    try { const r = await backfillFollowerCounts(); setMsg({ ok:true, text:`Follower counts reconciled — ${r.stores} store(s), ${r.followers} follower record(s).` }); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Follower backfill failed.' }); } finally { setFollowersFilling(false); }
  };
  const fillTiers = async () => {
    setTiersFilling(true); setMsg(null);
    try { const r = await backfillStoreTiers(); setMsg({ ok:true, text:`Store plan tiers denormalized — ${r.stores} store(s) reconciled.` }); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Tier backfill failed.' }); } finally { setTiersFilling(false); }
  };
  const reconcile = async () => {
    setReconciling(true); setMsg(null);
    try { const r = await staffReconcilePayouts(); setMsg({ ok:true, text:`Payout reconcile done — ${r.scanned} in processing, ${r.queried} re-queried, ${r.skipped} skipped.` }); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Reconcile failed.' }); } finally { setReconciling(false); }
  };
  const create = async () => {
    setCreating(true); setMsg(null);
    try {
      await createPromo({
        code: form.code, type: form.type, value: Number(form.value),
        name: form.name || undefined,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : undefined,
        ...(form.type === 'free_months' ? {
          packageKind: form.packageKind, plan: form.plan,
          ...(form.packageKind === 'delivery' ? { subTier: form.subTier } : {}),
          ...(form.newOnly ? { newOnly: true } : {}),
        } : {}),
      });
      setForm({ code:'', type:'percent', value:'', name:'', maxRedemptions:'', expiresAt:'', packageKind:'delivery', subTier: DELIVERY_TIERS[0].id, plan:'Starter', newOnly:false });
      setMsg({ ok:true, text:'Coupon created.' }); load();
    } catch (e) { setMsg({ ok:false, text:e.message || 'Could not create coupon.' }); } finally { setCreating(false); }
  };
  const toggle = async (p) => { try { await setPromoActive({ id:p.id, active:!p.active }); load(); } catch (e) { setMsg({ ok:false, text:e.message || 'Failed.' }); } };
  const remove = async (p) => { if (!await confirm({ title: `Delete ${p.code || p.name}?` })) return; try { await setPromoActive({ id:p.id, remove:true }); load(); } catch (e) { setMsg({ ok:false, text:e.message || 'Failed.' }); } };
  const offer = (p) => p.type === 'percent' ? `${p.value}% off` : p.type === 'fixed' ? `${kes(p.value)} off` : `${p.value} free month${p.value > 1 ? 's' : ''}${p.plan ? ` · ${p.plan}${p.packageKind === 'software' ? ' (software)' : ''}` : ''}${p.newOnly ? ' · new only' : ''}`;
  // Usage / capacity readout: campaigns show granted/capacity, coupons show used/max.
  const usage = (p) => p.kind === 'campaign'
    ? (p.grantedCount || p.capacity ? ` · ${p.grantedCount || 0}${p.capacity ? '/' + p.capacity : ''} granted` : '')
    : (p.redemptions || p.maxRedemptions ? ` · ${p.redemptions || 0}${p.maxRedemptions ? '/' + p.maxRedemptions : ''} used` : '');

  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="tags" title="Promotions & offers" sub="Subscription discounts, free months and coupon codes for merchants — admin only" />
      {msg && <div className="text-sm flex items-center gap-2" style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}><Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} />{msg.text}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background:'var(--amber-soft, #fef3c7)', color:'var(--amber)' }}><Icon name="gift" /></div><h3 className="font-bold t1">Free-month campaign</h3></div>
          <p className="text-sm t3">Activate or extend merchants' subscriptions by the chosen number of months — free. Set a <b>capacity</b> to cap it to the first N merchants (e.g. a launch offer); leave blank for all. Idempotent — re-running only tops up to the cap.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm t2">Months</span>
            <select value={months} onChange={e => setMonths(e.target.value)} className="ym-input" style={{ width:80 }}>{[1,2,3,6].map(m => <option key={m} value={m}>{m}</option>)}</select>
            <span className="text-sm t2">Capacity</span>
            <input value={capacity} onChange={e => setCapacity(e.target.value.replace(/[^0-9]/g,''))} inputMode="numeric" placeholder="All" className="ym-input" style={{ width:90 }} title="Max merchants to grant (blank = all)" />
            <Btn kind="primary" size="md" icon={granting ? 'spinner' : 'gift'} onClick={grant} disabled={granting}>{granting ? 'Granting…' : (capacity ? `Grant to first ${capacity}` : 'Grant to all')}</Btn>
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background:'var(--pri-soft)', color:'var(--pri)' }}><Icon name="user-tag" /></div><h3 className="font-bold t1">Targeted free-month offer</h3></div>
          <p className="text-sm t3">Grant free months to <b>one merchant</b> on a specific package — a bespoke deal or comp. Activates or extends their subscription on the chosen plan, free (stacks on any time left).</p>
          <input value={tgt.email} onChange={e=>setTgt(t=>({ ...t, email:e.target.value }))} placeholder="Merchant email" className="ym-input" type="email" />
          <div className="flex items-center gap-2 flex-wrap">
            <select value={tgt.kind} onChange={e=>setTgtKind(e.target.value)} className="ym-input" style={{ width:132 }} title="Package type">
              <option value="delivery">Delivery plan</option>
              <option value="software">Software plan</option>
            </select>
            {tgt.kind === 'delivery' && (
              <select value={tgt.tierId} onChange={e=>setTgt(t=>({ ...t, tierId:e.target.value }))} className="ym-input" style={{ flex:1, minWidth:170 }} title="Distance band / tier">
                {DELIVERY_TIERS.map(t=><option key={t.id} value={t.id}>Band {t.band} · {t.range}</option>)}
              </select>
            )}
            <select value={tgt.plan} onChange={e=>setTgt(t=>({ ...t, plan:e.target.value }))} className="ym-input" style={{ width:120 }} title="Plan">
              {(tgt.kind === 'software' ? SOFTWARE_PLANS : PLAN_ORDER).map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            <select value={tgt.months} onChange={e=>setTgt(t=>({ ...t, months:e.target.value }))} className="ym-input" style={{ width:88 }} title="Free months">
              {[1,2,3,6,12].map(m=><option key={m} value={m}>{m} mo</option>)}
            </select>
          </div>
          <Btn kind="primary" size="md" icon={tgtBusy ? 'spinner' : 'gift'} onClick={grantTargeted} disabled={tgtBusy}>{tgtBusy ? 'Granting…' : 'Grant to this merchant'}</Btn>
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

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background:'var(--blue-bg)', color:'var(--blue)' }}><Icon name="bag-shopping" /></div><h3 className="font-bold t1">Order details</h3></div>
          <p className="text-sm t3">Fill the store-scoped order number and the customer's real name onto existing orders so they show in the merchant sales lists. Idempotent — only touches orders missing them.</p>
          <Btn kind="primary" size="md" icon={ordersFilling ? 'spinner' : 'bag-shopping'} onClick={fillOrders} disabled={ordersFilling}>{ordersFilling ? 'Updating…' : 'Backfill order details'}</Btn>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background:'var(--pri-soft)', color:'var(--pri)' }}><Icon name="heart" /></div><h3 className="font-bold t1">Follower counts</h3></div>
          <p className="text-sm t3">Reconcile every store's follower count from the actual follow records and rebuild the merchant-visible follower list. Run once after shipping followers; safe to re-run (authoritative recount).</p>
          <Btn kind="primary" size="md" icon={followersFilling ? 'spinner' : 'heart'} onClick={fillFollowers} disabled={followersFilling}>{followersFilling ? 'Reconciling…' : 'Backfill follower counts'}</Btn>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background:'var(--pri-soft)', color:'var(--pri)' }}><Icon name="layer-group" /></div><h3 className="font-bold t1">Plan tiers</h3></div>
          <p className="text-sm t3">Denormalize each store's plan tier (from its owner's subscription) onto the store so feature entitlements enforce correctly for owners and staff alike. <b>Run once after the entitlements deploy</b>; idempotent (reconciles suspended seats/clips too).</p>
          <Btn kind="primary" size="md" icon={tiersFilling ? 'spinner' : 'layer-group'} onClick={fillTiers} disabled={tiersFilling}>{tiersFilling ? 'Reconciling…' : 'Backfill store tiers'}</Btn>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background:'var(--green-soft, #d1fae5)', color:'var(--green)' }}><Icon name="rotate" /></div><h3 className="font-bold t1">Reconcile payouts</h3></div>
          <p className="text-sm t3">Re-query any merchant withdrawals stuck in <b>processing</b> (older than 10 min) via Daraja Transaction Status, then finalize them — paid or refunded. Runs automatically every 30 min; this triggers it now. Idempotent.</p>
          <Btn kind="primary" size="md" icon={reconciling ? 'spinner' : 'rotate'} onClick={reconcile} disabled={reconciling}>{reconciling ? 'Reconciling…' : 'Reconcile payouts now'}</Btn>
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

        {form.type === 'free_months' && (
          <div className="rounded-lg p-3 space-y-3" style={{ background:'var(--surface2)', border:'1px solid var(--line)' }}>
            <div className="text-xs font-semibold t2 flex items-center gap-2"><Icon name="gift" /> These free months apply to</div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={form.packageKind} onChange={e => setPkgKind(e.target.value)} className="ym-input" style={{ width:140 }} title="Package type">
                <option value="delivery">Delivery plan</option>
                <option value="software">Software plan</option>
              </select>
              {form.packageKind === 'delivery' && (
                <select value={form.subTier} onChange={e => set('subTier', e.target.value)} className="ym-input" style={{ flex:1, minWidth:180 }} title="Distance band / tier">
                  {DELIVERY_TIERS.map(t => <option key={t.id} value={t.id}>Band {t.band} · {t.range}</option>)}
                </select>
              )}
              <select value={form.plan} onChange={e => set('plan', e.target.value)} className="ym-input" style={{ width:130 }} title="Plan">
                {(form.packageKind === 'software' ? SOFTWARE_PLANS : PLAN_ORDER).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm t2 cursor-pointer select-none">
              <input type="checkbox" checked={form.newOnly} onChange={e => set('newOnly', e.target.checked)} />
              New merchants only (no active subscription)
            </label>
            <p className="text-xs t3">On redemption the merchant's subscription is activated or extended on the <b>{form.plan}</b> {form.packageKind} plan{form.newOnly ? ', and only merchants without an active plan can redeem' : ''}.</p>
          </div>
        )}

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
                      <div className="text-xs t3 mt-0.5">{offer(p)}{usage(p)}{p.capacity && p.kind === 'campaign' && (p.grantedCount || 0) >= p.capacity ? ' · full' : ''}</div>
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

/* economics.jsx — Staff console · Pricing & Unit Economics (CONFIDENTIAL).
   Surfaces YM_ECON (the locked single source of truth from the mobile kit). */
import React from 'react';
import { YM_ECON, ymPaidKm, ymRunPayout, ymSubTier, ymRunEconomics,
  ymDeliveryPerKm, ymSingleDeliveryFee, ymDeliveryFeeBreakdown, ymEnterpriseRateCard, ENTERPRISE,
  YM_WEIGHT, ymRunWeightKg, ymDeliveryUnits } from '../mobile/economics.js';
import { Card, SectionHead, Seg, Icon, kes } from './ui.jsx';
const { useState: useSE, useEffect: useEE } = React;
const BANDS = ['A','B','C'];
const PLANS = YM_ECON.planOrder;

function BandTabs({ band, set }){
  return <Seg value={band} onChange={set} options={BANDS} fmt={k=>`Band ${k} · ${YM_ECON.bands[k].label}`} />;
}

function RateCard(){
  const [band,setBand] = useSE('A');
  const b = YM_ECON.bands[band];
  return (<div>
    <div className="mb-4"><BandTabs band={band} set={setBand} /></div>
    <Card className="p-0 overflow-hidden"><div className="overflow-x-auto no-bar">
      <table className="w-full text-sm" style={{minWidth:520}}>
        <thead><tr className="t3" style={{textAlign:'left',background:'var(--surface2)'}}>
          <th className="px-4 py-3 font-semibold">Distance sub-tier</th>
          {PLANS.map(p=><th key={p} className="px-4 py-3 font-semibold text-right">{p}</th>)}
        </tr></thead>
        <tbody>{b.subTiers.map(st=>(
          <tr key={st.id} style={{borderTop:'1px solid var(--line)'}}>
            <td className="px-4 py-3 font-semibold t1 whitespace-nowrap">{st.range}</td>
            {PLANS.map(p=>(<td key={p} className="px-4 py-3 text-right">
              <div className="font-bold t1 num">{kes(st.plans[p].p)}</div>
              <div className="text-xs t3 num">{st.plans[p].d} deliveries</div>
            </td>))}
          </tr>))}</tbody>
      </table></div></Card>
    <p className="text-xs t3 mt-3">Unused deliveries don't roll over — they subsidise spare capacity, keeping prices low and rider utilisation stable.</p>
  </div>);
}

function RiderPay(){
  return (<div className="grid lg:grid-cols-3 gap-4">
    {BANDS.map(k=>{
      const b = YM_ECON.bands[k]; const extra=b.merchantsPerRun-1; const multi=b.pay.multiDrop*extra; const fixed=b.pay.base+multi;
      return (<Card key={k} className="p-5">
        <div className="flex items-center justify-between mb-3"><h3 className="font-bold t1">Band {k} · {b.label}</h3><span className="text-xs t3">{b.vehicle}</span></div>
        <div className="space-y-2 text-sm">
          <Row l="Base pay" v={kes(b.pay.base)} />
          <Row l="Distance pay" v={kes(b.pay.perKm)+' / km'} />
          <Row l={`Multi-drop (${kes(b.pay.multiDrop)}×${extra})`} v={kes(multi)} />
        </div>
        <div className="mt-4 rounded-xl p-3" style={{background:'var(--pri-soft)'}}>
          <div className="text-xs font-semibold accent mb-1">Cost per run</div>
          <div className="text-sm font-bold t1 num">{kes(fixed)} + (Paid Km × {kes(b.pay.perKm)})</div>
        </div>
      </Card>);
    })}
  </div>);
}
function Row({ l, v }){ return <div className="flex justify-between"><span className="t3">{l}</span><span className="font-semibold t1 num">{v}</span></div>; }

function UnitEcon(){
  const [band,setBand]=useSE('A'); const [plan,setPlan]=useSE('Starter');
  const b = YM_ECON.bands[band];
  return (<div>
    <div className="flex flex-wrap gap-3 mb-4"><BandTabs band={band} set={setBand} /><Seg value={plan} onChange={setPlan} options={PLANS} /></div>
    <Card className="p-0 overflow-hidden"><div className="overflow-x-auto no-bar">
      <table className="w-full text-sm" style={{minWidth:560}}>
        <thead><tr className="t3" style={{textAlign:'left',background:'var(--surface2)'}}>
          {['Sub-tier','Paid km','Revenue','Cost','Margin'].map(h=><th key={h} className={`px-4 py-3 font-semibold ${h!=='Sub-tier'?'text-right':''}`}>{h}</th>)}
        </tr></thead>
        <tbody>{b.subTiers.map(st=>{ const e=ymRunEconomics(band,st.id,plan); return (
          <tr key={st.id} style={{borderTop:'1px solid var(--line)'}}>
            <td className="px-4 py-3 font-semibold t1 whitespace-nowrap">{st.range}</td>
            <td className="px-4 py-3 text-right t3 num">{e.paidKm}</td>
            <td className="px-4 py-3 text-right t1 num">{kes(e.revenue)}</td>
            <td className="px-4 py-3 text-right t3 num">{kes(e.cost)}</td>
            <td className="px-4 py-3 text-right"><span className="font-bold num" style={{color:'var(--green)'}}>{kes(e.margin)}</span><span className="text-xs t3 ml-1.5 num">{e.marginPct}%</span></td>
          </tr>); })}</tbody>
      </table></div></Card>
    <p className="text-xs t3 mt-3">Revenue = plan price × {b.merchantsPerRun} merchants/run · Cost = cost-per-run × {plan==='Starter'?10:plan==='Growth'?20:30} runs.</p>
  </div>);
}

function Fees(){
  const unlocks = { Starter:'Starter-tier runs', Growth:'Growth + Starter runs', Pro:'All delivery tiers' };
  return (<div className="grid lg:grid-cols-2 gap-4">
    <Card className="p-5">
      <h3 className="font-bold t1 mb-1">Delivery tier access (badge) fees</h3>
      <p className="text-xs t3 mb-4">One-time, per rider, non-refundable.</p>
      <div className="space-y-2.5">{PLANS.map(p=>(
        <div key={p} className="flex items-center justify-between rounded-lg px-4 py-3" style={{background:'var(--surface2)'}}>
          <div><div className="font-semibold t1">{p} badge</div><div className="text-xs t3">Unlocks {unlocks[p]}</div></div>
          <span className="font-bold t1 num">{kes(YM_ECON.badges[p])}</span></div>))}</div>
      <div className="mt-4 flex gap-2.5 text-xs t2 rounded-lg p-3" style={{background:'var(--amber-bg)'}}>
        <Icon name="shield-halved" style={{color:'var(--amber)'}} className="mt-0.5"/><span>Pooled to fund goods-in-transit insurance — <b>not recognised as platform revenue</b>.</span></div>
    </Card>
    <Card className="p-5">
      <h3 className="font-bold t1 mb-1">Software-only (non-delivery) tiers</h3>
      <p className="text-xs t3 mb-4">Platform tools without delivery runs. Monthly.</p>
      <div className="space-y-2.5">{Object.entries(YM_ECON.software).map(([tier,s])=>(
        <div key={tier} className="flex items-start justify-between rounded-lg px-4 py-3 gap-3" style={{background:'var(--surface2)'}}>
          <div><div className="font-semibold t1">{tier}</div><div className="text-xs t3">{s.desc}</div></div>
          <span className="font-bold t1 whitespace-nowrap num">{kes(s.fee)}/mo</span></div>))}</div>
      <div className="mt-4 flex gap-2.5 text-xs t2 rounded-lg p-3" style={{background:'var(--pri-soft)'}}>
        <Icon name="arrow-up-right-from-square" className="accent mt-0.5"/><span>Upgrades to a delivery plan credit the unused software portion pro-rata.</span></div>
    </Card>
  </div>);
}

function Calculator(){
  const [band,setBand]=useSE('A'); const b=YM_ECON.bands[band];
  const [subId,setSubId]=useSE(b.subTiers[0].id); const [plan,setPlan]=useSE('Growth'); const [drops,setDrops]=useSE(b.merchantsPerRun);
  useEE(()=>{ setSubId(YM_ECON.bands[band].subTiers[0].id); setDrops(YM_ECON.bands[band].merchantsPerRun); },[band]);
  const st = ymSubTier(band,subId)||b.subTiers[0];
  const paidKm = ymPaidKm(st.ub); const pay = ymRunPayout(band,paidKm,drops); const econ = ymRunEconomics(band,st.id,plan);
  return (<div className="grid lg:grid-cols-2 gap-4">
    <Card className="p-5"><div className="space-y-5">
      <CField label="Band"><Seg value={band} onChange={setBand} options={BANDS} fmt={k=>'Band '+k}/></CField>
      <CField label="Distance sub-tier"><Seg value={subId} onChange={setSubId} options={b.subTiers.map(s=>s.id)} fmt={id=>(b.subTiers.find(s=>s.id===id)||{}).range}/></CField>
      <CField label="Plan"><Seg value={plan} onChange={setPlan} options={PLANS}/></CField>
      <div><div className="flex justify-between items-baseline mb-2"><label className="text-xs font-semibold t3 uppercase tracking-wide">Drops on this run</label><span className="text-sm font-bold t1 num">{drops} / {b.merchantsPerRun}</span></div>
        <input type="range" min="1" max={b.merchantsPerRun} value={drops} onChange={e=>setDrops(Number(e.target.value))} className="w-full"/></div>
    </div></Card>
    <Card className="p-5 text-white" style={{background:'linear-gradient(135deg, var(--pri) 0%, #5B16A8 100%)'}}>
      <div className="text-xs uppercase tracking-wide" style={{color:'rgba(255,255,255,.6)'}}>Margin · full batch / month</div>
      <div className="text-3xl font-bold num">{kes(econ.margin)}</div>
      <div className="text-sm mb-5" style={{color:'rgba(255,255,255,.7)'}}>{econ.marginPct}% margin on {kes(econ.revenue)} revenue</div>
      <div className="space-y-2 text-sm pt-4" style={{borderTop:'1px solid rgba(255,255,255,.15)'}}>
        <CRow l="Paid km" v={paidKm+' km'}/><CRow l="Base pay" v={kes(pay.base)}/>
        <CRow l={`Multi-drop × ${Math.max(0,drops-1)}`} v={kes(pay.multi)}/><CRow l={`Distance (${paidKm}×${kes(b.pay.perKm)})`} v={kes(pay.distance)}/>
        <div className="flex justify-between pt-2 font-bold" style={{borderTop:'1px solid rgba(255,255,255,.15)'}}><span>Payout this run</span><span className="num">{kes(pay.total)}</span></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="rounded-lg p-3" style={{background:'rgba(255,255,255,.1)'}}><div className="text-xs" style={{color:'rgba(255,255,255,.6)'}}>Runs / month</div><div className="text-lg font-bold num">{econ.runsPerMonth}</div></div>
        <div className="rounded-lg p-3" style={{background:'rgba(255,255,255,.1)'}}><div className="text-xs" style={{color:'rgba(255,255,255,.6)'}}>Monthly rider cost</div><div className="text-lg font-bold num">{kes(econ.cost)}</div></div>
      </div>
    </Card>
  </div>);
}
function CField({ label, children }){ return <div><label className="block text-xs font-semibold t3 uppercase tracking-wide mb-2">{label}</label>{children}</div>; }
function CRow({ l, v }){ return <div className="flex justify-between" style={{color:'rgba(255,255,255,.85)'}}><span>{l}</span><span className="font-semibold text-white num">{v}</span></div>; }


/* What a SHOPPER pays for one delivery when the merchant's plan doesn't cover it —
   plus the Enterprise per-package rates the quotes are grounded in. */
function ShopperDelivery(){
  const rows = ymDeliveryPerKm();
  const ent = ymEnterpriseRateCard();
  const [demo, setDemo] = useSE(35);
  const bd = ymDeliveryFeeBreakdown(demo);
  const ceilings = new Set(rows.map(r=>r.km));
  const lastKm = rows.length ? rows[rows.length-1].km : 90;
  const allKm = Array.from({length: lastKm}, (_,i)=>i+1);
  return (<div className="space-y-5">
    {/* Weight is the billing unit's hard boundary — it decides how many deliveries a
        consignment IS, which is what everything else is priced off. */}
    <Card className="p-5">
      <div className="font-bold t1 mb-1">The delivery unit &amp; weight caps</div>
      <div className="text-sm t3 mb-4">Billing counts DELIVERIES, not parcels. One delivery is
        <b className="t1"> ≤{YM_WEIGHT.perDeliveryKg} kg and ≤{YM_WEIGHT.parcelsPerDelivery} parcels</b> — and weight is supreme:
        2 parcels at {YM_WEIGHT.perDeliveryKg} kg is {YM_WEIGHT.perDeliveryKg*2} kg, so it splits at two, never three. The per-run
        ceilings below fall out of that cap × the band&rsquo;s deliveries per run, so no separate vehicle capacity is invented.</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.keys(YM_ECON.bands).map(k=>{ const b=YM_ECON.bands[k]; return (
          <div key={k} className="rounded-lg p-4" style={{background:'var(--surface2)',border:'1px solid var(--line)'}}>
            <div className="text-xs t3 uppercase tracking-wide">Band {k} · {b.label}</div>
            <div className="text-lg font-bold t1 num">{ymRunWeightKg(k)} kg <span className="text-sm t3 font-normal">per run</span></div>
            <div className="text-xs t3 mt-1">{b.merchantsPerRun} deliveries × {YM_WEIGHT.perDeliveryKg} kg · {b.vehicle}</div>
          </div>); })}
      </div>
      <div className="text-xs t3 mt-4">A consignment occupies <b className="t1">ceil(kg ÷ {YM_WEIGHT.perDeliveryKg})</b> delivery units —
        e.g. 10 kg = {ymDeliveryUnits(10)} unit, 10.5 kg = {ymDeliveryUnits(10.5)} units, 25 kg = {ymDeliveryUnits(25)} units.
        Weight decides WHICH deliveries join a run, never how many: a too-heavy candidate is skipped for a lighter one,
        never a reason to dispatch under-filled.</div>
    </Card>

    <Card className="p-5">
      <div className="font-bold t1 mb-1">Cost of ONE delivery</div>
      <div className="text-sm t3 mb-4">Each band&rsquo;s subscription price ÷ the deliveries it bundles (Starter — a one-off
        buyer doesn&rsquo;t get a volume rate). The shopper is charged pro-rata across the km actually inside each band, so the
        price is smooth and lands exactly on the locked figure at every ceiling.</div>
      <div className="overflow-x-auto no-bar"><table className="w-full text-sm">
        <thead><tr className="t3 text-left"><th className="py-2">Band</th><th>Range</th><th className="text-right">Sub ÷ deliveries</th>
          <th className="text-right">Cost of 1 delivery</th><th className="text-right">Charged per km</th></tr></thead>
        <tbody>{rows.map(r=>{
          const t = ymSubTier(r.band, r.id);
          return (<tr key={r.id} style={{borderTop:'1px solid var(--line)'}}>
            <td className="py-2 font-semibold t1">{r.band}</td>
            <td className="t2">{r.range}</td>
            <td className="text-right t3 num">{t ? `${kes(t.plans.Starter.p)} ÷ ${t.plans.Starter.d}` : '—'}</td>
            <td className="text-right font-bold t1 num">{kes(Math.round(r.price))}</td>
            <td className="text-right t2 num">{kes(Math.round(r.perKm))}/km<span className="t3"> ({r.fromKm}–{r.km} km)</span></td>
          </tr>);
        })}</tbody>
      </table></div>
    </Card>

    {/* The arithmetic, shown rather than asserted — pick a distance and read the working. */}
    <Card className="p-5">
      <div className="font-bold t1 mb-1">How the price is worked out</div>
      <div className="text-sm t3 mb-4">Each band charges its own rate, but only across the kilometres that actually fall
        inside it — the way a tax bracket works. Nothing is charged for distance that wasn&rsquo;t travelled, and because every
        band still ends on its locked figure, the totals never drift from the table above.</div>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="text-xs font-semibold t3 uppercase tracking-wide">Distance</span>
        {[1.9,5,10,25,35,55,90,120].map(k=>(
          <button key={k} onClick={()=>setDemo(k)} className="px-3 py-1.5 rounded-md text-sm font-semibold transition"
            style={demo===k?{background:'var(--pri)',color:'#fff'}:{background:'var(--surface2)',color:'var(--t2)',border:'1px solid var(--line)'}}>{k} km</button>
        ))}
      </div>
      <div className="overflow-x-auto no-bar"><table className="w-full text-sm">
        <thead><tr className="t3 text-left"><th className="py-2">Segment</th><th>Band</th><th className="text-right">km in band</th>
          <th className="text-right">rate</th><th className="text-right">amount</th></tr></thead>
        <tbody>
          {bd.rows.map((r,i)=>(<tr key={i} style={{borderTop:'1px solid var(--line)'}}>
            <td className="py-2 t2 num">{r.from}–{r.to} km</td>
            <td className="t3">{r.band}{r.tail?' (tail)':''}</td>
            <td className="text-right t2 num">{Math.round(r.km*10)/10}</td>
            <td className="text-right t3 num">× {kes(Math.round(r.perKm))}/km</td>
            <td className="text-right font-semibold t1 num">{kes(Math.round(r.amount))}</td>
          </tr>))}
          <tr style={{borderTop:'2px solid var(--line)'}}>
            <td className="py-2 font-bold t1" colSpan={4}>Total for {demo} km</td>
            <td className="text-right font-bold t1 num">{kes(bd.total)}</td>
          </tr>
        </tbody>
      </table></div>
    </Card>

    {/* Explicit price for every kilometre — no interpolation left to the reader. */}
    <Card className="p-5">
      <div className="font-bold t1 mb-1">Price at every distance</div>
      <div className="text-sm t3 mb-4">Every kilometre from 1 to 90, then the tail rate beyond the longest band.
        Bold rows are band ceilings, where the price equals the locked cost of one delivery exactly.</div>
      <div className="grid gap-x-5 gap-y-1" style={{gridTemplateColumns:'repeat(auto-fill, minmax(min(120px,100%), 1fr))'}}>
        {allKm.map(km=>{
          const ceiling = ceilings.has(km);
          return (<div key={km} className="flex justify-between text-sm py-0.5"
            style={ceiling?{borderTop:'1px solid var(--line)'}:undefined}>
            <span className={ceiling?'font-bold t1':'t3'}>{km} km</span>
            <span className={'num ' + (ceiling?'font-bold t1':'t2')}>{kes(ymSingleDeliveryFee(km))}</span>
          </div>);
        })}
      </div>
      <div className="text-xs t3 mt-4">Past {lastKm} km the final band&rsquo;s marginal rate keeps applying — there is no cap.
        e.g. 100 km = {kes(ymSingleDeliveryFee(100))}, 120 km = {kes(ymSingleDeliveryFee(120))}, 150 km = {kes(ymSingleDeliveryFee(150))}.</div>
    </Card>

    <Card className="p-0 overflow-hidden"><div className="p-5 pb-0">
      <div className="font-bold t1 mb-1">Enterprise rates</div>
      <div className="text-sm t3 mb-4">Quote-based, but grounded in the same table: each band&rsquo;s marginal (Pro) package
        rate and its per-km equivalent. Default allotment {ENTERPRISE.deliveriesCap} deliveries/month.</div>
    </div><div className="overflow-x-auto no-bar"><table className="w-full text-sm">
      <thead><tr className="t3 text-left"><th className="py-2 pl-5">Band</th><th>Range</th><th className="text-right">Per package</th><th className="text-right pr-5">Per package / km</th></tr></thead>
      <tbody>{ent.map(r=>(<tr key={r.subTier} style={{borderTop:'1px solid var(--line)'}}>
        <td className="py-2 pl-5 font-semibold t1">{r.band}</td>
        <td className="t2">{r.range}</td>
        <td className="text-right font-bold t1 num">{kes(r.perPackage)}</td>
        <td className="text-right t2 num pr-5">{r.perPackagePerKm}</td>
      </tr>))}</tbody>
    </table></div></Card>
  </div>);
}

const ECON_TABS = [['ratecard','Rate card',RateCard],['riderpay','Rider pay',RiderPay],['unit','Unit economics',UnitEcon],['fees','Badges & software',Fees],['calc','Run calculator',Calculator],['shopper','Shopper delivery',ShopperDelivery]];

export function Economics(){
  const [tab,setTab] = useSE('ratecard');
  const Active = (ECON_TABS.find(t=>t[0]===tab)||ECON_TABS[0])[2];
  return (<div className="fadeup">
    <SectionHead icon="scale-balanced" title="Pricing & unit economics" sub="The locked v2 model — single source of truth"
      action={<span className="pill pill-red"><Icon name="lock"/> Confidential</span>} />
    <div className="mb-5 overflow-x-auto no-bar"><div className="inline-flex rounded-lg p-1 gap-1" style={{background:'var(--surface2)',border:'1px solid var(--line)'}}>
      {ECON_TABS.map(([k,l])=>(<button key={k} onClick={()=>setTab(k)} className="px-3.5 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition"
        style={tab===k?{background:'var(--surface)',color:'var(--pri)',boxShadow:'var(--shadow)'}:{color:'var(--t3)'}}>{l}</button>))}
    </div></div>
    <Active />
  </div>);
}

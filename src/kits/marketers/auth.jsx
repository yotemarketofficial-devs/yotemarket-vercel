/* auth.jsx — Marketers login / signup / onboarding. */
import React from 'react';
import { ME, COUNTIES } from './data.js';
import { Logo, Btn, Icon, ThemeToggle } from './ui.jsx';
const { useState: useSA } = React;

function BrandPanel(){
  return (
    <div className="hidden lg:flex flex-col justify-between grad text-white p-10 relative overflow-hidden" style={{minHeight:'100%'}}>
      <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full" style={{background:'radial-gradient(circle, rgba(244,181,48,.4), transparent 70%)'}} />
      <div className="absolute -left-10 bottom-10 w-56 h-56 rounded-full" style={{background:'radial-gradient(circle, rgba(160,32,240,.5), transparent 70%)'}} />
      <img src="/assets/logo-white.png" alt="YoteMarket" style={{height:34}} className="relative" />
      <div className="relative">
        <div className="text-xs font-semibold uppercase tracking-[.3em]" style={{color:'var(--gold-bright)'}}>Marketer Program</div>
        <h1 className="font-extrabold mt-3" style={{fontSize:40,lineHeight:1.05}}>Stack checkpoints.<br/>Get hired.</h1>
        <p className="mt-4 text-white/80 max-w-sm">Refer merchants to YoteMarket's virtual mall, earn cash at every checkpoint, and climb the leaderboard. Top scouts get the call.</p>
        <div className="flex gap-2.5 mt-6 flex-wrap">
          {['KSH 300 to qualify','Cash out at KSH 500','M-Pesa payouts'].map(t=>(
            <span key={t} className="px-3 py-1.5 rounded-full text-sm font-semibold" style={{background:'rgba(255,255,255,.14)'}}>{t}</span>
          ))}
        </div>
      </div>
      <div className="relative text-sm text-white/70">Easy Ordering • Secure Payments • Fast Deliveries</div>
    </div>
  );
}

function AuthShell({ children }){
  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4 sm:p-8">
      <div className="card overflow-hidden w-full grid lg:grid-cols-2" style={{maxWidth:960, minHeight:560}}>
        <BrandPanel />
        <div className="p-7 sm:p-10 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="lg:hidden"><Logo size={28} /></div>
            <div className="ml-auto"><ThemeToggle /></div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Login({ onLogin, onSwitch }){
  return (
    <AuthShell>
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full fadeup">
        <h2 className="text-2xl font-bold t1">Welcome back, scout</h2>
        <p className="t3 text-sm mt-1">Sign in to track your referrals and earnings.</p>
        <div className="space-y-4 mt-7">
          <div><label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">Phone or email</label>
            <input className="ym-input" defaultValue={ME.phone} /></div>
          <div><label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">Password</label>
            <input type="password" className="ym-input" defaultValue="scout1234" /></div>
        </div>
        <div className="flex items-center justify-between mt-4 text-sm">
          <label className="flex items-center gap-2 t2"><input type="checkbox" defaultChecked className="accent-[var(--purple)]"/> Remember me</label>
          <a className="font-semibold accent" href="#">Forgot password?</a>
        </div>
        <Btn kind="primary" size="lg" className="w-full mt-6" onClick={onLogin}>Sign in</Btn>
        <p className="text-center text-sm t3 mt-5">New here? <button onClick={onSwitch} className="font-semibold accent">Become a scout</button></p>
      </div>
    </AuthShell>
  );
}

export function Signup({ onDone, onSwitch }){
  const [step, setStep] = useSA(1);
  const [county, setCounty] = useSA('Kisumu');
  return (
    <AuthShell>
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full fadeup">
        {/* progress dots */}
        <div className="flex items-center gap-2 mb-6">
          {[1,2,3].map(s=>(
            <div key={s} className="h-1.5 rounded-full flex-1 transition-all" style={{background: s<=step?'var(--purple)':'var(--line2)'}} />
          ))}
        </div>

        {step===1 && (<div className="fadeup">
          <h2 className="text-2xl font-bold t1">Become a scout</h2>
          <p className="t3 text-sm mt-1">Step 1 of 3 · Your details</p>
          <div className="space-y-4 mt-6">
            <Two><F label="First name" v="Brian"/><F label="Last name" v="Otieno"/></Two>
            <F label="Phone (M-Pesa)" v="0720 730 861" />
            <F label="Email" v="brian.otieno@gmail.com" />
          </div>
          <Btn kind="primary" size="lg" className="w-full mt-6" iconRight="arrow-right" onClick={()=>setStep(2)}>Continue</Btn>
        </div>)}

        {step===2 && (<div className="fadeup">
          <h2 className="text-2xl font-bold t1">Where do you scout?</h2>
          <p className="t3 text-sm mt-1">Step 2 of 3 · Your region</p>
          <div className="space-y-4 mt-6">
            <div><label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">Primary county</label>
              <select className="ym-input" value={county} onChange={e=>setCounty(e.target.value)}>{COUNTIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <F label="Create a password" v="" type="password" placeholder="Min. 8 characters" />
            <label className="flex items-start gap-2.5 text-sm t2"><input type="checkbox" defaultChecked className="mt-0.5 accent-[var(--purple)]"/> I agree to the YoteMarket Marketer terms and the founding-cohort program rules.</label>
          </div>
          <div className="flex gap-2 mt-6"><Btn kind="soft" onClick={()=>setStep(1)} icon="arrow-left">Back</Btn>
            <Btn kind="primary" className="flex-1" iconRight="arrow-right" onClick={()=>setStep(3)}>Continue</Btn></div>
        </div>)}

        {step===3 && (<div className="fadeup text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl grad flex items-center justify-center text-white text-2xl"><Icon name="rocket"/></div>
          <h2 className="text-2xl font-bold t1 mt-4">You're in the founding cohort</h2>
          <p className="t2 text-sm mt-2">Here's how to start earning today:</p>
          <div className="text-left space-y-3 mt-5">
            {[['link','Share your referral link','Every shop that joins through it is yours.'],
              ['store','Get merchants verified','They follow 3 socials + list 2 items.'],
              ['money-bill-wave','Cash out at KSH 500','Straight to M-Pesa, no fees.']].map(([ic,t,d],i)=>(
              <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{background:'var(--surface2)'}}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'var(--purple-soft)',color:'var(--purple)'}}><Icon name={ic}/></div>
                <div><div className="font-semibold t1 text-sm">{t}</div><div className="text-xs t3">{d}</div></div>
              </div>
            ))}
          </div>
          <Btn kind="primary" size="lg" className="w-full mt-6" onClick={onDone}>Go to my dashboard</Btn>
        </div>)}

        {step===1 && <p className="text-center text-sm t3 mt-5">Already a scout? <button onClick={onSwitch} className="font-semibold accent">Sign in</button></p>}
      </div>
    </AuthShell>
  );
}
function Two({ children }){ return <div className="grid grid-cols-2 gap-3">{children}</div>; }
function F({ label, v, type='text', placeholder }){
  return (<div><label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">{label}</label>
    <input type={type} className="ym-input" defaultValue={v} placeholder={placeholder} /></div>);
}

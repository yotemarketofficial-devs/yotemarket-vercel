/* dialogs.jsx — Confirm / prompt / toast for the staff console.

   The console used `window.confirm`, `window.alert` and `window.prompt` for
   roughly thirty decisions, several of them irreversible (delete an account,
   suspend a rider, broadcast to everyone). Native dialogs are the wrong tool for
   an operations console: they're unstyled and jarring, they can't show what's
   actually at stake, they can't distinguish a routine confirm from a destructive
   one, they're suppressible by the browser ("prevent this page from creating
   more dialogs" silently breaks the console), and `window.prompt` is disabled
   outright in some environments — which would have made a suspension reason
   impossible to enter.

   This replaces all three with the console's own Modal:
     confirm()  — a promise-returning dialog, with a `danger` styling and an
                  optional typed-phrase gate for the truly irreversible ones
     prompt()   — same, returning the typed text (or null if cancelled)
     toast()    — non-blocking success/error feedback, replacing window.alert

   Usage: wrap the app in <DialogProvider>, then `const { confirm, prompt, toast }
   = useDialogs();`. Every call is awaitable, so call sites read the same as the
   native ones they replace. */
import React from 'react';
import { Icon, Btn } from './ui.jsx';
const { useState, useCallback, useRef, useEffect, createContext, useContext } = React;

const Ctx = createContext(null);
export const useDialogs = () => useContext(Ctx) || {
  // No provider (a screen rendered in isolation, e.g. a test): fall back to the
  // native dialogs rather than silently doing nothing, which would make a
  // destructive action fire with no confirmation at all.
  confirm: async (o) => window.confirm(typeof o === 'string' ? o : `${o.title}\n\n${o.body || ''}`),
  prompt: async (o) => window.prompt(typeof o === 'string' ? o : o.title),
  toast: () => {},
};

/* ── The dialog ──────────────────────────────────────────────────────────── */
function Dialog({ spec, onDone }) {
  const [text, setText] = useState(spec.defaultValue || '');
  const [phrase, setPhrase] = useState('');
  const inputRef = useRef(null);
  const isPrompt = spec.kind === 'prompt';
  const needsPhrase = !!spec.confirmPhrase;
  const ok = (isPrompt ? (spec.optional || text.trim().length > 0) : true) &&
    (!needsPhrase || phrase.trim().toUpperCase() === spec.confirmPhrase.toUpperCase());

  useEffect(() => { const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 40); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onDone(isPrompt ? null : false);
      // Enter confirms, but never on a phrase-gated dialog — those must be typed.
      if (e.key === 'Enter' && !e.shiftKey && ok && !needsPhrase && !spec.multiline) { e.preventDefault(); onDone(isPrompt ? text : true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [ok, text, isPrompt, needsPhrase, spec.multiline, onDone]);

  const danger = spec.tone === 'danger';
  const accent = danger ? 'var(--red)' : 'var(--pri)';
  const accentBg = danger ? 'var(--red-bg)' : 'var(--pri-soft)';

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ background:'rgba(8,12,24,.55)', backdropFilter:'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onDone(isPrompt ? null : false)}>
      <div role="alertdialog" aria-modal="true" aria-label={spec.title}
        className="rounded-2xl w-full overflow-hidden" style={{ maxWidth:460, background:'var(--surface)', border:'1px solid var(--line)', boxShadow:'0 24px 60px -18px rgba(0,0,0,.5)' }}>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:accentBg, color:accent }}>
              <Icon name={spec.icon || (danger ? 'triangle-exclamation' : 'circle-question')} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold t1 leading-tight">{spec.title}</h3>
              {spec.body && <p className="text-sm t3 mt-1 leading-relaxed" style={{ whiteSpace:'pre-line' }}>{spec.body}</p>}
            </div>
          </div>

          {/* What the action actually touches — the detail a native confirm can't show. */}
          {spec.facts && spec.facts.length > 0 && (
            <div className="mt-3 rounded-xl px-3 py-2.5 text-xs space-y-1" style={{ background:'var(--surface2)' }}>
              {spec.facts.filter(Boolean).map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="t3 flex-shrink-0">{f.label}</span>
                  <span className="flex-1 text-right t1 font-semibold truncate">{f.value}</span>
                </div>
              ))}
            </div>
          )}

          {isPrompt && (spec.multiline
            ? <textarea ref={inputRef} rows={3} value={text} onChange={(e) => setText(e.target.value)}
              placeholder={spec.placeholder || ''} maxLength={spec.maxLength || 500} className="ym-input mt-3" style={{ width:'100%', resize:'vertical' }} />
            : <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
              placeholder={spec.placeholder || ''} maxLength={spec.maxLength || 200} className="ym-input mt-3" style={{ width:'100%' }} />)}
          {isPrompt && spec.hint && <div className="text-[11px] t3 mt-1.5">{spec.hint}</div>}

          {needsPhrase && (
            <div className="mt-3">
              <label className="text-xs t3">Type <b style={{ color:accent }}>{spec.confirmPhrase}</b> to confirm</label>
              <input ref={isPrompt ? null : inputRef} value={phrase} onChange={(e) => setPhrase(e.target.value)}
                className="ym-input mt-1" style={{ width:'100%' }} autoComplete="off" />
            </div>
          )}
        </div>

        <div className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop:'1px solid var(--line)', background:'var(--surface2)' }}>
          <Btn kind="ghost" size="sm" onClick={() => onDone(isPrompt ? null : false)}>{spec.cancelLabel || 'Cancel'}</Btn>
          <Btn kind={danger ? 'danger' : 'primary'} size="sm" icon={spec.confirmIcon} disabled={!ok}
            onClick={() => onDone(isPrompt ? text : true)}>{spec.confirmLabel || (danger ? 'Delete' : 'Confirm')}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ── Toasts ──────────────────────────────────────────────────────────────── */
function Toasts({ items, dismiss }) {
  if (!items.length) return null;
  const tone = { ok:['var(--green-bg)','var(--green)','circle-check'], error:['var(--red-bg)','var(--red)','circle-exclamation'], info:['var(--pri-soft)','var(--pri)','circle-info'] };
  return (
    <div className="fixed z-[500] flex flex-col gap-2" style={{ right:20, bottom:20, maxWidth:'calc(100vw - 40px)' }}>
      {items.map((t) => {
        const c = tone[t.tone] || tone.info;
        return (
          <div key={t.id} role="status" className="flex items-start gap-3 rounded-xl px-4 py-3 fadeup"
            style={{ background:'var(--surface)', border:'1px solid var(--line)', boxShadow:'0 12px 30px -10px rgba(0,0,0,.35)', minWidth:280 }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:c[0], color:c[1] }}><Icon name={c[2]} className="text-xs" /></div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold t1">{t.title}</div>
              {t.body && <div className="text-xs t3 mt-0.5" style={{ whiteSpace:'pre-line' }}>{t.body}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="t3 flex-shrink-0" style={{ background:'none', border:'none', cursor:'pointer' }}><Icon name="xmark" className="text-xs" /></button>
          </div>
        );
      })}
    </div>
  );
}

export function DialogProvider({ children }) {
  const [spec, setSpec] = useState(null);   // { ...opts, resolve }
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const open = useCallback((kind, opts) => new Promise((resolve) => {
    const o = typeof opts === 'string' ? { title: opts } : (opts || {});
    setSpec({ ...o, kind, resolve });
  }), []);

  const confirm = useCallback((opts) => open('confirm', opts), [open]);
  const prompt = useCallback((opts) => open('prompt', opts), [open]);

  const dismiss = useCallback((id) => setToasts((xs) => xs.filter((x) => x.id !== id)), []);
  const toast = useCallback((opts) => {
    const o = typeof opts === 'string' ? { title: opts } : (opts || {});
    const id = ++seq.current;
    setToasts((xs) => [...xs, { id, tone:'info', ...o }]);
    // Errors stay longer — they're usually something the operator must act on.
    setTimeout(() => dismiss(id), o.tone === 'error' ? 9000 : 5000);
    return id;
  }, [dismiss]);

  const done = useCallback((value) => {
    setSpec((s) => { if (s) s.resolve(value); return null; });
  }, []);

  return (
    <Ctx.Provider value={{ confirm, prompt, toast }}>
      {children}
      {spec && <Dialog key={spec.title} spec={spec} onDone={done} />}
      <Toasts items={toasts} dismiss={dismiss} />
    </Ctx.Provider>
  );
}

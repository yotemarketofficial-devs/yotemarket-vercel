/* search.jsx — global command palette (⌘K).
   Searches both navigation (every workspace section) AND live entities across the
   platform — merchants, scouts and user accounts — through the staff-gated
   callables. Selecting an entity opens its full audit record; selecting a section
   navigates there. Entities are fetched once on first open and cached. */
import React from 'react';
import { Icon } from './ui.jsx';
import { RecordAudit } from './screens.jsx';
import { fetchMerchants, fetchMarketers } from './service.js';
import { staffListUsers } from '../../lib/firebase.js';
const { useState, useEffect, useMemo, useRef } = React;

// Module-level cache so reopening the palette is instant within a session.
let _cache = null;
let _cachePromise = null;
function loadEntities(isAdmin) {
  if (_cache) return Promise.resolve(_cache);
  if (!_cachePromise) {
    _cachePromise = Promise.allSettled([
      // Merchants are no longer cached whole — see searchMerchants below.
      Promise.resolve({ merchants: [] }),
      fetchMarketers(),
      isAdmin ? staffListUsers() : Promise.resolve({ users: [] }),
    ]).then(([m, mk, us]) => {
      _cache = {
        merchants: [],
        scouts: mk.status === 'fulfilled' && Array.isArray(mk.value?.scouts) ? mk.value.scouts : [],
        users: us.status === 'fulfilled' && Array.isArray(us.value?.users) ? us.value.users : [],
      };
      return _cache;
    });
  }
  return _cachePromise;
}

const has = (q, ...fields) => fields.some((f) => String(f || '').toLowerCase().includes(q));

export default function GlobalSearch({ open, onClose, sections, go, isAdmin }) {
  const [q, setQ] = useState('');
  const [data, setData] = useState(_cache);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [record, setRecord] = useState(null);
  // Merchants are looked up on the server as you type. They used to be cached whole and
  // filtered in the browser, which stops being possible at the size this console is being
  // built for — and the palette is exactly where you go when the list is too big to scroll.
  const [merchantHits, setMerchantHits] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ(''); setActive(0);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
    if (!_cache) { setLoading(true); loadEntities(isAdmin).then((d) => { setData(d); setLoading(false); }); }
    else setData(_cache);
  }, [open, isAdmin]);

  useEffect(() => {
    const term = q.trim();
    if (!open || term.length < 2) { setMerchantHits([]); return; }
    let alive = true;
    // Debounced: a keystroke should not be a query.
    const t = setTimeout(() => {
      fetchMerchants({ q: term, pageSize: 6 })
        .then((d) => { if (alive) setMerchantHits(d.merchants || []); })
        .catch(() => { if (alive) setMerchantHits([]); });
    }, 220);
    return () => { alive = false; clearTimeout(t); };
  }, [q, open]);

  const results = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const out = [];
    const secs = ql ? sections.filter((s) => has(ql, s.label, s.wsLabel, s.desc)) : sections;
    secs.slice(0, ql ? 6 : sections.length).forEach((s) => out.push({ type:'section', key:s.key, icon:s.icon, title:s.label, sub:s.wsLabel }));
    if (ql) {
      // Matched by the server on a name prefix, so this is "starts with" rather than
      // "contains" — the trade for not shipping the whole merchant table to the browser.
      merchantHits.slice(0, 6)
        .forEach((m) => out.push({ type:'merchant', record:m, icon:'store', title:m.shop || m.id, sub:`${m.owner || ''}${m.county ? ' · ' + m.county : ''}${m.town && m.town !== m.county ? ' · ' + m.town : ''}` || 'Merchant' }));
    }
    if (ql && data) {
      data.scouts.filter((s) => has(ql, s.name, s.county, s.id)).slice(0, 6)
        .forEach((s) => out.push({ type:'scout', record:s, icon:'user-group', title:s.name || s.id, sub:s.county || 'Scout' }));
      data.users.filter((u) => has(ql, u.email, u.name, u.uid)).slice(0, 8)
        .forEach((u) => out.push({ type:'user', record:u, icon:'user', title:u.name || u.email || u.uid, sub:u.email || (u.roles || []).join(', ') || 'Account' }));
    }
    return out;
  }, [q, data, sections, merchantHits]);

  useEffect(() => { setActive(0); }, [q]);

  if (!open) return null;

  const choose = (r) => {
    if (!r) return;
    if (r.type === 'section') { go(r.key); onClose(); return; }
    const title = r.title;
    const subtitle = r.type === 'merchant' ? (r.record.owner || '') : r.type === 'scout' ? (r.record.county || 'Scout') : (r.record.email || '');
    setRecord({ title, subtitle, record: r.record });
  };

  const onKey = (e) => {
    if (e.key === 'Escape') { onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[active]); }
  };

  const groups = [
    { type:'section', label:'Go to' },
    { type:'merchant', label:'Merchants' },
    { type:'scout', label:'Scouts' },
    { type:'user', label:'Accounts' },
  ];
  let flatIndex = -1;

  return (
    <>
      <div className="fixed inset-0 z-[300] flex items-start justify-center p-4 pt-[12vh]" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ background:'rgba(8,12,24,.55)', backdropFilter:'blur(3px)' }}>
        <div className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth:560, maxHeight:'70vh', background:'var(--surface)', border:'1px solid var(--line)', boxShadow:'0 30px 70px -20px rgba(0,0,0,.6)' }}>
          <div className="flex items-center gap-3 px-4" style={{ borderBottom:'1px solid var(--line)' }}>
            <Icon name="magnifying-glass" className="t3" />
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
              placeholder="Search sections, merchants, scouts, accounts…"
              className="flex-1 py-3.5 text-sm" style={{ background:'transparent', border:'none', outline:'none', color:'var(--t1)' }} />
            <kbd className="text-[11px] t3 px-1.5 py-0.5 rounded" style={{ background:'var(--surface2)', border:'1px solid var(--line)' }}>esc</kbd>
          </div>
          <div className="overflow-y-auto flex-1 py-1.5">
            {loading && <div className="px-4 py-8 text-center t3 text-sm"><Icon name="spinner" className="fa-spin mr-2" />Loading directory…</div>}
            {!loading && results.length === 0 && <div className="px-4 py-8 text-center t3 text-sm">No matches{q ? ` for “${q}”` : ''}.</div>}
            {!loading && groups.map((g) => {
              const rows = results.filter((r) => r.type === g.type);
              if (!rows.length) return null;
              return (
                <div key={g.type}>
                  <div className="px-4 pt-2 pb-1 text-[11px] font-bold uppercase t3" style={{ letterSpacing:'.08em' }}>{g.label}</div>
                  {rows.map((r, i) => {
                    flatIndex += 1; const idx = flatIndex; const on = idx === active;
                    return (
                      <button key={g.type + i} onMouseEnter={() => setActive(idx)} onMouseDown={(e) => { e.preventDefault(); choose(r); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-left" style={{ background: on ? 'var(--surface2)' : 'none', border:'none', cursor:'pointer' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'var(--pri-soft)', color:'var(--pri)' }}><Icon name={r.icon} className="text-sm" /></div>
                        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold t1 truncate">{r.title}</span><span className="block text-xs t3 truncate">{r.sub}</span></span>
                        {r.type !== 'section' && <span className="text-[10px] font-semibold t3 uppercase" style={{ letterSpacing:'.06em' }}>{r.type}</span>}
                        {r.type === 'section' && <Icon name="arrow-turn-down-left" className="text-xs t3" style={{ transform:'scaleX(-1)' }} />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="px-4 py-2.5 text-[11px] t3 flex items-center gap-3" style={{ borderTop:'1px solid var(--line)' }}>
            <span><kbd className="num">↑↓</kbd> navigate</span><span><kbd className="num">↵</kbd> open</span>
            {!isAdmin && <span className="ml-auto">Accounts search is admin-only</span>}
          </div>
        </div>
      </div>
      {record && <RecordAudit title={record.title} subtitle={record.subtitle} record={record.record} onClose={() => setRecord(null)} />}
    </>
  );
}

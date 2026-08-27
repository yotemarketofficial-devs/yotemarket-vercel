/* audit.jsx — Admin › Audit log. The platform control trail: who did what, when.
   Reads the server-only audit_log via the staff-gated staffListAuditLog callable
   (see functions/index.js logAudit). Degrades to a clear "activates after the next
   deploy" state until that function ships. Admin-only (placed in the Admin workspace). */
import React from 'react';
import { Card, SectionHead, Btn, Icon } from './ui.jsx';
import { fetchAuditLog } from './service.js';
const { useState, useEffect, useCallback } = React;

// Map an action string → a category chip (icon + tone) and a human phrase.
const CATS = [
  { pre:'staff.role',       icon:'user-gear',        label:'Roles',      tone:['var(--red-bg)','var(--red)'] },
  { pre:'hr.',              icon:'id-badge',         label:'People',     tone:['var(--amber-bg)','var(--amber)'] },
  { pre:'merchant.',        icon:'store',            label:'Merchant',   tone:['var(--blue-bg)','var(--blue)'] },
  { pre:'moderation.',      icon:'shield-halved',    label:'Moderation', tone:['var(--red-bg)','var(--red)'] },
  { pre:'finance.',         icon:'coins',            label:'Finance',    tone:['var(--green-bg)','var(--green)'] },
];
const catOf = (a) => CATS.find((c) => a.startsWith(c.pre)) || { label:'Event', icon:'clock-rotate-left', tone:['var(--pri-soft)','var(--pri)'] };

const PHRASE = {
  'staff.role.grant':'granted a staff role',
  'staff.role.revoke':'revoked staff access',
  'hr.onboard':'onboarded an employee',
  'hr.offboard':'offboarded an employee',
  'moderation.chat.resolve':'resolved a chat report',
  'finance.payout.approve':'approved a payout',
  'finance.payout.hold':'held a payout',
};
function phrase(a) {
  if (PHRASE[a]) return PHRASE[a];
  if (a.startsWith('merchant.status.')) return `set merchant to ${a.split('.').pop()}`;
  if (a.startsWith('merchant.closure.')) return `${a.split('.').pop()} a store closure`;
  return a.replace(/[._]/g, ' ');
}
const FILTERS = [['all', 'All'], ['staff.role', 'Roles'], ['hr.', 'People'], ['merchant.', 'Merchant'], ['moderation.', 'Moderation'], ['finance.', 'Finance']];
const when = (ms) => {
  if (!ms) return '';
  const diff = Date.now() - ms;
  if (diff < 60e3) return 'just now';
  if (diff < 3600e3) return `${Math.floor(diff / 60e3)}m ago`;
  if (diff < 86400e3) return `${Math.floor(diff / 3600e3)}h ago`;
  return new Date(ms).toLocaleDateString('en-KE', { day:'numeric', month:'short', hour:'numeric', minute:'2-digit' });
};

export function AuditLog() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setEvents(await fetchAuditLog(300)); }
    catch (e) { setErr(e.message || 'Could not load the audit log.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = filter === 'all' ? events : events.filter((e) => (e.action || '').startsWith(filter));

  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="clock-rotate-left" title="Audit log" sub="Every sensitive staff action — who did what, and when"
        action={<Btn kind="soft" size="md" icon={loading ? 'spinner' : 'rotate'} onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Btn>} />

      <div className="inline-flex rounded-lg p-1 flex-wrap gap-1" style={{ background:'var(--surface2)', border:'1px solid var(--line)' }}>
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className="px-3 py-1.5 rounded-md text-sm font-semibold transition"
            style={filter === k ? { background:'var(--surface)', color:'var(--pri)', boxShadow:'var(--shadow)' } : { color:'var(--t3)' }}>{l}</button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="text-sm t3 py-10 text-center"><Icon name="spinner" className="fa-spin mr-2" />Loading the trail…</div>
        ) : err ? (
          <div className="px-5 py-10 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background:'var(--amber-bg)', color:'var(--amber)' }}><Icon name="clock-rotate-left" className="text-xl" /></div>
            <div className="font-semibold t1">Audit trail activates after the next deploy</div>
            <div className="text-sm t3 mt-1 max-w-md mx-auto">The logging is wired into the staff actions; the reader function (<span className="num">staffListAuditLog</span>) goes live with the next Cloud Functions deploy. New actions from then on will appear here.</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-10 text-center t3"><Icon name="clock-rotate-left" className="text-2xl mb-2" /><div>No recorded actions{filter !== 'all' ? ' in this category' : ' yet'}.</div></div>
        ) : (
          <div>
            {rows.map((e, i) => {
              const c = catOf(e.action || '');
              // A colleague's name, not the local-part of their address — "general" told nobody who
  // did anything. Resolved server-side from the staff directory (see staffNameMap), with
  // the old email-derived label kept as the fallback for rows it cannot resolve.
  const actor = e.actorName || (e.actorEmail ? e.actorEmail.split('@')[0] : (e.actorUid ? e.actorUid.slice(0, 6) : 'system'));
              const metaBits = Object.entries(e.meta || {}).map(([k, v]) => `${k}: ${v}`).join(' · ');
              return (
                <div key={e.id || i} className="flex items-center gap-3 px-5 py-3.5" style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:c.tone[0], color:c.tone[1] }}><Icon name={c.icon} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm t1">
                      <span className="font-semibold">{actor}</span> <span className="t2">{phrase(e.action || '')}</span>
                      {e.targetLabel && <span className="t1 font-semibold"> · {e.targetLabel}</span>}
                      {!e.targetLabel && e.targetId && <span className="num t3"> · {e.targetType || ''} {String(e.targetId).slice(0, 10)}</span>}
                    </div>
                    {metaBits && <div className="text-xs t3 truncate">{metaBits}</div>}
                  </div>
                  <div className="text-xs t3 whitespace-nowrap flex-shrink-0">{when(e.at)}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

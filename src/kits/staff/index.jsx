/* index.jsx — Staff Operations Console shell.
   Corporate two-tier navigation: a left WORKSPACE rail (departments) + a
   contextual SECTION nav for the active workspace, so each department is its
   own console instead of one flat list. Secure login gate + confidential chrome.
   Screens themselves live in ./screens.jsx, ./departments.jsx, etc. and are
   re-homed here into workspaces (nothing removed). */
import React from 'react';
import './staff.css';
import './tailwind.css';
import { ThemeProvider, Logo, Icon, Avatar, ThemeToggle } from './ui.jsx';
import { StaffLogin, StaffDenied, StaffSplash } from './auth.jsx';
import { Analytics, Approvals, Applications, Scouts, Logistics, Wallet, Moderation, ReviewModeration, Team, Maintenance } from './screens.jsx';
import { CommandCenter } from './command.jsx';
import { Support } from './support.jsx';
import { Disputes } from './disputes.jsx';
import { Economics } from './economics.jsx';
import { Promotions } from './promotions.jsx';
import { People, Finance, Legal } from './departments.jsx';
import { Careers } from './careers.jsx';
import { RiderApplications } from './riders.jsx';
import { Intelligence } from './intelligence.jsx';
import { Accounts } from './accounts.jsx';
import { AuditLog } from './audit.jsx';
import GlobalSearch from './search.jsx';
import { useAuth } from '../../lib/useAuth.jsx';
import { useEscape } from '../../lib/useEscape.js';
import { useStaffClaims, fetchReports, fetchReviewReports, fetchPayouts, fetchMerchantFollows, fetchDeletionRequests, fetchSupportTickets, fetchDisputes } from './service.js';
const { useState: useSApp, useEffect: useEApp, useMemo: useMApp } = React;

/* ── Workspace model ─────────────────────────────────────────────────────────
   Each workspace is a department console with its own sections. `adminOnly`
   restricts a whole workspace or a single section to admins; moderators see
   Command, Marketplace, Logistics, Trust & Safety and Growth. */
const WORKSPACES = [
  { key:'command', label:'Command', icon:'gauge-high', blurb:'Platform pulse', sections:[
    { key:'command', label:'Command center', icon:'bolt', desc:'Action queue & live pulse' },
    { key:'analytics', label:'Analytics', icon:'chart-simple', desc:'GMV, funnel & deep charts' },
  ]},
  { key:'marketplace', label:'Marketplace', icon:'store', blurb:'Merchants & billing', sections:[
    { key:'approvals', label:'Merchants', icon:'user-check', desc:'Verify, feature, suspend & audit stores' },
    { key:'wallet', label:'Subscriptions & billing', icon:'wallet', desc:'Plans, float and payout-change approvals' },
  ]},
  { key:'logistics', label:'Logistics', icon:'truck-fast', blurb:'Delivery ops', sections:[
    { key:'logistics', label:'Runs & routes', icon:'route', desc:'Batched-run operations across all bands' },
    { key:'riders', label:'Rider applications', icon:'motorcycle', desc:'People joining the delivery network — vet & approve' },
  ]},
  { key:'safety', label:'Trust & Safety', icon:'shield-halved', blurb:'Integrity', sections:[
    { key:'moderation', label:'Chat moderation', icon:'comment-slash', desc:'Reported conversations — transcript & block' },
    { key:'reviews', label:'Review moderation', icon:'star-half-stroke', desc:'Reported reviews — remove fraud or dismiss' },
  ]},
  { key:'support', label:'Support', icon:'headset', blurb:'Customer care', sections:[
    { key:'support', label:'Tickets', icon:'ticket', desc:'Help Center requests — reply, resolve & route' },
    { key:'disputes', label:'Returns & refunds', icon:'rotate-left', desc:'Buyer refund requests — review & resolve' },
  ]},
  { key:'growth', label:'Growth', icon:'seedling', blurb:'Scouts & offers', sections:[
    { key:'applications', label:'Marketer applications', icon:'bullhorn', desc:'Scout hiring funnel — advance to active' },
    { key:'scouts', label:'Scouts & payouts', icon:'people-group', desc:'Approve payouts & verify proofs' },
    { key:'promotions', label:'Promotions & offers', icon:'tags', desc:'Campaigns & coupons', adminOnly:true },
  ]},
  { key:'finance', label:'Finance', icon:'coins', blurb:'Money', adminOnly:true, sections:[
    { key:'finance', label:'Revenue & ledger', icon:'chart-line', desc:'Live platform revenue and internal ledger' },
  ]},
  { key:'people', label:'People', icon:'users', blurb:'HR', adminOnly:true, sections:[
    { key:'people', label:'Directory', icon:'address-book', desc:'Employee directory, onboarding & offboarding' },
    { key:'careers', label:'Job applications', icon:'briefcase', desc:'Candidates from the careers page — triage & hire' },
  ]},
  { key:'intelligence', label:'Intelligence', icon:'chart-pie', blurb:'BI', adminOnly:true, sections:[
    { key:'intelligence', label:'Business intelligence', icon:'chart-pie', desc:'Cross-platform data repository + AI brief' },
  ]},
  { key:'legal', label:'Legal', icon:'gavel', blurb:'Compliance', adminOnly:true, sections:[
    { key:'legal', label:'Records', icon:'scale-balanced', desc:'Contracts, policies, cases & compliance' },
  ]},
  { key:'admin', label:'Admin', icon:'user-shield', blurb:'Platform control', adminOnly:true, sections:[
    { key:'team', label:'Team & roles', icon:'user-gear', desc:'Grant or revoke staff access' },
    { key:'accounts', label:'Accounts', icon:'id-badge', desc:'User account administration' },
    { key:'audit', label:'Audit log', icon:'clock-rotate-left', desc:'Who did what, across the platform' },
    { key:'maintenance', label:'Maintenance', icon:'screwdriver-wrench', desc:'One-off data & cleanup tools' },
    { key:'economics', label:'Pricing & economics', icon:'scale-balanced', desc:'Unit-economics reference (read-only)', lock:true },
  ]},
];

const SCREENS = { command:CommandCenter, analytics:Analytics, approvals:Approvals, applications:Applications, scouts:Scouts, logistics:Logistics, wallet:Wallet, promotions:Promotions, intelligence:Intelligence, people:People, careers:Careers, riders:RiderApplications, finance:Finance, legal:Legal, accounts:Accounts, moderation:Moderation, reviews:ReviewModeration, support:Support, disputes:Disputes, team:Team, audit:AuditLog, maintenance:Maintenance, economics:Economics };

// Flat lookup: section key → { section, workspace }
const SECTION_INDEX = {};
WORKSPACES.forEach((w) => w.sections.forEach((s) => { SECTION_INDEX[s.key] = { section: s, workspace: w }; }));

const canSee = (node, isAdmin) => isAdmin || !node.adminOnly;
function visibleWorkspaces(isAdmin) {
  return WORKSPACES
    .filter((w) => canSee(w, isAdmin))
    .map((w) => ({ ...w, sections: w.sections.filter((s) => canSee(s, isAdmin)) }))
    .filter((w) => w.sections.length > 0);
}

/* ── Tier 1: workspace rail (departments) ─────────────────────────────────── */
function WorkspaceRail({ workspaces, activeWs, onPick }) {
  return (
    <div className="flex flex-col items-center gap-1 py-4 h-full overflow-y-auto no-bar">
      {workspaces.map((w) => {
        const on = w.key === activeWs;
        return (
          <button key={w.key} onClick={() => onPick(w)} title={w.label}
            className="relative flex flex-col items-center gap-1 w-full py-2 px-1 rounded-xl transition-colors"
            style={on ? { background:'var(--pri-soft)', color:'var(--pri)' } : { color:'var(--t3)' }}>
            {on && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full" style={{ background:'var(--pri)' }} />}
            <Icon name={w.icon} className="text-lg" />
            <span className="text-[10px] font-semibold leading-none text-center" style={{ letterSpacing:'.01em' }}>{w.label.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Tier 2: section nav for the active workspace ─────────────────────────── */
function SectionNav({ workspace, active, go, onClose }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4">
        <div className="text-[11px] font-bold uppercase t3" style={{ letterSpacing:'.1em' }}>{workspace.blurb}</div>
        <div className="text-lg font-bold t1 leading-tight mt-0.5 flex items-center gap-2"><Icon name={workspace.icon} style={{ color:'var(--pri)' }} className="text-base" />{workspace.label}</div>
      </div>
      <nav className="px-3 flex flex-col gap-0.5 flex-1 overflow-y-auto pb-3">
        {workspace.sections.map((s) => {
          const on = active === s.key;
          return (
            <button key={s.key} onClick={() => { go(s.key); onClose && onClose(); }}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
              style={on ? { background:'var(--pri-soft)' } : null}>
              <Icon name={s.icon} className="w-5 text-center mt-0.5" style={{ color: on ? 'var(--pri)' : 'var(--t3)' }} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold" style={{ color: on ? 'var(--pri)' : 'var(--t1)' }}>{s.label}</span>
                <span className="block text-[11px] t3 leading-snug mt-0.5">{s.desc}</span>
              </span>
              {s.lock && <Icon name="lock" className="text-xs mt-0.5" style={{ color:'var(--t3)' }} />}
            </button>
          );
        })}
      </nav>
      <div className="p-3" style={{ borderTop:'1px solid var(--line)' }}>
        <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold t2" style={{ background:'var(--surface2)' }}>
          <Icon name="house" className="w-5 text-center t3" /> Home
        </a>
      </div>
    </div>
  );
}

/* Notifications bell — real pending counts across the staff queues; click to jump. */
function NotificationsBell({ go }) {
  const [items, setItems] = useSApp([]);
  const [open, setOpen] = useSApp(false);
  useEApp(() => {
    let alive = true;
    Promise.allSettled([fetchReports(), fetchReviewReports(), fetchPayouts(), fetchMerchantFollows(), fetchDeletionRequests(), fetchSupportTickets('open'), fetchDisputes('open')]).then((res) => {
      if (!alive) return;
      const arr = (i) => (res[i].status === 'fulfilled' && Array.isArray(res[i].value)) ? res[i].value : [];
      const reports = arr(0), reviews = arr(1), payouts = arr(2), follows = arr(3);
      const pendingClosures = arr(4).filter((c) => c.status === 'pending');
      const support = (res[5].status === 'fulfilled' && res[5].value && Array.isArray(res[5].value.tickets)) ? res[5].value.tickets : [];
      const disputes = (res[6].status === 'fulfilled' && res[6].value && Array.isArray(res[6].value.disputes)) ? res[6].value.disputes : [];
      setItems([
        support.length && { key:'support', icon:'headset', label:'Support tickets', count:support.length },
        disputes.length && { key:'disputes', icon:'rotate-left', label:'Refund requests', count:disputes.length },
        reports.length && { key:'moderation', icon:'comment-slash', label:'Chat reports', count:reports.length },
        reviews.length && { key:'reviews', icon:'star-half-stroke', label:'Review reports', count:reviews.length },
        payouts.length && { key:'scouts', icon:'wallet', label:'Scout payouts', count:payouts.length },
        follows.length && { key:'scouts', icon:'user-check', label:'Follow proofs', count:follows.length },
        pendingClosures.length && { key:'approvals', icon:'store-slash', label:'Store closures', count:pendingClosures.length },
      ].filter(Boolean));
    });
    return () => { alive = false; };
  }, []);
  const total = items.reduce((a, i) => a + i.count, 0);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="w-9 h-9 rounded-full flex items-center justify-center t2 relative" style={{ background:'var(--surface2)', border:'1px solid var(--line)' }} aria-label={`Notifications${total ? ` (${total} pending)` : ''}`}>
        <Icon name="bell" />
        {total > 0 && <span className="absolute -top-1 -right-1 num text-[10px] font-bold text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center" style={{ background:'var(--red)' }}>{total > 9 ? '9+' : total}</span>}
      </button>
      {open && (<>
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div className="absolute right-0 mt-2 rounded-xl overflow-hidden z-50" style={{ width:256, background:'var(--surface)', border:'1px solid var(--line)', boxShadow:'0 12px 30px -10px rgba(0,0,0,.35)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom:'1px solid var(--line)' }}><span className="font-bold t1 text-sm">Needs attention</span>{total > 0 && <span className="num text-xs t3">{total}</span>}</div>
          {items.length ? items.map((n, i) => (
            <button key={i} onClick={() => { go(n.key); setOpen(false); }} className="staff-pop-item flex items-center gap-3 w-full px-4 py-3 text-left" style={{ background:'none', border:'none', cursor:'pointer' }}>
              <Icon name={n.icon} className="w-4 text-center" style={{ color:'var(--pri)' }} />
              <span className="flex-1 t1 text-sm font-semibold">{n.label}</span>
              <span className="num text-xs font-bold text-white rounded-full px-1.5 min-w-[20px] text-center" style={{ background:'var(--amber)' }}>{n.count}</span>
            </button>
          )) : <div className="px-4 py-6 text-sm t3 text-center"><Icon name="circle-check" style={{ color:'var(--green)' }} /><div className="mt-1">All clear — nothing pending.</div></div>}
        </div>
        <style>{`.staff-pop-item:hover{ background:var(--surface2); }`}</style>
      </>)}
    </div>
  );
}

function App() {
  const { user, loading, isStaff, role } = useStaffClaims();
  const { signOutUser } = useAuth();
  const isAdmin = role === 'admin';
  const [active, setActive] = useSApp('command');
  const [menu, setMenu] = useSApp(false);
  useEscape(() => setMenu(false), menu);
  const [palette, setPalette] = useSApp(false);

  const wsList = useMApp(() => visibleWorkspaces(isAdmin), [isAdmin]);
  const searchItems = useMApp(() => wsList.flatMap((w) => w.sections.map((s) => ({ ...s, wsLabel: w.label }))), [wsList]);

  useEApp(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  if (loading) return <StaffSplash />;
  if (!user) return <StaffLogin />;
  if (!isStaff) return <StaffDenied email={user.email} onSignOut={signOutUser} />;

  // Resolve the active section → its workspace; fall back to Command/Overview if
  // the current selection isn't visible for this role.
  const resolved = SECTION_INDEX[active] && canSee(SECTION_INDEX[active].section, isAdmin) && canSee(SECTION_INDEX[active].workspace, isAdmin)
    ? active : 'command';
  const { section: activeSection, workspace: activeWorkspace } = SECTION_INDEX[resolved];
  const Screen = SCREENS[resolved] || CommandCenter;

  const staffName = user.displayName || (user.email ? user.email.split('@')[0] : 'Staff');
  const staffRole = isAdmin ? 'Operations Admin' : 'Moderator';

  // Selecting a workspace jumps to its first section.
  const pickWorkspace = (w) => { setActive(w.sections[0].key); };

  const NavPanels = ({ onClose }) => (
    <div className="flex h-full">
      <div className="w-[76px] flex-shrink-0 h-full" style={{ background:'var(--surface2)', borderRight:'1px solid var(--line)' }}>
        <div className="flex flex-col h-full">
          <a href="/" className="flex items-center justify-center h-14 flex-shrink-0" style={{ borderBottom:'1px solid var(--line)' }} title="YoteMarket"><Logo size={22} /></a>
          <WorkspaceRail workspaces={wsList} activeWs={activeWorkspace.key} onPick={(w) => { pickWorkspace(w); }} />
        </div>
      </div>
      <div className="w-[224px] flex-shrink-0 h-full" style={{ background:'var(--surface)' }}>
        <SectionNav workspace={activeWorkspace} active={resolved} go={setActive} onClose={onClose} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-page" data-screen-label={'Staff — ' + activeSection.label}>
      <div className="flex">
        {/* desktop two-tier nav */}
        <aside className="hidden lg:block flex-shrink-0 sticky top-0 h-screen" style={{ borderRight:'1px solid var(--line)' }}>
          <NavPanels />
        </aside>

        {/* mobile drawer */}
        {menu && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0" style={{ background:'rgba(8,12,24,.5)' }} onClick={() => setMenu(false)} />
            <div className="absolute left-0 top-0 bottom-0" style={{ width:300 }}><NavPanels onClose={() => setMenu(false)} /></div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-7 h-16" style={{ background:'var(--surface)', borderBottom:'1px solid var(--line)' }}>
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setMenu(true)} className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center t2" style={{ background:'var(--surface2)' }} aria-label="Menu"><Icon name="bars" /></button>
              <nav className="text-sm font-semibold hidden sm:flex items-center gap-2 min-w-0" aria-label="Breadcrumb">
                <span className="t3">{activeWorkspace.label}</span>
                <Icon name="chevron-right" className="text-[10px] t3" />
                <span className="t1 truncate">{activeSection.label}</span>
              </nav>
              <span className="sm:hidden font-bold t1 truncate">{activeSection.label}</span>
              <span className="hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background:'var(--surface2)', color:'var(--t3)' }} title="Internal staff & admins only — not visible to merchants, riders, marketers or shoppers."><Icon name="lock" className="text-[10px]" /> Confidential · Internal</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => setPalette(true)} className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg text-sm t3" style={{ background:'var(--surface2)', border:'1px solid var(--line)', width:250 }} aria-label="Search">
                <Icon name="magnifying-glass" className="text-sm" />
                <span className="flex-1 text-left">Search everything…</span>
                <kbd className="text-[11px] px-1.5 py-0.5 rounded num" style={{ background:'var(--surface)', border:'1px solid var(--line)' }}>⌘K</kbd>
              </button>
              <button onClick={() => setPalette(true)} className="md:hidden w-9 h-9 rounded-full flex items-center justify-center t2" style={{ background:'var(--surface2)', border:'1px solid var(--line)' }} aria-label="Search"><Icon name="magnifying-glass" /></button>
              <NotificationsBell go={setActive} />
              <ThemeToggle />
              <div className="flex items-center gap-2 pl-1">
                <Avatar src={user.photoURL} name={staffName} size={34} />
                <div className="hidden sm:block leading-tight"><div className="text-sm font-semibold t1">{staffName}</div><div className="text-xs t3">{staffRole}</div></div>
                <button onClick={signOutUser} className="ml-1 w-9 h-9 rounded-full flex items-center justify-center t3" style={{ background:'var(--surface2)', border:'1px solid var(--line)' }} title="Sign out" aria-label="Sign out"><Icon name="right-from-bracket" /></button>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-7 max-w-[1240px] mx-auto"><Screen isAdmin={isAdmin} go={setActive} /></main>

          <footer className="px-7 py-6 text-xs t3 flex flex-col sm:flex-row justify-between gap-2 max-w-[1240px] mx-auto">
            <span>© 2026 Yote Market Limited — Internal Operations Console</span>
            <span>Confidential · staff.yotemarket.com</span>
          </footer>
        </div>
      </div>
      <GlobalSearch open={palette} onClose={() => setPalette(false)} sections={searchItems} go={setActive} isAdmin={isAdmin} />
    </div>
  );
}

export default function StaffApp() {
  return <ThemeProvider><App /></ThemeProvider>;
}

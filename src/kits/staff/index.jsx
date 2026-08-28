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
import { Analytics, Approvals, Applications, Scouts, Wallet, Moderation, ReviewModeration, Team, Maintenance } from './screens.jsx';
import { Logistics, RiderRoster } from './logistics.jsx';
import { Outreach, Broadcasts } from './comms.jsx';
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
import { AppReleases } from './releases.jsx';
import { Payroll } from './payroll.jsx';
import { Compliance } from './compliance.jsx';
import { Boards } from './boards.jsx';
import GlobalSearch from './search.jsx';
import { useAuth } from '../../lib/useAuth.jsx';
import { useEscape } from '../../lib/useEscape.js';
import { useStaffClaims, RefreshCtx, TIER_LABEL, fetchReports, fetchReviewReports, fetchPayouts,
  fetchMerchantFollows, fetchDeletionRequests, fetchSupportTickets, fetchDisputes, fetchLogistics } from './service.js';
import { DialogProvider } from './dialogs.jsx';
import { StaffAccess, Attendance, ClockControl, StatutoryIds } from './people.jsx';
import { Contracts, MyContract } from './contracts.jsx';
const { useState: useSApp, useEffect: useEApp, useMemo: useMApp } = React;

/* ── Workspace model ─────────────────────────────────────────────────────────
   Each workspace is a department console with its own sections. `adminOnly`
   restricts a whole workspace or a single section to admins; moderators see
   Command, Marketplace, Logistics, Trust & Safety and Growth. */
const WORKSPACES = [
  { key:'command', label:'Command', icon:'gauge-high', blurb:'Platform pulse', dept:null, sections:[
    { key:'command', label:'Command center', icon:'bolt', desc:'Action queue & live pulse' },
    { key:'analytics', label:'Analytics', icon:'chart-simple', desc:'Revenue, retention & delivery cost' },
    // Your own employment terms — not People-gated: everyone is entitled to these.
    { key:'mycontract', label:'My contract', icon:'file-signature', desc:'Your own employment terms — review & sign' },
    // Not dept-gated: every staffer has a board, and the screen scopes itself to the
    // departments they are actually in.
    { key:'boards', label:'Work board', icon:'clipboard-list', desc:'Who in your department is on what' },
  ]},
  { key:'marketplace', label:'Marketplace', icon:'store', blurb:'Merchants & billing', dept:'marketplace', sections:[
    { key:'approvals', label:'Merchants', icon:'user-check', desc:'Verify, feature, suspend & audit stores' },
    { key:'wallet', label:'Subscriptions & billing', icon:'wallet', desc:'Plans, float and payout-change approvals' },
  ]},
  { key:'logistics', label:'Logistics', icon:'truck-fast', blurb:'Delivery ops', dept:'logistics', sections:[
    { key:'logistics', label:'Runs & routes', icon:'route', desc:'The live engine — batching, hubs, exceptions' },
    { key:'roster', label:'Rider roster', icon:'id-card-clip', desc:'Who can claim work, and what blocks the rest' },
    { key:'riders', label:'Rider applications', icon:'motorcycle', desc:'People joining the delivery network — vet & approve' },
  ]},
  { key:'safety', label:'Trust & Safety', icon:'shield-halved', blurb:'Integrity', dept:'safety', sections:[
    { key:'moderation', label:'Chat moderation', icon:'comment-slash', desc:'Reported conversations — transcript & block' },
    { key:'reviews', label:'Review moderation', icon:'star-half-stroke', desc:'Reported reviews — remove fraud or dismiss' },
  ]},
  { key:'support', label:'Support', icon:'headset', blurb:'Customer care', dept:'support', sections:[
    { key:'support', label:'Tickets', icon:'ticket', desc:'Help Center requests — reply, resolve & route' },
    { key:'disputes', label:'Returns & refunds', icon:'rotate-left', desc:'Buyer refund requests — review & resolve' },
  ]},
  // Talking TO people, rather than only answering them. Threads opened here land
  // in Support, so there is still exactly one inbox.
  { key:'comms', label:'Comms', icon:'paper-plane', blurb:'Reach people', dept:'comms', sections:[
    { key:'outreach', label:'Message someone', icon:'envelope-open-text', desc:'Start a thread with any merchant, shopper, rider or marketer' },
    { key:'broadcasts', label:'Broadcasts', icon:'bullhorn', desc:'Announce to a whole audience — in-app & push' },
  ]},
  { key:'growth', label:'Growth', icon:'seedling', blurb:'Scouts & offers', dept:'growth', sections:[
    { key:'applications', label:'Marketers', icon:'bullhorn', desc:'Activate applicants as scouts · hiring track for a permanent role' },
    { key:'scouts', label:'Scouts & payouts', icon:'people-group', desc:'Approve payouts & verify proofs' },
    { key:'promotions', label:'Promotions & offers', icon:'tags', desc:'Campaigns & coupons', adminOnly:true },
  ]},
  { key:'finance', label:'Finance', icon:'coins', blurb:'Money', dept:'finance', sections:[
    { key:'finance', label:'Revenue & ledger', icon:'chart-line', desc:'Live platform revenue and internal ledger' },
    // Finance rather than People on purpose: a payroll run posts a cost to the ledger and
    // exposes every salary in one screen, so it sits behind the finance gate the callables
    // enforce (assertLead 'finance'), not the HR one.
    { key:'payroll', label:'Payroll', icon:'money-check-dollar', desc:'Monthly pay, PAYE & statutory deductions' },
  ]},
  { key:'people', label:'People', icon:'users', blurb:'HR', dept:'people', sections:[
    { key:'people', label:'Directory', icon:'address-book', desc:'Employee directory, onboarding & offboarding' },
    // Granting console access is a security boundary: staffSetRole/onboardEmployee
    // are assertAdmin server-side, so a People lead would only meet refusals here.
    { key:'team', label:'Access & roles', icon:'user-gear', desc:'Tiers and department access for every employee', adminOnly:true },
    { key:'attendance', label:'Attendance', icon:'clock', desc:'Timesheets — who worked when, and for how long' },
    // Not adminOnly: anyone may fill in their OWN numbers, and the callable enforces
    // that a People lead is needed to edit somebody else's.
    { key:'statutory', label:'Statutory numbers', icon:'id-card', desc:'KRA PIN, NSSF & SHIF — what PAYE returns are filed against' },
    { key:'contracts', label:'Contracts', icon:'file-signature', desc:'Individual employment terms, pay and renewals' },
    { key:'careers', label:'Job applications', icon:'briefcase', desc:'Candidates from the careers page — triage & hire' },
  ]},
  { key:'intelligence', label:'Intelligence', icon:'chart-pie', blurb:'BI', dept:'intelligence', sections:[
    { key:'intelligence', label:'Business intelligence', icon:'chart-pie', desc:'Cross-platform data repository + AI brief' },
  ]},
  { key:'legal', label:'Legal', icon:'gavel', blurb:'Compliance', dept:'legal', sections:[
    { key:'legal', label:'Records', icon:'scale-balanced', desc:'Contracts, policies, cases & compliance' },
  ]},
  /* Its own workspace rather than a section of Legal, because it genuinely belongs to
     three departments at once: Legal renews the licences, Finance files the returns,
     People chase the employee documents. `anyDept` mirrors the server, which admits all
     three, and the screen's own tabs show each of them only their half. */
  { key:'compliance', label:'Compliance', icon:'file-shield', blurb:'Licences & documents',
    anyDept:['legal', 'finance', 'people'], sections:[
      { key:'compliance', label:'Compliance register', icon:'file-shield', desc:'Licences, employee documents & statutory filing deadlines' },
    ]},
  { key:'admin', label:'Admin', icon:'user-shield', blurb:'Platform control', adminOnly:true, sections:[
    { key:'accounts', label:'Accounts', icon:'id-badge', desc:'User account administration' },
    { key:'audit', label:'Audit log', icon:'clock-rotate-left', desc:'Who did what, across the platform' },
    { key:'maintenance', label:'Maintenance', icon:'screwdriver-wrench', desc:'One-off data & cleanup tools' },
    { key:'releases', label:'App releases', icon:'cloud-arrow-up', desc:'Publish the Android APKs that /apk and the app mirrors serve' },
    { key:'economics', label:'Pricing & economics', icon:'scale-balanced', desc:'Unit-economics reference (read-only)', lock:true },
  ]},
];

const SCREENS = { command:CommandCenter, analytics:Analytics, approvals:Approvals, applications:Applications, scouts:Scouts, logistics:Logistics, roster:RiderRoster, wallet:Wallet, promotions:Promotions, intelligence:Intelligence, people:People, careers:Careers, riders:RiderApplications, finance:Finance, legal:Legal, accounts:Accounts, moderation:Moderation, reviews:ReviewModeration, support:Support, disputes:Disputes, outreach:Outreach, broadcasts:Broadcasts, team:StaffAccess, attendance:Attendance, contracts:Contracts, mycontract:MyContract, audit:AuditLog, maintenance:Maintenance, releases:AppReleases, payroll:Payroll, compliance:Compliance, boards:Boards, statutory:StatutoryIds, economics:Economics };

// Flat lookup: section key → { section, workspace }
const SECTION_INDEX = {};
WORKSPACES.forEach((w) => w.sections.forEach((s) => { SECTION_INDEX[s.key] = { section: s, workspace: w }; }));

/* Visibility mirrors the SERVER gates (assertDept / assertLead in functions/index.js).
   An admin sees everything; everyone else sees Command plus the workspaces for the
   departments they hold. Hiding a workspace is presentation only — the callables
   behind it enforce the same rule, so a hidden section is genuinely unreachable
   rather than just invisible. */
const canSee = (node, isAdmin, depts) => {
  if (isAdmin) return true;
  if (node.adminOnly) return false;
  // Some things belong to more than one department — the compliance register is owned by
  // Legal, filed by Finance and chased by People, and the server admits all three.
  if (Array.isArray(node.anyDept)) return node.anyDept.some((d) => depts.includes(d));
  if (node.dept === undefined || node.dept === null) return true;   // Command: everyone
  return depts.includes(node.dept);
};
function visibleWorkspaces(isAdmin, depts = []) {
  return WORKSPACES
    .filter((w) => canSee(w, isAdmin, depts))
    .map((w) => ({ ...w, sections: w.sections.filter((sec) => canSee({
      ...sec,
      dept: sec.dept === undefined ? w.dept : sec.dept,
      anyDept: sec.anyDept === undefined ? w.anyDept : sec.anyDept,
    }, isAdmin, depts)) }))
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
      {/* Clocking in is the first thing done on a shift and the last before leaving, so it
          sits with Home at the foot of the nav rather than among the header's search and
          profile controls. Full width here, so the wide button is the right one. */}
      <div className="p-3 flex flex-col gap-2" style={{ borderTop:'1px solid var(--line)' }}>
        <ClockControl wide />
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
    Promise.allSettled([fetchReports(), fetchReviewReports(), fetchPayouts(), fetchMerchantFollows(), fetchDeletionRequests(), fetchSupportTickets('open'), fetchDisputes('open'), fetchLogistics()]).then((res) => {
      if (!alive) return;
      const arr = (i) => (res[i].status === 'fulfilled' && Array.isArray(res[i].value)) ? res[i].value : [];
      const reports = arr(0), reviews = arr(1), payouts = arr(2), follows = arr(3);
      const pendingClosures = arr(4).filter((c) => c.status === 'pending');
      const support = (res[5].status === 'fulfilled' && res[5].value && Array.isArray(res[5].value.tickets)) ? res[5].value.tickets : [];
      const disputes = (res[6].status === 'fulfilled' && res[6].value && Array.isArray(res[6].value.disputes)) ? res[6].value.disputes : [];
      const logiEx = (res[7].status === 'fulfilled' && res[7].value && Array.isArray(res[7].value.exceptions)) ? res[7].value.exceptions : [];
      setItems([
        logiEx.length && { key:'logistics', icon:'triangle-exclamation', label:'Logistics exceptions', count:logiEx.length },
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
        {total > 0 && <span className="absolute -top-1 -right-1 num text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center" style={{ background:'var(--red)', color:'var(--on-accent)' }}>{total > 9 ? '9+' : total}</span>}
      </button>
      {open && (<>
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div className="absolute right-0 mt-2 rounded-xl overflow-hidden z-50" style={{ width:256, background:'var(--surface)', border:'1px solid var(--line)', boxShadow:'0 12px 30px -10px rgba(0,0,0,.35)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom:'1px solid var(--line)' }}><span className="font-bold t1 text-sm">Needs attention</span>{total > 0 && <span className="num text-xs t3">{total}</span>}</div>
          {items.length ? items.map((n, i) => (
            <button key={i} onClick={() => { go(n.key); setOpen(false); }} className="staff-pop-item flex items-center gap-3 w-full px-4 py-3 text-left" style={{ background:'none', border:'none', cursor:'pointer' }}>
              <Icon name={n.icon} className="w-4 text-center" style={{ color:'var(--pri)' }} />
              <span className="flex-1 t1 text-sm font-semibold">{n.label}</span>
              <span className="num text-xs font-bold rounded-full px-1.5 min-w-[20px] text-center" style={{ background:'var(--amber)', color:'var(--on-accent)' }}>{n.count}</span>
            </button>
          )) : <div className="px-4 py-6 text-sm t3 text-center"><Icon name="circle-check" style={{ color:'var(--green)' }} /><div className="mt-1">All clear — nothing pending.</div></div>}
        </div>
        <style>{`.staff-pop-item:hover{ background:var(--surface2); }`}</style>
      </>)}
    </div>
  );
}

function App() {
  const { user, loading, isStaff, isAdmin, tier, departments, profile } = useStaffClaims();
  const { signOutUser } = useAuth();
  const [active, setActive] = useSApp('command');
  const [menu, setMenu] = useSApp(false);

  /* Manual refresh. Every useStaffResource on screen re-fetches when `tick` bumps,
     so one button refreshes whatever the operator is actually looking at. `busy`
     is a short spin so the click visibly did something even when the data is
     unchanged (the hook's change-guard suppresses a no-op re-render). */
  const [tick, setTick] = useSApp(0);
  const [refreshing, setRefreshing] = useSApp(false);
  const refresh = React.useCallback(() => {
    setTick((t) => t + 1);
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  }, []);
  useEApp(() => {
    const h = (e) => {
      // R refreshes, unless the operator is typing into something.
      const tag = (e.target && e.target.tagName) || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); refresh(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [refresh]);

  /* Land an operator back in the department they actually work in rather than always
     on Command — Finance opens Finance, Support opens Support. Stored per-uid so a
     shared machine never drops one person into another's section. Purely a starting
     point: the `resolved` guard below still re-checks visibility, so an account that
     loses admin can't be restored into an admin-only screen. */
  const SECTION_KEY = user?.uid ? `ym_staff_section_${user.uid}` : null;
  useEApp(() => {
    if (!SECTION_KEY) return;
    try {
      const saved = localStorage.getItem(SECTION_KEY);
      if (saved && SECTION_INDEX[saved]) setActive(saved);
    } catch { /* storage blocked — fall back to Command */ }
  }, [SECTION_KEY]);
  useEApp(() => {
    if (!SECTION_KEY) return;
    try { localStorage.setItem(SECTION_KEY, active); } catch { /* */ }
  }, [SECTION_KEY, active]);
  useEscape(() => setMenu(false), menu);
  const [palette, setPalette] = useSApp(false);

  const wsList = useMApp(() => visibleWorkspaces(isAdmin, departments), [isAdmin, departments]);
  const searchItems = useMApp(() => wsList.flatMap((w) => w.sections.map((s) => ({ ...s, wsLabel: w.label }))), [wsList]);

  useEApp(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  if (loading) return <StaffSplash />;
  if (!user) return <StaffLogin />;
  if (!isStaff) return <StaffDenied email={user.email} onSignOut={signOutUser} />;

  // Resolve the active section → its workspace; fall back to Command if the current
  // selection isn't visible for this person's tier + departments.
  const entry = SECTION_INDEX[active];
  const visible = entry && canSee(entry.workspace, isAdmin, departments) &&
    canSee({ ...entry.section, dept: entry.section.dept === undefined ? entry.workspace.dept : entry.section.dept }, isAdmin, departments);
  const resolved = visible ? active : 'command';
  const { section: activeSection, workspace: activeWorkspace } = SECTION_INDEX[resolved];
  const Screen = SCREENS[resolved] || CommandCenter;

  const staffName = (profile && profile.name) || user.displayName || (user.email ? user.email.split('@')[0] : 'Staff');
  const staffRole = (profile && profile.title) || TIER_LABEL[tier] || (isAdmin ? 'Administrator' : 'Staff');

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
    <RefreshCtx.Provider value={{ tick, refresh, busy: refreshing }}>
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

        {/* A column at least a screen tall, so `main` can absorb the slack. Without this
            the footer sat immediately under short content — halfway up the viewport on an
            empty screen, reading as a broken layout rather than the end of the page. */}
        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-7 h-16" style={{ background:'var(--surface)', borderBottom:'1px solid var(--line)' }}>
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setMenu(true)} className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center t2" style={{ background:'var(--surface2)' }} aria-label="Menu"><Icon name="bars" /></button>
              <nav className="text-sm font-semibold hidden sm:flex items-center gap-2 min-w-0" aria-label="Breadcrumb">
                <span className="t3">{activeWorkspace.label}</span>
                <Icon name="chevron-right" className="text-[10px] t3" />
                <span className="t1 truncate">{activeSection.label}</span>
              </nav>
              <span className="sm:hidden font-bold t1 truncate">{activeSection.label}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => setPalette(true)} className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg text-sm t3" style={{ background:'var(--surface2)', border:'1px solid var(--line)', width:250 }} aria-label="Search">
                <Icon name="magnifying-glass" className="text-sm" />
                <span className="flex-1 text-left">Search everything…</span>
                <kbd className="text-[11px] px-1.5 py-0.5 rounded num" style={{ background:'var(--surface)', border:'1px solid var(--line)' }}>⌘K</kbd>
              </button>
              <button onClick={() => setPalette(true)} className="md:hidden w-9 h-9 rounded-full flex items-center justify-center t2" style={{ background:'var(--surface2)', border:'1px solid var(--line)' }} aria-label="Search"><Icon name="magnifying-glass" /></button>
              <button onClick={refresh} title="Refresh this screen (R)" aria-label="Refresh"
                className="w-9 h-9 rounded-full flex items-center justify-center t2"
                style={{ background:'var(--surface2)', border:'1px solid var(--line)' }}>
                <Icon name="rotate" className={refreshing ? 'fa-spin' : ''} />
              </button>
              <NotificationsBell go={setActive} />
              <ThemeToggle />
              <div className="flex items-center gap-2 pl-1">
                <Avatar src={user.photoURL} name={staffName} size={34} />
                <div className="hidden sm:block leading-tight"><div className="text-sm font-semibold t1">{staffName}</div><div className="text-xs t3">{staffRole}</div></div>
                <button onClick={signOutUser} className="ml-1 w-9 h-9 rounded-full flex items-center justify-center t3" style={{ background:'var(--surface2)', border:'1px solid var(--line)' }} title="Sign out" aria-label="Sign out"><Icon name="right-from-bracket" /></button>
              </div>
            </div>
          </header>

          {/* flex-1: takes the leftover height so the footer is pushed to the bottom.
              w-full is needed alongside max-w — a flex child does not stretch on its own. */}
          <main className="p-4 sm:p-7 max-w-[1240px] w-full mx-auto flex-1"><Screen isAdmin={isAdmin} go={setActive} /></main>

          <footer className="px-7 py-6 text-xs t3 flex flex-col sm:flex-row justify-between gap-2 max-w-[1240px] w-full mx-auto">
            <span>© 2026 Yote Market Limited — Internal Operations Console</span>
            <span>Confidential · staff.yotemarket.com</span>
          </footer>
        </div>
      </div>
      <GlobalSearch open={palette} onClose={() => setPalette(false)} sections={searchItems} go={setActive} isAdmin={isAdmin} />
    </div>
    </RefreshCtx.Provider>
  );
}

export default function StaffApp() {
  return <ThemeProvider><DialogProvider><App /></DialogProvider></ThemeProvider>;
}

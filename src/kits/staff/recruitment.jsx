/* recruitment.jsx — everyone who has applied to us, in one place.

   WHY THIS EXISTS: three application funnels used to live in three different workspaces —
   job applicants under People, riders under Logistics, marketers under Growth. Each was
   in the right department, which is exactly why nobody noticed the problem: there was no
   single answer to "who has applied to us", and the question gets asked far more often
   than any one funnel does.

   CONSOLIDATING THE SCREEN DOES NOT WIDEN THE ACCESS, and that distinction is the whole
   design. Each tab is gated to the department that owns that funnel, so a Logistics lead
   opens Recruitment and sees riders only — the same rows they saw before, reached by a
   different route. People, who own hiring generally, see all three. The callables behind
   each tab enforce this independently; the tabs only decide what to draw.

   Nothing about the individual funnels changed. This is a container. */
import React from 'react';
import { SectionHead, Seg, Card, EmptyState, Icon } from './ui.jsx';
import { useStaffClaims } from './service.js';
import { Careers } from './careers.jsx';
import { RiderApplications } from './riders.jsx';
import { Applications as MarketerApplications } from './screens.jsx';

const { useState } = React;

/* Which department owns each funnel — mirrors the server gates on the callables behind
   them (careers → people, rider applications → logistics, marketers → growth). People
   see all three because hiring is theirs across the company. */
const TABS = [
  {
    key: 'jobs', label: 'Job applications', icon: 'briefcase',
    depts: ['people'],
    desc: 'Candidates from the careers page — triage, interview and hire',
    Screen: Careers,
  },
  {
    key: 'riders', label: 'Riders', icon: 'motorcycle',
    depts: ['logistics', 'people'],
    desc: 'People joining the delivery network — vet and approve',
    Screen: RiderApplications,
  },
  {
    key: 'marketers', label: 'Marketers', icon: 'bullhorn',
    depts: ['growth', 'people'],
    desc: 'Activate applicants as scouts, or move them onto the hiring track',
    Screen: MarketerApplications,
  },
];

export function Recruitment() {
  const { isAdmin, departments = [] } = useStaffClaims();
  const visible = TABS.filter((t) => isAdmin || t.depts.some((d) => departments.includes(d)));
  const [tab, setTab] = useState(visible.length ? visible[0].key : null);

  if (!visible.length) {
    return (
      <Card className="p-6">
        <EmptyState
          icon="lock"
          title="Recruitment is limited to People, Logistics and Growth."
          sub="Ask an admin if you should have access."
        />
      </Card>
    );
  }

  // A tab the caller cannot see must never be the active one — possible when access
  // changes under a session that still holds the old key in state.
  const active = visible.find((t) => t.key === tab) || visible[0];
  const { Screen } = active;

  return (
    <div className="fadeup space-y-6">
      <SectionHead
        icon="user-plus"
        title="Recruitment"
        sub={active.desc}
        action={visible.length > 1 ? (
          <Seg
            value={active.key}
            onChange={setTab}
            options={visible.map((t) => t.key)}
            fmt={(k) => (visible.find((t) => t.key === k) || {}).label || k}
          />
        ) : null}
      />

      {/* Each funnel screen brings its own heading, filters and table. Rendering it
          untouched keeps this file a container rather than a second implementation that
          would drift from the original. */}
      <Screen />

      {visible.length === 1 && (
        <div className="text-xs t3">
          <Icon name="circle-info" /> You see the {active.label.toLowerCase()} funnel because it belongs to your
          department. The other funnels are handled by the departments that own them.
        </div>
      )}
    </div>
  );
}

export default Recruitment;

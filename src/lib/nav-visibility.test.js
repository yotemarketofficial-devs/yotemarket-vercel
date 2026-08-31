/**
 * nav-visibility.test.js — who sees which workspace and section.
 *
 * Hiding a section is presentation only; the callables behind each enforce the same rule
 * server-side. This is defence in depth, not the boundary itself. It is still worth
 * pinning: the console must never OFFER an action the backend will refuse, and must never
 * imply somebody has access they do not.
 *
 * The logic under test is COPIED from kits/staff/index.jsx rather than imported, because
 * that module pulls in the whole console (every screen, firebase, mapbox) and cannot be
 * loaded in a unit test. Keep the two in step — if `canSee` changes there, change it here.
 */
import { describe, it, expect } from 'vitest';

/* ── mirror of canSee / visibleWorkspaces in kits/staff/index.jsx ───────────── */
const canSee = (node, isAdmin, depts) => {
  if (isAdmin) return true;
  if (node.adminOnly) return false;
  if (node.dept) return depts.includes(node.dept);
  if (Array.isArray(node.anyDept)) return node.anyDept.some((d) => depts.includes(d));
  return node.dept === undefined || node.dept === null;
};

function visible(workspaces, isAdmin, depts = []) {
  return workspaces
    .filter((w) => canSee(w, isAdmin, depts))
    .map((w) => ({ ...w, sections: w.sections.filter((sec) => canSee({
      ...sec,
      dept: sec.dept === undefined ? w.dept : sec.dept,
      anyDept: sec.dept !== undefined ? undefined : (sec.anyDept === undefined ? w.anyDept : sec.anyDept),
    }, isAdmin, depts)) }))
    .filter((w) => w.sections.length > 0);
}

/* ── the shipped workspace model, in the shape that matters here ───────────── */
const COMMAND = { key: 'command', dept: null, sections: [{ key: 'command' }, { key: 'account' }, { key: 'boards' }] };
const SAFETY = { key: 'safety', dept: 'safety', sections: [{ key: 'moderation' }, { key: 'reviews' }] };
const SUPPORT = { key: 'support', dept: 'support', sections: [{ key: 'support' }, { key: 'disputes' }] };
const COMMS = { key: 'comms', dept: 'comms', sections: [{ key: 'outreach' }, { key: 'broadcasts' }] };
const GROWTH = {
  key: 'growth', dept: 'growth',
  sections: [{ key: 'scouts' }, { key: 'territories' }, { key: 'promotions', adminOnly: true }],
};
const FINANCE = { key: 'finance', dept: 'finance', sections: [{ key: 'finance' }, { key: 'payroll' }, { key: 'filings' }] };
const PEOPLE = {
  key: 'people', dept: 'people',
  sections: [{ key: 'people' }, { key: 'documents' }, { key: 'team', adminOnly: true }],
};
const LEGAL = { key: 'legal', dept: 'legal', sections: [{ key: 'legal' }, { key: 'compliance' }] };
const RECRUITMENT = {
  key: 'recruitment', anyDept: ['people', 'logistics', 'growth'],
  sections: [{ key: 'recruitment' }],
};
const ADMIN = { key: 'admin', adminOnly: true, sections: [{ key: 'accounts' }] };

const ALL = [COMMAND, SAFETY, SUPPORT, COMMS, GROWTH, FINANCE, PEOPLE, LEGAL, RECRUITMENT, ADMIN];
const wsFor = (depts, isAdmin = false) => visible(ALL, isAdmin, depts).map((w) => w.key);
const sectionsIn = (ws, depts) =>
  (visible(ALL, false, depts).find((w) => w.key === ws) || { sections: [] }).sections.map((s) => s.key);

describe('a department sees its own workspace and nothing else', () => {
  it('gives Trust & Safety only its own rail', () => {
    expect(wsFor(['safety'])).toEqual(['command', 'safety']);
  });

  it('gives Support only its own rail', () => {
    expect(wsFor(['support'])).toEqual(['command', 'support']);
  });

  it('gives Comms only its own rail', () => {
    expect(wsFor(['comms'])).toEqual(['command', 'comms']);
  });

  it('gives Legal legal and compliance, and nothing else', () => {
    // The stated principle: hired into legal and compliance, sees legal and compliance.
    expect(wsFor(['legal'])).toEqual(['command', 'legal']);
    expect(sectionsIn('legal', ['legal'])).toEqual(['legal', 'compliance']);
  });

  it('keeps Finance and People out of the Legal workspace', () => {
    expect(wsFor(['finance'])).not.toContain('legal');
    expect(wsFor(['people'])).not.toContain('legal');
  });

  it('gives Finance and People their own slice of compliance instead', () => {
    expect(sectionsIn('finance', ['finance'])).toContain('filings');
    expect(sectionsIn('people', ['people'])).toContain('documents');
  });

  it('gives somebody in two departments both rails and no more', () => {
    expect(wsFor(['support', 'comms'])).toEqual(['command', 'support', 'comms']);
  });
});

describe('adminOnly still bites inside a visible workspace', () => {
  it('hides promotions from Growth but not from an admin', () => {
    expect(sectionsIn('growth', ['growth'])).toEqual(['scouts', 'territories']);
    expect(visible(ALL, true, []).find((w) => w.key === 'growth').sections.map((s) => s.key))
      .toContain('promotions');
  });

  it('hides Access & roles from People', () => {
    expect(sectionsIn('people', ['people'])).not.toContain('team');
  });
});

describe('shared workspaces', () => {
  it('admits any of the three owning departments to Recruitment', () => {
    ['people', 'logistics', 'growth'].forEach((d) => expect(wsFor([d]), d).toContain('recruitment'));
  });

  it('keeps everyone else out of Recruitment', () => {
    ['support', 'comms', 'safety', 'finance', 'legal'].forEach((d) => {
      expect(wsFor([d]), d).not.toContain('recruitment');
    });
  });
});

describe('a section inside a shared workspace is not widened by it', () => {
  /* THE REGRESSION THIS GUARDS. `canSee` once tested `anyDept` before a node's own
     `dept`, and a shared workspace passes its `anyDept` down to sections — so every
     section became visible to everyone in any of the workspace's departments.
     Recruitment is currently the only shared rail and its single section is meant to be
     shared, so the fixture below is synthetic: it exists to keep the RULE pinned for the
     next shared workspace, which would otherwise hit this again unnoticed. */
  const SHARED = {
    key: 'shared', anyDept: ['alpha', 'beta'],
    sections: [
      { key: 'alphaOnly', dept: 'alpha' },
      { key: 'betaOnly', dept: 'beta' },
      { key: 'either' },
    ],
  };

  it('shows a section only to the department that owns it', () => {
    expect(visible([SHARED], false, ['alpha'])[0].sections.map((s) => s.key))
      .toEqual(['alphaOnly', 'either']);
    expect(visible([SHARED], false, ['beta'])[0].sections.map((s) => s.key))
      .toEqual(['betaOnly', 'either']);
  });

  it('never leaks one department’s section to the other', () => {
    expect(visible([SHARED], false, ['alpha'])[0].sections.map((s) => s.key)).not.toContain('betaOnly');
    expect(visible([SHARED], false, ['beta'])[0].sections.map((s) => s.key)).not.toContain('alphaOnly');
  });

  it('still lets an unscoped section inherit the shared rule', () => {
    expect(visible([SHARED], false, ['alpha'])[0].sections.map((s) => s.key)).toContain('either');
    expect(visible([SHARED], false, ['gamma'])).toEqual([]);
  });
});

describe('the rest of the model', () => {
  it('shows Command to everyone, whatever their department', () => {
    ['safety', 'support', 'comms', 'growth', 'legal', 'finance', 'people'].forEach((d) => {
      expect(wsFor([d]), d).toContain('command');
    });
  });

  it('gives everyone their own account section', () => {
    // Everyone has a password, whatever they work on.
    ['safety', 'legal', 'finance'].forEach((d) => {
      expect(sectionsIn('command', [d]), d).toContain('account');
    });
  });

  it('hides the admin workspace from every non-admin', () => {
    ['safety', 'support', 'legal', 'finance', 'people'].forEach((d) => {
      expect(wsFor([d]), d).not.toContain('admin');
    });
  });

  it('gives an admin everything', () => {
    expect(wsFor([], true)).toEqual(ALL.map((w) => w.key));
  });

  it('leaves somebody with no departments just Command', () => {
    expect(wsFor([])).toEqual(['command']);
  });
});

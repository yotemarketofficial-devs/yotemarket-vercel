/**
 * nav-visibility.test.js — who sees which workspace and section.
 *
 * This exists because of a bug that nearly shipped. When several departments share one
 * workspace, the workspace's `anyDept` is passed down to its sections — and the original
 * `canSee` checked `anyDept` BEFORE a section's own `dept`. Merging Trust & Safety,
 * Support, Comms and Growth into one rail would therefore have shown every section to
 * everyone in any of the four: a Support agent reading the moderation queue, a Comms
 * agent approving scout payouts.
 *
 * Hiding a section is presentation only — the callables behind each enforce the same rule
 * server-side — so this is defence in depth rather than the boundary itself. It is still
 * worth pinning: the console must never OFFER an action the backend will refuse, and it
 * must never imply somebody has access they do not.
 *
 * The logic under test is copied from index.jsx rather than imported, because that module
 * pulls in the whole console (every screen, firebase, mapbox) and cannot be loaded in a
 * unit test. Keep the two in step — if `canSee` changes there, change it here.
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

/* The shapes that actually matter, taken from the real workspace model. */
const COMMUNITY = {
  key: 'community', anyDept: ['safety', 'support', 'comms', 'growth'],
  sections: [
    { key: 'support', dept: 'support' },
    { key: 'disputes', dept: 'support' },
    { key: 'moderation', dept: 'safety' },
    { key: 'reviews', dept: 'safety' },
    { key: 'outreach', dept: 'comms' },
    { key: 'broadcasts', dept: 'comms' },
    { key: 'scouts', dept: 'growth' },
    { key: 'promotions', dept: 'growth', adminOnly: true },
  ],
};
const LEGAL = {
  key: 'legal', dept: 'legal',
  sections: [{ key: 'legal' }, { key: 'compliance' }],
};
const FINANCE = {
  key: 'finance', dept: 'finance',
  sections: [{ key: 'finance' }, { key: 'payroll' }, { key: 'filings' }],
};
const PEOPLE = {
  key: 'people', dept: 'people',
  sections: [{ key: 'people' }, { key: 'documents' }, { key: 'team', adminOnly: true }],
};
const RECRUITMENT = {
  key: 'recruitment', anyDept: ['people', 'logistics', 'growth'],
  sections: [{ key: 'recruitment' }],
};
const COMMAND = { key: 'command', dept: null, sections: [{ key: 'command' }, { key: 'boards' }] };
const ADMIN = { key: 'admin', adminOnly: true, sections: [{ key: 'accounts' }] };

const ALL = [COMMAND, COMMUNITY, FINANCE, PEOPLE, LEGAL, RECRUITMENT, ADMIN];
const keysFor = (depts, isAdmin = false) =>
  visible(ALL, isAdmin, depts).map((w) => [w.key, w.sections.map((s) => s.key)]);
const sectionsIn = (ws, depts) =>
  (visible(ALL, false, depts).find((w) => w.key === ws) || { sections: [] }).sections.map((s) => s.key);

describe('a shared workspace does not widen its sections', () => {
  it('shows a Support person only the Support sections of Community', () => {
    // THE BUG THIS PINS. Before the fix these four departments shared one `anyDept`,
    // and every section matched it.
    expect(sectionsIn('community', ['support'])).toEqual(['support', 'disputes']);
  });

  it('shows a Trust & Safety person only the moderation sections', () => {
    expect(sectionsIn('community', ['safety'])).toEqual(['moderation', 'reviews']);
  });

  it('shows a Comms person only the outward messaging sections', () => {
    expect(sectionsIn('community', ['comms'])).toEqual(['outreach', 'broadcasts']);
  });

  it('never shows the moderation queue to Support, Comms or Growth', () => {
    ['support', 'comms', 'growth'].forEach((d) => {
      expect(sectionsIn('community', [d]), d).not.toContain('moderation');
    });
  });

  it('never shows scout payouts to anyone but Growth', () => {
    ['support', 'comms', 'safety'].forEach((d) => {
      expect(sectionsIn('community', [d]), d).not.toContain('scouts');
    });
  });

  it('still keeps an adminOnly section admin-only inside a shared workspace', () => {
    expect(sectionsIn('community', ['growth'])).not.toContain('promotions');
    expect(visible(ALL, true, []).find((w) => w.key === 'community').sections.map((s) => s.key))
      .toContain('promotions');
  });

  it('gives someone in two of the four departments both sets and no more', () => {
    expect(sectionsIn('community', ['support', 'comms']))
      .toEqual(['support', 'disputes', 'outreach', 'broadcasts']);
  });
});

describe('legal and compliance are one job, scoped to legal', () => {
  it('gives a Legal person Records and the compliance register', () => {
    expect(sectionsIn('legal', ['legal'])).toEqual(['legal', 'compliance']);
  });

  it('shows a Legal person NOTHING outside legal', () => {
    // The stated principle: hired into legal and compliance, sees legal and compliance.
    const seen = keysFor(['legal']).map(([k]) => k);
    expect(seen).toEqual(['command', 'legal']);
  });

  it('does not put Finance or People into the Legal workspace', () => {
    expect(keysFor(['finance']).map(([k]) => k)).not.toContain('legal');
    expect(keysFor(['people']).map(([k]) => k)).not.toContain('legal');
  });

  it('gives Finance its own slice of compliance instead', () => {
    expect(sectionsIn('finance', ['finance'])).toContain('filings');
  });

  it('gives People its own slice of compliance instead', () => {
    expect(sectionsIn('people', ['people'])).toContain('documents');
  });
});

describe('the rest of the model still holds', () => {
  it('shows Command to everyone, whatever their department', () => {
    ['support', 'legal', 'finance', 'people', 'growth'].forEach((d) => {
      expect(keysFor([d]).map(([k]) => k), d).toContain('command');
    });
  });

  it('hides the admin workspace from every non-admin', () => {
    ['support', 'legal', 'finance', 'people'].forEach((d) => {
      expect(keysFor([d]).map(([k]) => k), d).not.toContain('admin');
    });
  });

  it('gives an admin everything', () => {
    expect(keysFor([], true).map(([k]) => k)).toEqual(ALL.map((w) => w.key));
  });

  it('admits any of the three owning departments to Recruitment', () => {
    ['people', 'logistics', 'growth'].forEach((d) => {
      expect(keysFor([d]).map(([k]) => k), d).toContain('recruitment');
    });
    expect(keysFor(['support']).map(([k]) => k)).not.toContain('recruitment');
  });

  it('drops a workspace entirely when none of its sections survive', () => {
    // Somebody with no departments should see Command and nothing else.
    expect(keysFor([]).map(([k]) => k)).toEqual(['command']);
  });
});

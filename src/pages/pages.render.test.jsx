// Smoke test: every homepage band and every redesigned marketing page renders to HTML
// without throwing. A build does not catch a name that is used but never imported (it
// only fails when the component runs) — that is how moving the line icons into
// components/LineIcon.jsx took the homepage down on 2026-10-09 until ICONS was imported
// again. Rendering each one here turns that class of mistake into a failing `npm test`,
// which CI runs before every deploy.
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../lib/useAuth.jsx';
import {
  RolesSection, ShoppersSection, MerchantsSection, YoteAiSection, YoteFeedSection,
  EarnSection, AppsSection, CommunityStatsSection, CtaSection,
} from './HomeSections.jsx';
import About from './About.jsx';
import Careers from './Careers.jsx';
import Pricing from './Pricing.jsx';
import MobilePage from './MobilePage.jsx';
import ApkPage from './ApkPage.jsx';
import RiderPage from './RiderPage.jsx';

// Effects don't run in renderToString, so the provider never reaches Firebase here.
const html = (el) => renderToString(<AuthProvider><MemoryRouter>{el}</MemoryRouter></AuthProvider>);

describe('homepage bands render', () => {
  const bands = {
    RolesSection: <RolesSection />,
    ShoppersSection: <ShoppersSection />,
    MerchantsSection: <MerchantsSection />,
    YoteAiSection: <YoteAiSection />,
    YoteFeedSection: <YoteFeedSection clips={[]} />,
    EarnSection: <EarnSection />,
    AppsSection: <AppsSection />,
    CommunityStatsSection: <CommunityStatsSection stats={null} />,
    CtaSection: <CtaSection />,
  };
  for (const [name, el] of Object.entries(bands)) {
    it(name, () => { expect(html(el).length).toBeGreaterThan(200); });
  }
});

describe('redesigned pages render, gradient title included', () => {
  const pages = { About: <About />, Careers: <Careers />, Pricing: <Pricing />, MobilePage: <MobilePage />, ApkPage: <ApkPage />, RiderPage: <RiderPage /> };
  for (const [name, el] of Object.entries(pages)) {
    it(name, () => {
      const out = html(el);
      expect(out).toContain('class="ph-title"');
      // the brand gradient on the title's second line (the owner's ask, 2026-10-09)
      expect(out).toMatch(/class="ph-title"[\s\S]*?class="g"/);
    });
  }
});

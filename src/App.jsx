import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout.jsx';
import RouteSeo from './components/RouteSeo.jsx';
import AppManifest from './components/AppManifest.jsx';
import HomePage from './pages/HomePage.jsx';
import MobilePage from './pages/MobilePage.jsx';
import RiderPage from './pages/RiderPage.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import Pricing from './pages/Pricing.jsx';
import Careers from './pages/Careers.jsx';
import Terms from './pages/Terms.jsx';
import Privacy from './pages/Privacy.jsx';
import DeleteAccount from './pages/DeleteAccount.jsx';
import HelpCenter from './pages/HelpCenter.jsx';
import NotFound from './components/NotFound.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import KitFrame from './components/KitFrame.jsx';
import GoogleOneTap from './components/GoogleOneTap.jsx';
import Analytics from './components/Analytics.jsx';
import CookieConsent from './components/CookieConsent.jsx';

// Imported design kits are full-bleed apps with their own chrome — code-split so the
// marketing landing stays lean and each kit's scoped CSS only loads on its route.
const StorefrontApp = lazy(() => import('./kits/storefront/index.jsx'));
const DashboardApp = lazy(() => import('./kits/dashboard/gated.jsx'));
const MarketersApp = lazy(() => import('./kits/marketers/index.jsx'));
const EarnLanding = lazy(() => import('./kits/earn/index.jsx'));
const StaffApp = lazy(() => import('./kits/staff/index.jsx'));
const HubApp = lazy(() => import('./kits/hub/index.jsx'));
const PosApp = lazy(() => import('./kits/pos/index.jsx'));

function App() {
  return (
    <>
      <ScrollToTop />
      {/* Per-route title/description/canonical. Without it every URL served the
          homepage's tags — including a canonical that folded the whole site into
          "/". See components/RouteSeo.jsx. */}
      <RouteSeo />
      {/* Per-route PWA manifest — makes /storefront, /dashboard, /pos and
          /marketers/app installable as four separate apps. See lib/pwa.js. */}
      <AppManifest />
      {/* Vercel Web Analytics — counts client-side route changes too (consent-gated). */}
      <Analytics />
      <CookieConsent />
      <GoogleOneTap />
      <Routes>
        {/* Marketing site (shared nav/footer chrome) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="mobile" element={<MobilePage />} />
          <Route path="rider" element={<RiderPage />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="careers" element={<Careers />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          {/* Public account/data deletion page — required by Google Play for both apps. */}
          <Route path="delete-account" element={<DeleteAccount />} />
          <Route path="help" element={<HelpCenter />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Full-bleed product experiences (imported kits) */}
        {/* The mall answers on five paths. /store/:sid, /product/:pid and
            /feed/:vid are REAL addresses — without them nothing in the shop could
            be linked, shared or indexed, because browsing never left /storefront.
            YoteFeed had no address at all, so every clip was invisible to search
            and unshareable; /feed/:vid opens that clip directly.
            All of them render the same element instance, so moving between them
            never remounts the shell (the cart and in-app stack survive). */}
        {['/storefront', '/store/:sid', '/product/:pid', '/feed', '/feed/:vid'].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <KitFrame scope="kit-storefront">
                <StorefrontApp />
              </KitFrame>
            }
          />
        ))}
        <Route
          path="/dashboard"
          element={
            <KitFrame scope="kit-dashboard">
              <DashboardApp />
            </KitFrame>
          }
        />
        {/* /marketers = the Marketer Program recruitment landing (reached via "Earn");
            the scout app itself lives at /marketers/app */}
        <Route
          path="/marketers"
          element={
            <KitFrame scope="kit-earn">
              <EarnLanding />
            </KitFrame>
          }
        />
        <Route
          path="/marketers/app"
          element={
            <KitFrame scope="kit-marketers">
              <MarketersApp />
            </KitFrame>
          }
        />
        <Route
          path="/staff"
          element={
            <KitFrame scope="kit-staff">
              <StaffApp />
            </KitFrame>
          }
        />
        {/* /admin is merged into the staff portal — redirect any old links. */}
        <Route path="/admin" element={<Navigate to="/staff" replace />} />
        <Route path="/admin/*" element={<Navigate to="/staff" replace />} />
        <Route
          path="/hub"
          element={
            <KitFrame scope="kit-hub">
              <HubApp />
            </KitFrame>
          }
        />
        {/* POS runs as its own full-screen subsystem (reuses the dashboard kit styling). */}
        <Route
          path="/pos"
          element={
            <KitFrame scope="kit-dashboard">
              <PosApp />
            </KitFrame>
          }
        />
      </Routes>
    </>
  );
}

export default App;

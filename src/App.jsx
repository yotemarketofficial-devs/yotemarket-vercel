import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import MobilePage from './pages/MobilePage.jsx';
import RiderPage from './pages/RiderPage.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import Pricing from './pages/Pricing.jsx';
import Careers from './pages/Careers.jsx';
import NotFound from './components/NotFound.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import KitFrame from './components/KitFrame.jsx';

// Imported design kits are full-bleed apps with their own chrome — code-split so the
// marketing landing stays lean and each kit's scoped CSS only loads on its route.
const StorefrontApp = lazy(() => import('./kits/storefront/index.jsx'));
const DashboardApp = lazy(() => import('./kits/dashboard/gated.jsx'));
const MarketersApp = lazy(() => import('./kits/marketers/index.jsx'));
const EarnLanding = lazy(() => import('./kits/earn/index.jsx'));
const StaffApp = lazy(() => import('./kits/staff/index.jsx'));
const AdminApp = lazy(() => import('./kits/admin/index.jsx'));
const HubApp = lazy(() => import('./kits/hub/index.jsx'));

function App() {
  return (
    <>
      <ScrollToTop />
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
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Full-bleed product experiences (imported kits) */}
        <Route
          path="/storefront"
          element={
            <KitFrame scope="kit-storefront">
              <StorefrontApp />
            </KitFrame>
          }
        />
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
        <Route
          path="/admin"
          element={
            <KitFrame scope="kit-admin">
              <AdminApp />
            </KitFrame>
          }
        />
        <Route
          path="/hub"
          element={
            <KitFrame scope="kit-hub">
              <HubApp />
            </KitFrame>
          }
        />
      </Routes>
    </>
  );
}

export default App;

import { Routes, Route } from 'react-router-dom';
import Layout from './Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import StorefrontPage from './pages/StorefrontPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MarketersPage from './pages/MarketersPage.jsx';
import MobilePage from './pages/MobilePage.jsx';
import RiderPage from './pages/RiderPage.jsx';
import StaffPage from './pages/StaffPage.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="storefront" element={<StorefrontPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="marketers" element={<MarketersPage />} />
        <Route path="mobile" element={<MobilePage />} />
        <Route path="rider" element={<RiderPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="*" element={<HomePage />} />
      </Route>
    </Routes>
  );
}

export default App;

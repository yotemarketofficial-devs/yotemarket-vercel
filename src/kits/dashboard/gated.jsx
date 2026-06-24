/* gated.jsx — lazy entry for /dashboard: store-signup gate around the dashboard.
   Keeps the whole merchant kit (gate + dashboard) in one code-split chunk. */
import React from 'react';
import MerchantGate from './MerchantGate.jsx';
import DashboardApp from './index.jsx';

export default function DashboardGated() {
  return (
    <MerchantGate>
      <DashboardApp />
    </MerchantGate>
  );
}

import { Link } from 'react-router-dom';

function MobilePage() {
  return (
    <main className="page-shell">
      <div className="wrap page-grid">
        <div>
          <h1>Mobile App</h1>
          <p>
            Download the YoteMarket shopper app and manage orders, chats, and payments from your phone.
          </p>
          <div className="page-actions">
            <Link className="btn btn-primary" to="/">Back to home</Link>
            <Link className="btn btn-outline" to="/storefront">Browse the mall</Link>
          </div>
        </div>
        <div className="app-download-card">
          <div className="app-icon-row">
            <img src="/assets/app_icon.png" alt="App icon" />
            <div>
              <h2>YoteMarket Shopper</h2>
              <p>Shop from local stores, negotiate on WhatsApp, and pay with M-Pesa.</p>
            </div>
          </div>
          <div className="download-buttons">
            <button className="store">Google Play</button>
            <button className="store">App Store</button>
          </div>
          <div className="app-screens">
            <img src="/assets/splash_shopper.png" alt="Shopper app preview" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default MobilePage;

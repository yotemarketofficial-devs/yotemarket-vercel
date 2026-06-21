import { Link } from 'react-router-dom';

function RiderPage() {
  return (
    <main className="page-shell">
      <div className="wrap page-grid">
        <div>
          <h1>Rider Experience</h1>
          <p>
            Ride with YoteMarket, earn from deliveries, and get paid through M-Pesa.
          </p>
          <div className="page-actions">
            <Link className="btn btn-primary" to="/">Back to home</Link>
            <Link className="btn btn-outline" to="/storefront">Explore stores</Link>
          </div>
        </div>
        <div className="app-download-card">
          <div className="app-icon-row">
            <img src="/assets/rider_app_icon.png" alt="Rider app icon" />
            <div>
              <h2>YoteMarket Rider</h2>
              <p>Deliver orders faster, manage rides, and earn more every day.</p>
            </div>
          </div>
          <div className="download-buttons">
            <button className="store">Join rider network</button>
          </div>
          <div className="app-screens">
            <img src="/assets/splash_rider.png" alt="Rider app preview" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default RiderPage;

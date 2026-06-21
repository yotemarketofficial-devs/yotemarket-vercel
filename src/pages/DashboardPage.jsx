import { Link } from 'react-router-dom';

function DashboardPage() {
  return (
    <main className="page-shell">
      <div className="wrap page-grid">
        <div>
          <h1>Seller Dashboard</h1>
          <p>
            Manage your storefront, track orders, and access business insights from one place.
          </p>
          <div className="page-actions">
            <Link className="btn btn-primary" to="/">Back to home</Link>
            <Link className="btn btn-outline" to="/storefront">View store</Link>
          </div>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <h2>Brand storefront</h2>
            <p>Create a custom storefront and display your products to shoppers.
            </p>
          </div>
          <div className="feature-card">
            <h2>Orders & payouts</h2>
            <p>Track pending and delivered orders, then settle earnings via M-Pesa.
            </p>
          </div>
          <div className="feature-card">
            <h2>Merchant insights</h2>
            <p>See buyer demand, product popularity, and local shopping trends.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default DashboardPage;

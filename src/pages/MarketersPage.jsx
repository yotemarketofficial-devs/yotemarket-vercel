import { Link } from 'react-router-dom';

function MarketersPage() {
  return (
    <main className="page-shell">
      <div className="wrap page-grid">
        <div>
          <h1>Marketer Program</h1>
          <p>
            Refer merchants, earn commissions, and level up with every successful referral.
          </p>
          <div className="page-actions">
            <Link className="btn btn-primary" to="/">Back to home</Link>
            <Link className="btn btn-outline" to="/dashboard">Become a seller</Link>
          </div>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <h2>Earn rewards</h2>
            <p>Get paid for each merchant you onboard and each first order delivered.
            </p>
          </div>
          <div className="feature-card">
            <h2>Rider referrals</h2>
            <p>Help us grow the delivery network and earn from every completed ride.
            </p>
          </div>
          <div className="feature-card">
            <h2>Leaderboard</h2>
            <p>Climb the leaderboard, collect checkpoints, and unlock higher payouts.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default MarketersPage;

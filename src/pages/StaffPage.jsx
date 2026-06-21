import { Link } from 'react-router-dom';

function StaffPage() {
  return (
    <main className="page-shell">
      <div className="wrap page-grid">
        <div>
          <h1>Staff Login</h1>
          <p>
            Access secure internal tools for YoteMarket staff and operations.
          </p>
          <div className="page-actions">
            <Link className="btn btn-primary" to="/">Back to home</Link>
          </div>
        </div>
        <div className="staff-card">
          <div className="staff-form">
            <label>
              Email
              <input type="email" placeholder="staff@yotemarket.com" disabled />
            </label>
            <label>
              Password
              <input type="password" placeholder="********" disabled />
            </label>
            <button className="btn btn-outline" disabled>Staff portal coming soon</button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default StaffPage;

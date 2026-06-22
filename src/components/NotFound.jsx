import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="page-shell">
      <div className="wrap" style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto', padding: '40px 0' }}>
        <div style={{ fontSize: 72, fontWeight: 800, color: 'var(--purple)', letterSpacing: '-.04em' }}>404</div>
        <h1 style={{ marginTop: 8 }}>Page not found</h1>
        <p style={{ color: 'var(--t3)', marginTop: 14 }}>
          The page you’re looking for doesn’t exist or has moved. Let’s get you back to the mall.
        </p>
        <div className="page-actions" style={{ justifyContent: 'center', marginTop: 28 }}>
          <Link className="btn btn-primary" to="/">
            <i className="fas fa-house" aria-hidden="true" /> Back to home
          </Link>
          <Link className="btn btn-outline" to="/storefront">
            Browse the mall
          </Link>
        </div>
      </div>
    </main>
  );
}

import { Component } from 'react';
import { reportError } from '../lib/monitoring.js';

// App-wide error boundary so a render error in one route never white-screens the
// whole site. Shows a branded recovery card with a reload affordance — and now
// reports the crash, so we hear about it before a user has to tell us.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // reportError console.errors too, so local debugging is unchanged.
    reportError(error, { source: 'render', componentStack: info?.componentStack });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 460 }}>
            <div style={{ fontSize: 44, color: 'var(--purple)', marginBottom: 14 }}>
              <i className="fas fa-triangle-exclamation" aria-hidden="true" />
            </div>
            <h2 style={{ marginBottom: 10 }}>Something went wrong</h2>
            <p style={{ color: 'var(--t3)', marginBottom: 24 }}>
              An unexpected error occurred. Reloading usually fixes it.
            </p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              <i className="fas fa-rotate-right" aria-hidden="true" /> Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

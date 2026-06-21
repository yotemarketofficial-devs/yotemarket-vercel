import { Link } from 'react-router-dom';

function StorefrontPage() {
  return (
    <main className="page-shell">
      <div className="wrap page-grid">
        <div>
          <h1>Virtual Mall</h1>
          <p>
            Browse curated storefronts, add items to cart, and checkout with M-Pesa.
          </p>
          <div className="page-actions">
            <Link className="btn btn-primary" to="/">Back to home</Link>
            <Link className="btn btn-outline" to="/mobile">Download app</Link>
          </div>
        </div>
        <div className="storefront-card">
          <div className="storefront-card__header">
            <span>Explore the mall</span>
            <button className="btn-outline">See all stores</button>
          </div>
          <div className="storefront-list">
            <article className="storefront-item">
              <div className="storefront-icon">📱</div>
              <div>
                <h2>Wanjiku Electronics</h2>
                <p>Phones, accessories & repairs — 124 products · 4.8</p>
              </div>
            </article>
            <article className="storefront-item">
              <div className="storefront-icon">🪴</div>
              <div>
                <h2>Mama Njeri Fresh</h2>
                <p>Farm-fresh produce, delivered same day — 86 products · 4.9</p>
              </div>
            </article>
            <article className="storefront-item">
              <div className="storefront-icon">👗</div>
              <div>
                <h2>Kipenzi Fashion House</h2>
                <p>Ankara, official wear & streetwear — 210 products · 4.6</p>
              </div>
            </article>
            <article className="storefront-item">
              <div className="storefront-icon">🛋️</div>
              <div>
                <h2>Simba Home Decor</h2>
                <p>Handmade furniture & decor — 58 products · 4.7</p>
              </div>
            </article>
            <article className="storefront-item">
              <div className="storefront-icon">💄</div>
              <div>
                <h2>Zuri Beauty Hub</h2>
                <p>Skincare, braids & cosmetics — 97 products · 4.5</p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </main>
  );
}

export default StorefrontPage;

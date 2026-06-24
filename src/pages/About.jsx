import { Link } from 'react-router-dom';

function About() {
  return (
    <main>
      <section className="pad">
        <div className="wrap">
          <div className="page-head">
            <span className="eyebrow"><i className="fas fa-building"></i> About YoteMarket</span>
            <h1>Kenya's virtual mall, built for everyone</h1>
            <p>
              We bundle a virtual mall, merchant tools, and last-mile delivery into one ecosystem — so local
              stores can reach the whole country and shoppers can buy with confidence.
            </p>
          </div>
          <div className="prose">
            <h3>What we do</h3>
            <p>
              Every local business gets a branded storefront in the mall, with product management, an in-app
              messenger to chat and negotiate with buyers, AI tools that write listings and surface demand
              insights, a wallet with M-Pesa payouts, and a flat monthly subscription — no sales commission.
            </p>
            <h3>How it works</h3>
            <p>
              Shoppers browse hundreds of stores like a physical mall, chat &amp; negotiate in the app messenger,
              pay with M-Pesa escrow, and collect at their nearest pickup hub. A network of zero-hour riders
              delivers from local hubs to keep costs low and earnings fair.
            </p>
            <h3>Join the team</h3>
            <p>
              We're always looking for sharp marketers and reliable riders. Sign up merchants through our{' '}
              <Link to="/marketers" style={{ color: 'var(--purple)', fontWeight: 600 }}>marketer program</Link>, or{' '}
              <Link to="/rider" style={{ color: 'var(--purple)', fontWeight: 600 }}>ride with us</Link> on your own schedule.
            </p>
          </div>
          <div className="sec-cta">
            <Link className="btn btn-primary btn-lg" to="/storefront">Shop the mall <i className="fas fa-arrow-right"></i></Link>
            <Link className="btn btn-outline btn-lg" to="/contact">Contact us</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default About;

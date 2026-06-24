import { Link } from 'react-router-dom';

function Contact() {
  return (
    <main>
      <section className="pad">
        <div className="wrap">
          <div className="page-head">
            <span className="eyebrow"><i className="fas fa-headset"></i> Contact</span>
            <h1>We'd love to hear from you</h1>
            <p>Questions about shopping, selling, riding, or partnering with YoteMarket? Reach us any time.</p>
          </div>
          <div className="contact-grid">
            <div className="contact-card">
              <div className="ci"><i className="fas fa-envelope"></i></div>
              <h4>Email</h4>
              <a href="mailto:general@yotemarket.com">general@yotemarket.com</a>
            </div>
            <div className="contact-card">
              <div className="ci"><i className="fas fa-phone"></i></div>
              <h4>Phone</h4>
              <a href="tel:0720730861">0720 730 861</a>
            </div>
            <div className="contact-card">
              <div className="ci"><i className="fas fa-location-dot"></i></div>
              <h4>Location</h4>
              <p>Nairobi, Kenya</p>
            </div>
          </div>
          <div className="sec-cta" style={{ marginTop: '38px' }}>
            <Link className="btn btn-primary btn-lg" to="/dashboard">Become a seller <i className="fas fa-arrow-right"></i></Link>
            <Link className="btn btn-outline btn-lg" to="/storefront">Shop the mall</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Contact;

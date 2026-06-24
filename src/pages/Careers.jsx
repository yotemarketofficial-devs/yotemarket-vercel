import { Link } from 'react-router-dom';

const DEPARTMENTS = [
  { icon: 'fa-code', tint: 'linear-gradient(135deg,#7C2BD4,#A020F0)', title: 'Engineering', desc: 'Build the apps, dashboards and platform that power the mall.' },
  { icon: 'fa-truck-ramp-box', tint: 'linear-gradient(135deg,#3b82f6,#2563eb)', title: 'Operations & Logistics', desc: 'Run the hubs and last-mile delivery network across counties.' },
  { icon: 'fa-headset', tint: 'linear-gradient(135deg,#009B3A,#057a30)', title: 'Customer Support', desc: 'Help shoppers, merchants and riders get the most out of YoteMarket.' },
  { icon: 'fa-handshake', tint: 'linear-gradient(135deg,#E89B0C,#F4B530)', title: 'Growth & Partnerships', desc: 'Onboard merchants and grow the YoteMarket ecosystem.' },
  { icon: 'fa-calculator', tint: 'linear-gradient(135deg,#5B16A8,#7C2BD4)', title: 'Finance & Admin', desc: 'Keep payouts, compliance and the office running smoothly.' },
  { icon: 'fa-bullhorn', tint: 'linear-gradient(135deg,#ec4899,#A020F0)', title: 'Marketing & Brand', desc: 'Tell the YoteMarket story and bring more Kenyans on board.' },
];

function Careers() {
  return (
    <main>
      <section className="pad">
        <div className="wrap">
          <div className="page-head">
            <span className="eyebrow"><i className="fas fa-briefcase"></i> Careers</span>
            <h1>Build Kenya's virtual mall with us</h1>
            <p>
              We're growing our team in Nairobi. If you want to do your best work on a product used across the
              country, we'd love to meet you.
            </p>
          </div>

          <div className="dept-grid">
            {DEPARTMENTS.map((d) => (
              <article className="dept-card" key={d.title}>
                <div className="di" style={{ background: d.tint }}>
                  <i className={`fas ${d.icon}`}></i>
                </div>
                <h4>{d.title}</h4>
                <p>{d.desc}</p>
              </article>
            ))}
          </div>

          <div className="callout">
            <h3>Don't see your role?</h3>
            <p>We're always keen to meet sharp people. Send your CV and a short note and we'll be in touch.</p>
            <a className="btn btn-primary btn-lg" href="mailto:general@yotemarket.com?subject=Careers%20at%20YoteMarket">
              <i className="fas fa-envelope"></i> Apply — general@yotemarket.com
            </a>
          </div>

          <p className="price-note" style={{ marginTop: '28px' }}>
            Looking for flexible field work instead? Earn as a{' '}
            <Link to="/marketers" style={{ color: 'var(--purple)', fontWeight: 600 }}>marketer</Link> or{' '}
            <Link to="/rider" style={{ color: 'var(--purple)', fontWeight: 600 }}>rider</Link> — no office required.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Careers;

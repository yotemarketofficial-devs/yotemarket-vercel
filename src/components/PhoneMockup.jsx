// PhoneMockup — the YoteMarket shopper-app device mockup used on the landing and the
// mobile app page. Pure presentational; styles live in styles.css (.phone / .ap-*).
export default function PhoneMockup() {
  return (
    <div className="phone-wrap">
      <div className="phone">
        <div className="screen">
          <div className="island"></div>
          <div className="ap-head">
            <div className="ap-status">
              <span>9:41</span>
              <span className="r">
                <i className="fas fa-signal"></i>
                <i className="fas fa-wifi"></i>
                <i className="fas fa-battery-full"></i>
              </span>
            </div>
            <div className="ap-top">
              <img src="/assets/logo-white.png" alt="YoteMarket" />
              <div className="ap-icons">
                <span className="ap-ic"><i className="fas fa-coins" style={{ color: '#f4b530' }}></i></span>
                <span className="ap-ic"><i className="fas fa-cart-shopping"></i></span>
              </div>
            </div>
            <div className="ap-search">
              <i className="fas fa-magnifying-glass"></i>
              Search the mall
            </div>
          </div>
          <div className="ap-body">
            <div className="ap-chips">
              <span className="ap-chip on"><i className="fas fa-border-all"></i> All</span>
              <span className="ap-chip"><i className="fas fa-mobile-screen" style={{ color: '#3b82f6' }}></i> Electronics</span>
              <span className="ap-chip"><i className="fas fa-shirt" style={{ color: '#a020f0' }}></i> Fashion</span>
            </div>
            <div className="ap-sec">Explore the mall</div>
            <div className="ap-store">
              <div className="bn"><i className="fas fa-store"></i></div>
              <div className="bd">
                <div className="lg"><i className="fas fa-store"></i></div>
                <div className="nm">
                  Wanjiku Electronics <i className="fas fa-circle-check" style={{ color: '#5b2c9c', fontSize: '9px' }}></i>
                </div>
                <div className="mt">★ 4.8 · 124 products</div>
              </div>
            </div>
            <div className="ap-sec">For you</div>
            <div className="ap-grid">
              <div className="ap-pc">
                <div className="im" style={{ background: 'linear-gradient(135deg,#3b82f62e,#3b82f655)', color: '#3b82f6' }}>
                  <i className="fas fa-mobile-screen-button"></i>
                </div>
                <div className="pb">
                  <div className="pn">Samsung Galaxy A15 128GB</div>
                  <div className="pr">
                    <span className="pp">Ksh 18,500</span>
                    <span className="pa"><i className="fas fa-plus"></i></span>
                  </div>
                </div>
              </div>
              <div className="ap-pc">
                <div className="im" style={{ background: 'linear-gradient(135deg,#10b9812e,#10b98155)', color: '#10b981' }}>
                  <i className="fas fa-seedling"></i>
                </div>
                <div className="pb">
                  <div className="pn">Fresh Avocados (6 pack)</div>
                  <div className="pr">
                    <span className="pp">Ksh 350</span>
                    <span className="pa"><i className="fas fa-plus"></i></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="ap-nav">
            <div className="nv on"><div className="pillx"><i className="fas fa-house"></i></div><span>Home</span></div>
            <div className="nv"><div className="pillx"><i className="fas fa-store"></i></div><span>Mall</span></div>
            <div className="nv"><div className="pillx"><i className="fas fa-comments"></i></div><span>Chats</span></div>
            <div className="nv"><div className="pillx"><i className="fas fa-box"></i></div><span>Orders</span></div>
            <div className="nv"><div className="pillx"><i className="fas fa-user"></i></div><span>Profile</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

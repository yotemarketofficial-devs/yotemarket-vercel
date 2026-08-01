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
              We combine a virtual mall, shoppable YoteFeed videos, merchant tools, and last-mile delivery into
              one ecosystem — so local stores can reach the whole country and shoppers can buy with confidence.
            </p>
          </div>
          <div className="prose">
            <h3>What YoteMarket is</h3>
            <p>
              YoteMarket is Kenya's virtual mall — an online marketplace that brings hundreds of local shops
              into one place. Every business gets its own branded storefront, and shoppers browse them like
              walking through a physical mall: compare stores, chat and negotiate directly with sellers in the
              in-app messenger, and check out in a few taps. It's built for Kenya first — payments in M-Pesa,
              prices in shillings, and collection at neighbourhood pickup hubs.
            </p>
            <h3>YoteFeed — shop short videos</h3>
            <p>
              YoteFeed is our shoppable short-form video feed. Stores post quick vertical clips of what they
              sell, and shoppers watch, tap a tagged product, and buy it on the spot — discovery and checkout
              in the same swipe. It turns browsing into entertainment and gives small shops a way to show
              their products in motion, not just as photos.
            </p>
            <h3>How shopping works</h3>
            <p>
              Find something you like, message the store to ask questions or agree a price, then pay with
              M-Pesa — held in escrow until you collect, so your money is protected. Choose the pickup hub
              nearest you or have a rider deliver. Every order is tracked end to end, with a digital receipt.
            </p>
            <h3>Tools for sellers</h3>
            <p>
              Sellers run the whole business from one dashboard: list products with photos and stock, take
              in-store sales on the built-in Point-of-Sale terminal, issue KRA-compliant tax invoices, and get
              paid into an M-Pesa wallet. YoteAI writes product listings and turns real sales into demand
              insights — all on a flat monthly subscription, with no commission on sales.
            </p>
            <h3>Delivery, riders &amp; scouts</h3>
            <p>
              A network of zero-hour riders delivers batched orders from local hubs, which keeps costs low and
              earnings fair. Scouts — our marketer program — sign up new shops and earn for every verified
              merchant they bring on. It all adds up to one ecosystem where stores sell, riders deliver, scouts
              grow the network, and shoppers buy with confidence.
            </p>
            <h3>Who's behind YoteMarket</h3>
            <p>
              YoteMarket was founded by <strong>Moses Kiambi</strong> and <strong>Arnold Kamau</strong>, who lead
              the company as Chief Executive Officer and Chief Operating Officer.
            </p>
            <p id="moses-kiambi">
              <strong>Moses Kiambi — Chief Executive Officer (CEO).</strong> Moses leads YoteMarket's
              go-to-market. Marketing strategy, brand and user acquisition sit with him: how the mall reaches
              shoppers across Kenya, how merchants first hear about us, and how that attention converts into
              active stores and repeat buyers.
            </p>
            <p>
              His background is in e-commerce, digital media and marketing. He has run digital marketing and
              media independently, and supports <em>Jacity Travellers &amp; Tours</em> in Nairobi with content
              and social campaigns in the travel sector. He is certified by Google in Digital Marketing
              Fundamentals and has studied information technology.{' '}
              <a href="https://www.linkedin.com/in/moses-kiambi-84043625b" target="_blank" rel="noopener noreferrer me"
                style={{ color: 'var(--purple)', fontWeight: 600 }}>Moses on LinkedIn</a>.
            </p>
            <p id="arnold-kamau">
              <strong>Arnold Kamau — Chief Operating Officer (COO).</strong> Arnold carries the rest of the
              business. Product and technology, operations and logistics, merchant systems, finance and
              compliance all report to him — the platform itself, the pickup-hub and rider delivery network,
              merchant onboarding and the scout program, and the processes that let hundreds of stores fulfil
              orders reliably across the country.
            </p>
            <p>
              He is a startup operator with a foot in both technology and policy. He is co-founder and COO of
              <em> LeaseUs</em>, a blockchain-powered service-delivery platform, a director at
              <em> Portico Agency</em> in London, and founder of the <em>Kaiserberg Independent Policy Design
              Initiative</em>. He also founded <em>Tuelewane</em>, a thought-leadership blog and podcast on
              geopolitics, technology and social change, and serves as Secretary General of The Patriciah
              Foundation, which backs education, empowerment and social-justice work. He holds a bachelor's
              degree in International Relations from Daystar University, with further study at Leiden
              University in the political economy of institutions and development and in international
              humanitarian law, and a specialisation in negotiation, mediation and conflict resolution from
              ESSEC Business School.{' '}
              <a href="https://www.linkedin.com/in/arnold-w-554439198" target="_blank" rel="noopener noreferrer me"
                style={{ color: 'var(--purple)', fontWeight: 600 }}>Arnold on LinkedIn</a>.
            </p>
            <h3>Join us</h3>
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

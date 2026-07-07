import { Link } from 'react-router-dom';

/* Terms of Service — consolidated from the YoteMarket Comprehensive Platform
   Handbook (v1.0). Protects all parties and, in particular, limits YoteMarket's
   liability as a technology intermediary. Plain marketing-site page (uses the
   shared .prose / .page-head styles), reachable from the footers and /terms. */
function Terms() {
  return (
    <main>
      <section className="pad">
        <div className="wrap">
          <div className="page-head">
            <span className="eyebrow"><i className="fas fa-file-contract"></i> Legal</span>
            <h1>Terms of Service</h1>
            <p>
              Effective 1 February 2026 · Last updated 25 January 2026. These Terms govern your access to and use
              of the YoteMarket platform as a customer, merchant, or rider/operator.
            </p>
          </div>

          <div className="prose legal">
            <div className="note">
              <strong>Please read carefully.</strong> By accessing or using the YoteMarket platform you agree to
              these Terms in full, including the <a href="#liability">limitation of liability</a> and
              <a href="#indemnity"> indemnity</a> provisions below. If you do not agree, you must stop using the
              platform. Continued use constitutes acceptance of these Terms and any updates to them.
            </div>

            <h3>1. About YoteMarket &amp; these Terms</h3>
            <p>
              YoteMarket Limited (&ldquo;YoteMarket&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;)
              operates a digital virtual mall and logistics-coordination platform serving customers, merchants, and
              independent delivery agents across Kenya, accessible via our website, mobile applications, and related
              tools (together, the &ldquo;Platform&rdquo;). These Terms of Service, together with our Privacy Policy
              and the policies referenced in our Comprehensive Platform Handbook, form a binding agreement between
              you and YoteMarket.
            </p>

            <h3>2. Nature of the Platform — a virtual mall &amp; service provider</h3>
            <p>
              YoteMarket operates a <strong>virtual mall</strong>. Much like a physical shopping-mall landlord, we
              provide and maintain the space and shared infrastructure and we <strong>license (rent) digital
              storefront space</strong> to merchants, who operate their own independent, branded stores within the
              mall. In addition to the space, we offer optional value-added services — including delivery and
              logistics coordination, business insights and analytics, point-of-sale (POS) tools, in-app messaging,
              payment facilitation, and marketing and promotion.
            </p>
            <p>YoteMarket therefore operates <strong>exclusively</strong> as:</p>
            <ul>
              <li>a virtual-mall operator that licenses digital storefront space to independent merchants; and</li>
              <li>a technology intermediary and service provider that facilitates discovery, communication, payments, and logistics coordination between merchants and customers.</li>
            </ul>
            <p>YoteMarket expressly does <strong>NOT</strong>, and shall not be deemed to:</p>
            <ul>
              <li>own, sell, resell, or take title to any merchant product;</li>
              <li>act as agent, employer, franchisor, partner, or joint venturer of any merchant, customer, or rider;</li>
              <li>guarantee sales, traffic, revenue, product availability, or delivery outcomes; or</li>
              <li>assume responsibility for the quality, safety, legality, descriptions, or fitness for purpose of any merchant product.</li>
            </ul>
            <p>
              Just as a shopping-mall landlord is not the seller of, and is not responsible for, the goods sold by
              the independent stores that rent space within it, YoteMarket is <strong>not the seller of, and is not
              responsible for, the products offered by the merchants that rent digital space in the mall</strong>.
            </p>
            <p>
              All commercial transactions occur <strong>directly between merchants and customers</strong>. Riders,
              drivers, and logistics operators are <strong>independent contractors</strong>, and nothing in these
              Terms creates an employment, agency, partnership, franchise, or joint-venture relationship.
            </p>

            <p><strong>Our relationship with each party — to avoid any doubt:</strong></p>
            <ul className="liability">
              <li><strong>With customers</strong> — we provide the marketplace, in-app payment handling, and (where the merchant subscribes to delivery) logistics coordination. We are <strong>not the seller</strong> of any product and do not guarantee any merchant, product, price, or delivery outcome. Your purchase contract is with the merchant.</li>
              <li><strong>With merchants</strong> — we license (rent) you digital storefront space within the virtual mall and provide optional services (delivery, business insights, POS, and more) in exchange for a subscription. You are our <strong>tenant/licensee, not our partner, agent, employer, distributor, or reseller</strong>; you sell in your own name and on your own account, and you own the customer relationship and the goods until delivered.</li>
              <li><strong>With riders &amp; operators</strong> — we provide access to delivery opportunities and coordination tools. You are an <strong>independent contractor</strong>, not our employee or agent; you control your own means, hours, and vehicle, and bear your own costs and risks.</li>
              <li><strong>With pickup hubs</strong> — participating merchant hubs hold parcels for collection under the hub rules. A hub&rsquo;s responsibility for a parcel <strong>ends</strong> when the customer&rsquo;s one-hour collection grace period lapses.</li>
            </ul>

            <p><strong>Where our responsibility starts and ends.</strong></p>
            <div className="scope">
              <div className="scope-in scope-yes">
                <div className="scope-h"><i className="fas fa-circle-check"></i> Our responsibility BEGINS — we are responsible for</div>
                <ul>
                  <li>providing and maintaining the Platform technology and in-app tools;</li>
                  <li>coordinating logistics where the merchant has subscribed to delivery;</li>
                  <li>routing in-app payments to the correct party and holding funds in M-Pesa escrow as described; and</li>
                  <li>limited goods-in-transit cover while a parcel is within our delivery system and the applicable grace period — strictly subject to rule compliance.</li>
                </ul>
              </div>
              <div className="scope-in scope-no">
                <div className="scope-h"><i className="fas fa-circle-xmark"></i> Our responsibility ENDS — we are NOT responsible for</div>
                <ul>
                  <li>the quality, safety, legality, descriptions, or fitness of any merchant product;</li>
                  <li>merchant packaging, labeling, or order-fulfilment failures;</li>
                  <li>the acts or omissions of independent merchants, riders, or operators;</li>
                  <li>incorrect delivery details, missed collections, or any off-platform dealings;</li>
                  <li>each party&rsquo;s own taxes, licenses, and regulatory obligations; and</li>
                  <li>events beyond our reasonable control (force majeure).</li>
                </ul>
              </div>
            </div>
            <p>
              In every case, our role is limited to providing the technology and, where subscribed, coordinating
              logistics. Our maximum financial responsibility for any claim is capped as set out in section 12.
            </p>

            <h3>3. Eligibility &amp; accounts</h3>
            <ul>
              <li>You must be at least 18 years of age and legally able to enter binding contracts.</li>
              <li>You must provide accurate, complete, and current registration information and keep it up to date.</li>
              <li>You are responsible for safeguarding your credentials and for all activity under your account.</li>
              <li>You must notify us immediately of any unauthorized account use.</li>
            </ul>
            <p>
              We may refuse, suspend, or terminate any account that provides false information, violates these
              Terms, or poses a legal, financial, or reputational risk to the Platform or its users.
            </p>

            <h3>4. Roles &amp; responsibilities</h3>
            <p><strong>Customers</strong> must provide accurate delivery details, pay in-app before dispatch, be available to receive goods, and treat merchants and riders with respect. Incorrect details or missed deliveries are the customer&rsquo;s responsibility and may be recharged.</p>
            <p><strong>Merchants</strong> are solely responsible for their listings, pricing, product quality, packaging, labeling, lawfulness, order fulfilment, and their own tax and regulatory obligations. Merchants must honor advertised prices and descriptions.</p>
            <p><strong>Prohibited products.</strong> Merchants must not list, sell, advertise, or dispatch:</p>
            <ul>
              <li>fraudulent, misrepresented, misleadingly described, substandard, unsafe, or expired goods;</li>
              <li>counterfeit, replica, or trademark-infringing goods;</li>
              <li>stolen goods or goods of uncertain or unlawful provenance; or</li>
              <li>any item that is illegal, hazardous, or restricted under Kenyan law without the required regulatory authorization.</li>
            </ul>
            <p className="cap">
              <i className="fas fa-gavel"></i>
              Listing or supplying such goods is a serious violation. It will result in immediate suspension or
              permanent ban, removal of the listings, and forfeiture of any pending payouts; and, for counterfeit,
              fraudulent, unsafe, or illegal goods, referral to law enforcement and the relevant regulatory
              authorities. The merchant remains personally and legally liable to affected customers and third
              parties, may be liable for criminal and civil penalties under Kenyan law, and shall indemnify
              YoteMarket in full against any resulting claims, losses, fines, or penalties (see section 13).
            </p>
            <p>
              <strong>Regulated &amp; licensed goods.</strong> Some goods may only be listed and sold by merchants who
              hold the specific licenses, permits, or authorizations required by Kenyan law and the relevant
              regulators. These include, without limitation, <strong>prescription and over-the-counter medicines,
              pharmaceuticals, and medical devices</strong> (regulated by the Pharmacy and Poisons Board), herbal and
              health supplements, <strong>alcoholic drinks</strong> (liquor licensing), agrochemicals and pest-control
              products, cosmetics and food products subject to KEBS and public-health standards, and any other
              controlled, hazardous, or age-restricted item. For any such goods, the merchant must, <strong>before
              listing</strong>:
            </p>
            <ul>
              <li>hold and keep valid all required licenses, permits, and registrations, and comply with every condition attached to them (including prescription-only dispensing and age-verification rules);</li>
              <li>provide proof of those licenses and authorizations to YoteMarket on request; and</li>
              <li>ensure the product and its handling, storage, and delivery meet all applicable legal and safety requirements.</li>
            </ul>
            <p>
              Holding the necessary licenses for regulated goods is <strong>mandatory</strong>. YoteMarket may require
              verification and may restrict, remove, or refuse any listing — and suspend any merchant — that cannot
              demonstrate valid authorization. The merchant remains solely responsible for regulatory compliance;
              supplying regulated goods without the required licenses carries the same consequences as prohibited
              goods above and may attract regulatory, civil, and criminal liability.
            </p>
            <p><strong>Riders &amp; operators</strong> are independent contractors responsible for their own vehicles, fuel, maintenance, insurance, licensing, safety gear, and statutory compliance. They must follow in-app routing, load and safety limits, and applicable law, and must report accidents immediately.</p>

            <h3>5. Payments, subscriptions &amp; fees</h3>
            <ul>
              <li>The <strong>merchant subscription is the consideration for the license to use digital storefront space</strong> in the virtual mall, together with any bundled or optional services (such as delivery slots, business insights, or POS).</li>
              <li>Payments must be completed in-app (M-Pesa, card, or wallet) before order dispatch, except where a limited cash-on-delivery option is expressly offered.</li>
              <li>Merchant subscription and rider badge fees are payable in advance and are <strong>non-refundable</strong> once activated, except where refunds are required by law.</li>
              <li>Additional logistics or special-handling charges, if any, are disclosed before confirmation.</li>
              <li>YoteMarket does not take a commission on merchant sales unless expressly agreed in writing.</li>
              <li>Failure to pay applicable fees may result in immediate suspension of services without notice.</li>
            </ul>

            <h3>6. Delivery &amp; logistics</h3>
            <ul>
              <li>Delivery timelines are <strong>estimates, not guarantees</strong>.</li>
              <li>Logistics are performed by independent riders and operators; YoteMarket is not liable for their acts or omissions.</li>
              <li>YoteMarket is not liable for delays or failures caused by traffic, weather, civil unrest, force majeure, incorrect delivery details, or merchant packaging failures.</li>
              <li>Goods-in-transit cover, where it applies, is limited and is <strong>void</strong> where loss or damage arises from negligence, overloading, unauthorized route deviation, inadequate packaging, or any breach of platform rules.</li>
              <li>Risk in and liability for goods transfer in accordance with the applicable merchant and operator arrangements.</li>
            </ul>

            <h3>7. Cancellations, refunds &amp; complaints</h3>
            <ul>
              <li>Orders may be cancelled within 10 minutes of placement without penalty; cancellations after dispatch may attract a delivery-fee deduction.</li>
              <li>Refunds follow the relevant merchant&rsquo;s return and refund policy. YoteMarket <strong>facilitates but does not guarantee</strong> refunds.</li>
              <li>Complaints must be logged in-app within 24 hours of delivery; complaints outside this window are not eligible for mediation or refund.</li>
              <li>False, exaggerated, or malicious complaints are a violation and may result in suspension and loss of refund privileges.</li>
            </ul>

            <h3>8. Acceptable use &amp; in-app exclusivity</h3>
            <p>All communication, transactions, payments, complaints, and disputes must occur exclusively within the Platform. You must not:</p>
            <ul>
              <li>solicit, encourage, or accept transactions, payments, or incentives that bypass the Platform;</li>
              <li>use Platform-sourced contacts for independent commercial purposes;</li>
              <li>manipulate traffic, rankings, reviews, or analytics, or submit fake or incentivized reviews;</li>
              <li>engage in fraud, harassment, threats, or abusive behavior;</li>
              <li>scrape, reverse-engineer, or copy Platform data, software, or design;</li>
              <li>upload or post content — including video, images, audio, or <strong>music</strong> — that you do not own or hold the rights or licenses to use, or that infringes any third party&rsquo;s copyright, trademark, or other rights; or</li>
              <li>upload illegal, defamatory, obscene, or harmful content.</li>
            </ul>
            <p>
              You are solely responsible for the content you upload, including any music or audio used in YoteFeed
              clips. Infringing content may be muted, removed, or taken down without notice, and repeat infringement
              may result in suspension. You retain ownership of your content and grant YoteMarket the license set out
              in section 9.
            </p>
            <p>We may remove content or restrict access at our sole discretion, without prior notice and without liability.</p>

            <h3>9. Intellectual property</h3>
            <p>
              YoteMarket retains all rights to the Platform, its branding, software, design, and technology.
              Merchants retain ownership of their own logos, trademarks, and content. By uploading content you grant
              YoteMarket a non-exclusive, royalty-free, worldwide license to host, display, reproduce, and
              distribute that content for the purpose of operating the Platform. Unauthorized use of YoteMarket&rsquo;s
              intellectual property is prohibited.
            </p>

            <h3>10. Data protection &amp; privacy</h3>
            <p>
              We process personal data in accordance with the Kenya Data Protection Act, 2019, and our{' '}
              <Link to="/privacy">Privacy Policy</Link>. By using the Platform you consent to the collection, storage, and processing of data necessary
              to operate the Platform and provide the services. You must not share, publish, or misuse the personal
              data of other users, merchants, or riders.
            </p>

            <h3>11. Disclaimers — &ldquo;as is&rdquo;</h3>
            <p>
              The Platform and all services are provided on an <strong>&ldquo;as is&rdquo;</strong> and
              <strong> &ldquo;as available&rdquo;</strong> basis. To the maximum extent permitted by law, YoteMarket
              makes no warranties of any kind, whether express, implied, or statutory, including any implied
              warranties of merchantability, fitness for a particular purpose, or non-infringement, and does not
              warrant that the Platform will be uninterrupted, timely, secure, accurate, or error-free.
            </p>

            <h3 id="liability">12. Limitation of liability</h3>
            <p>To the maximum extent permitted by applicable law:</p>
            <ul>
              <li>YoteMarket shall <strong>not</strong> be liable for any indirect, incidental, special, consequential, punitive, or exemplary damages, including lost profits, loss of data, loss of goodwill, or business interruption; and</li>
              <li>YoteMarket&rsquo;s total cumulative liability to any user, for any and all claims, shall <strong>not exceed the total fees paid by that user to YoteMarket in the three (3) months</strong> immediately preceding the event giving rise to the claim.</li>
            </ul>
            <p className="cap">
              <i className="fas fa-triangle-exclamation"></i>
              By continuing to use the Platform, you expressly waive any claim against YoteMarket beyond these limits.
            </p>
            <p>YoteMarket&rsquo;s liability position, in summary:</p>
            <ul className="liability">
              <li><strong>Merchant product quality</strong> — not liable; the merchant&rsquo;s sole responsibility.</li>
              <li><strong>Goods in transit</strong> — limited liability under goods-in-transit cover only, subject to rule compliance.</li>
              <li><strong>Rider/operator acts or omissions</strong> — not liable; riders are independent contractors.</li>
              <li><strong>Force majeure delays</strong> — not liable.</li>
              <li><strong>Incorrect delivery details or missed collections by users</strong> — not liable; may be recharged to the user.</li>
              <li><strong>Merchant packaging failures</strong> — not liable.</li>
              <li><strong>Off-platform transactions</strong> — not liable in any manner.</li>
              <li><strong>Tax obligations of merchants/riders</strong> — not liable; each party&rsquo;s independent responsibility.</li>
            </ul>

            <h3 id="indemnity">13. Indemnification</h3>
            <p>
              You agree to indemnify, defend, and hold harmless YoteMarket Limited and its directors, officers,
              employees, agents, and affiliates from and against any claims, liabilities, losses, damages, fines,
              penalties, and expenses (including reasonable legal fees) arising from: your breach of these Terms or
              any policy; your violation of any law or regulation; your infringement of any third-party rights; your
              misuse of the Platform, fraud, or willful misconduct; or any dispute between you and another user,
              merchant, or rider.
            </p>

            <h3>14. Suspension &amp; termination</h3>
            <p>
              We may suspend or terminate your access — immediately and without notice where appropriate — if you
              violate these Terms, engage in fraudulent, harmful, or illegal conduct, pose a legal, financial, or
              reputational risk, or become subject to insolvency proceedings. A three-strike system applies to minor
              violations; serious or repeated violations may result in a permanent ban and legal action. Termination
              does not waive any outstanding obligations, fees payable, or accrued liabilities. Suspended users may
              appeal in-app within 72 hours of the notice; our decision on appeals is final.
            </p>

            <h3>15. Force majeure</h3>
            <p>
              YoteMarket is not liable for any failure or delay caused by circumstances beyond its reasonable
              control, including acts of God, natural disasters, fire, flood, war, civil unrest, government action,
              internet or telecommunications outages, or pandemics. We will make reasonable efforts to resume
              operations as soon as practicable.
            </p>

            <h3>16. Governing law &amp; dispute resolution</h3>
            <p>
              These Terms are governed by the laws of the Republic of Kenya. Disputes shall be resolved first
              through good-faith negotiation (minimum 30 days), then mediation by a mutually agreed mediator, and
              finally by the competent courts of Kenya if mediation fails.
            </p>

            <h3>17. Changes to these Terms</h3>
            <p>
              We may update these Terms at any time. We will notify users of material changes by in-app notice or
              email. Continued use of the Platform after notice constitutes acceptance of the revised Terms.
            </p>

            <h3>18. Contact</h3>
            <p>
              Questions, legal notices, or disputes: <a href="mailto:general@yotemarket.com">general@yotemarket.com</a>{' '}
              · <a href="tel:+254720730861">0720 730 861</a> · or via the in-app support centre (preferred for
              operational matters). See also our <Link to="/contact">contact page</Link>.
            </p>

            <p style={{ color: 'var(--t3)', fontSize: '14px', marginTop: '28px' }}>
              YoteMarket Limited · general@yotemarket.com · 0720 730 861 · Effective 1 February 2026.
            </p>
          </div>

          <div className="sec-cta">
            <Link className="btn btn-primary btn-lg" to="/storefront">Continue to the mall <i className="fas fa-arrow-right"></i></Link>
            <Link className="btn btn-outline btn-lg" to="/contact">Contact us</Link>
          </div>
        </div>
      </section>

      <style>{`
        .legal{max-width:820px;}
        .legal h3{scroll-margin-top:90px;}
        .legal ul{margin:0 0 18px; padding-left:22px;}
        .legal li{font-size:16px; color:var(--t2); line-height:1.7; margin:0 0 8px;}
        .legal a{color:var(--purple); font-weight:600;}
        .legal .note{background:var(--surface2); border:1px solid var(--line); border-left:3px solid var(--purple);
          border-radius:12px; padding:16px 18px; margin:0 0 26px; font-size:15px; color:var(--t2); line-height:1.7;}
        .legal .cap{display:flex; gap:10px; align-items:flex-start; background:color-mix(in srgb, #ef4444 10%, transparent);
          border:1px solid color-mix(in srgb, #ef4444 35%, transparent); border-radius:12px; padding:14px 16px;
          color:var(--t1); font-weight:600;}
        .legal .cap i{color:#dc2626; margin-top:3px;}
        .legal ul.liability li{margin-bottom:10px;}
        .legal .scope{display:grid; grid-template-columns:1fr 1fr; gap:14px; margin:6px 0 20px;}
        @media (max-width:640px){ .legal .scope{grid-template-columns:1fr;} }
        .legal .scope-in{border-radius:14px; padding:16px 18px; border:1px solid var(--line);}
        .legal .scope-yes{background:color-mix(in srgb,#10b981 8%,transparent); border-color:color-mix(in srgb,#10b981 32%,transparent);}
        .legal .scope-no{background:color-mix(in srgb,#ef4444 8%,transparent); border-color:color-mix(in srgb,#ef4444 32%,transparent);}
        .legal .scope-h{font-weight:700; color:var(--t1); font-size:14px; display:flex; gap:8px; align-items:center; margin-bottom:10px; line-height:1.4;}
        .legal .scope-yes .scope-h i{color:#059669;}
        .legal .scope-no .scope-h i{color:#dc2626;}
        .legal .scope-in ul{margin:0; padding-left:20px;}
        .legal .scope-in li{font-size:14px; line-height:1.6; margin-bottom:6px;}
      `}</style>
    </main>
  );
}

export default Terms;

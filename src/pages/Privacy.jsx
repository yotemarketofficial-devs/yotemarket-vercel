import { Link } from 'react-router-dom';

/* Privacy Policy — how YoteMarket collects, uses, shares, and protects personal
   data, aligned with the Kenya Data Protection Act, 2019 and the Comprehensive
   Platform Handbook (§9). Companion to the Terms of Service (/terms). */
function Privacy() {
  return (
    <main>
      <section className="pad">
        <div className="wrap">
          <div className="page-head">
            <span className="eyebrow"><i className="fas fa-user-shield"></i> Legal</span>
            <h1>Privacy Policy</h1>
            <p>
              Effective 1 February 2026 · Last updated 25 January 2026. How YoteMarket collects, uses, shares, and
              protects your personal data.
            </p>
          </div>

          <div className="prose legal">
            <div className="note">
              <strong>Your privacy matters.</strong> This policy explains what personal data we process and your
              rights under the <strong>Kenya Data Protection Act, 2019</strong>. It applies to customers, merchants,
              and riders/operators using the YoteMarket platform, and works together with our{' '}
              <Link to="/terms">Terms of Service</Link>.
            </div>

            <h3>1. Who we are</h3>
            <p>
              YoteMarket Limited (&ldquo;YoteMarket&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is the data
              controller for personal data processed through our website, mobile applications, and related tools (the
              &ldquo;Platform&rdquo;). You can reach us at{' '}
              <a href="mailto:general@yotemarket.com">general@yotemarket.com</a> or{' '}
              <a href="tel:+254720730861">0720 730 861</a>.
            </p>

            <h3>2. Data we collect</h3>
            <ul>
              <li><strong>Account &amp; identity</strong> — name, phone number, email, password, and, where required, National ID or KRA PIN and business/merchant details.</li>
              <li><strong>Verification (KYC)</strong> — for merchants and riders: business licenses, driving licence, logbook, police clearance, vehicle and insurance details, and regulatory licenses for regulated goods.</li>
              <li><strong>Transactions &amp; payments</strong> — orders, subscriptions, wallet activity, and M-Pesa/card payment references (we do not store full card numbers).</li>
              <li><strong>Delivery &amp; location</strong> — delivery addresses, pickup-hub selections, and rider/parcel location during active trips.</li>
              <li><strong>Communications &amp; content</strong> — in-app messages, reviews, support requests, and content you upload (including YoteFeed clips).</li>
              <li><strong>Device &amp; usage</strong> — device identifiers, app/version data, IP address, and how you interact with the Platform.</li>
            </ul>

            <h3>3. How we use your data</h3>
            <ul>
              <li>operate, maintain, and improve the Platform and its services;</li>
              <li>create and manage your account and verify your identity;</li>
              <li>process payments, subscriptions, payouts, and refunds;</li>
              <li>coordinate discovery, communication, and logistics between customers, merchants, and riders;</li>
              <li>prevent, detect, and investigate fraud, abuse, and policy violations;</li>
              <li>provide support and respond to complaints and disputes;</li>
              <li>send service, transaction, and (where permitted) promotional messages; and</li>
              <li>comply with legal, regulatory, tax, and audit obligations.</li>
            </ul>

            <h3>4. Legal basis for processing</h3>
            <p>
              We process personal data on one or more of the following bases under the Data Protection Act, 2019:
              your <strong>consent</strong>; performance of a <strong>contract</strong> with you; compliance with a
              <strong> legal obligation</strong>; and our <strong>legitimate interests</strong> in operating,
              securing, and improving the Platform, balanced against your rights.
            </p>

            <h3>5. When we share data</h3>
            <p>To operate the Platform, we share the minimum data necessary with:</p>
            <ul>
              <li><strong>Merchants and riders</strong> — the details needed to fulfil and deliver an order (e.g. a customer&rsquo;s name, delivery area, and contact for an active delivery);</li>
              <li><strong>Payment and communications providers</strong> — such as Safaricom M-Pesa and SMS/notification services, to process payments and alerts;</li>
              <li><strong>Service providers</strong> — hosting, cloud, mapping, and analytics partners bound by data-processing agreements; and</li>
              <li><strong>Authorities</strong> — where required by law, court order, or to prevent fraud, harm, or crime.</li>
            </ul>
            <p><strong>We do not sell your personal data.</strong> Users must not misuse, publish, or share the personal data of other users, merchants, or riders encountered through the Platform.</p>

            <h3>6. Data retention</h3>
            <p>
              We keep personal data only for as long as necessary for the purposes above or as required by law
              (for example, transaction and tax records). When no longer needed, data is deleted or anonymized.
            </p>

            <h3>7. Security</h3>
            <p>
              We apply appropriate technical and organizational measures to protect personal data against
              unauthorized access, loss, or misuse. No system is completely secure, so you must also protect your
              own login credentials and never share them. Notify us immediately of any suspected unauthorized access.
            </p>

            <h3>8. Your rights</h3>
            <p>Under the Data Protection Act, 2019, you have the right to:</p>
            <ul>
              <li>be informed about how your data is used;</li>
              <li>access the personal data we hold about you;</li>
              <li>request correction of inaccurate or incomplete data;</li>
              <li>request deletion of your data where the law allows;</li>
              <li>object to or restrict certain processing;</li>
              <li>request portability of data you provided; and</li>
              <li>withdraw consent at any time (without affecting prior processing).</li>
            </ul>
            <p>
              To exercise any of these rights, contact <a href="mailto:general@yotemarket.com">general@yotemarket.com</a>.
              We will respond within the timelines set by law. You also have the right to lodge a complaint with the
              Office of the Data Protection Commissioner (Kenya).
            </p>

            <h3>9. Cookies &amp; similar technologies</h3>
            <p>
              We use cookies and similar technologies to keep you signed in, remember preferences, secure the
              Platform, and measure usage. You can control cookies through your browser or device settings; disabling
              some may affect how the Platform works.
            </p>

            <h3>10. Children</h3>
            <p>
              The Platform is intended for users aged <strong>18 and over</strong>. We do not knowingly collect data
              from anyone under 18. If you believe a minor has provided us data, contact us and we will delete it.
            </p>

            <h3>11. International transfers</h3>
            <p>
              Some service providers may process data outside Kenya. Where this happens, we take steps to ensure the
              data remains protected in line with the Data Protection Act, 2019 and appropriate safeguards.
            </p>

            <h3>12. Changes to this policy</h3>
            <p>
              We may update this policy from time to time. We will notify you of material changes by in-app notice or
              email. Continued use of the Platform after notice constitutes acceptance of the updated policy.
            </p>

            <h3>13. Contact</h3>
            <p>
              Questions or requests about your data: <a href="mailto:general@yotemarket.com">general@yotemarket.com</a>{' '}
              · <a href="tel:+254720730861">0720 730 861</a> · or via the in-app support centre. See also our{' '}
              <Link to="/contact">contact page</Link> and <Link to="/terms">Terms of Service</Link>.
            </p>

            <p style={{ color: 'var(--t3)', fontSize: '14px', marginTop: '28px' }}>
              YoteMarket Limited · general@yotemarket.com · 0720 730 861 · Effective 1 February 2026.
            </p>
          </div>

          <div className="sec-cta">
            <Link className="btn btn-primary btn-lg" to="/storefront">Continue to the mall <i className="fas fa-arrow-right"></i></Link>
            <Link className="btn btn-outline btn-lg" to="/terms">Read the Terms</Link>
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
      `}</style>
    </main>
  );
}

export default Privacy;

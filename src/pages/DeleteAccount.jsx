import { Link } from 'react-router-dom';

/* Account & data deletion — the public URL Google Play requires for both YoteMarket
   apps (com.yotemarket.app, com.yotemarket.rider).

   Play's requirement is specific: the page must be reachable WITHOUT installing the app,
   must cover deleting the ACCOUNT and deleting DATA on its own, and must say what is
   retained and for how long. It is also the route for someone who has lost access to
   their login and so cannot use the in-app path.

   Everything below mirrors what deleteMyAccount actually does in
   firebase/functions/index.js — the refusals are real preconditions, not policy prose. */
function DeleteAccount() {
  return (
    <main>
      <section className="pad">
        <div className="wrap">
          <div className="page-head">
            <span className="eyebrow"><i className="fas fa-user-slash"></i> Legal</span>
            <h1>Delete your account or data</h1>
            <p>
              How to permanently close your YoteMarket account, or ask us to erase your personal data without
              closing it. Applies to the YoteMarket shopper app, the YoteMarket Rider app, and yotemarket.co.ke.
            </p>
          </div>

          <div className="prose legal">
            <div className="note">
              <strong>Deletion is permanent.</strong> Once an account is closed it cannot be restored, and you would
              need to sign up again from scratch. Riders would also need to re-apply and be re-approved before taking
              deliveries.
            </div>

            <h3>1. Delete your account from the app</h3>
            <p>The fastest route is in the app itself, and it takes effect immediately.</p>
            <ul>
              <li>
                <strong>YoteMarket (shopper &amp; merchant)</strong> — open <strong>Profile</strong>, then
                <strong> Delete my account</strong>, and confirm.
              </li>
              <li>
                <strong>YoteMarket Rider</strong> — open <strong>Profile</strong>, then
                <strong> Delete my account</strong>, type <code>DELETE</code> to confirm.
              </li>
            </ul>

            <h3>2. When we cannot delete straight away</h3>
            <p>
              Deletion is refused while it would strand money or goods belonging to someone else. In each case the app
              tells you the one thing to resolve first, and deletion works as soon as it is done:
            </p>
            <ul>
              <li><strong>Money in your wallet</strong> — spend or withdraw the remaining balance.</li>
              <li><strong>An order still in progress</strong> — wait until it is delivered or cancelled.</li>
              <li>
                <strong>Merchants: earnings held or an open order</strong> — withdraw your available balance and let
                escrowed orders settle. Closing your account also permanently removes your store, catalogue and posts.
              </li>
              <li>
                <strong>Riders: earnings owed or a run in progress</strong> — withdraw what you are owed, and hand any
                parcels over at the hub. Parcels in your possession belong to a customer, so the account stays open
                until the handover is recorded.
              </li>
              <li>
                <strong>Store team members</strong> — your login was created by a store owner, so ask them to remove
                you from the team first.
              </li>
            </ul>

            <h3>3. If you cannot sign in</h3>
            <p>
              Email <a href="mailto:general@yotemarket.com?subject=Account%20deletion%20request">general@yotemarket.com</a>{' '}
              from the address registered on the account, with the subject{' '}
              <strong>Account deletion request</strong>. Include the phone number on the account so we can identify
              it. We verify ownership before acting, then complete the deletion within <strong>30 days</strong>.
            </p>

            <h3>4. Deleting your data without closing your account</h3>
            <p>
              You can ask us to erase personal data while keeping your account. Email{' '}
              <a href="mailto:general@yotemarket.com?subject=Data%20deletion%20request">general@yotemarket.com</a>{' '}
              with the subject <strong>Data deletion request</strong>, telling us what you want removed — for
              example saved delivery addresses, your profile photo, chat history, or product reviews you have posted.
              Under the <strong>Kenya Data Protection Act, 2019</strong> you may also request a copy of your data, or
              ask us to correct it. We respond within 30 days.
            </p>

            <h3>5. What is deleted</h3>
            <ul>
              <li>Your sign-in identity, so the account can no longer be used.</li>
              <li>Your profile: name, email, phone, photo, saved addresses and delivery preferences.</li>
              <li>Loyalty points, saved payment preferences, followed stores and notification settings.</li>
              <li>Chat messages, product reviews and posts you created.</li>
              <li>Merchants: the store itself — catalogue, media, posts, team and point-of-sale devices.</li>
            </ul>

            <h3>6. What we keep, and why</h3>
            <p>
              Some records cannot be erased on request because Kenyan law requires us to retain them, or because they
              are another party&rsquo;s record as much as yours:
            </p>
            <ul>
              <li>
                <strong>Orders, receipts and tax invoices</strong> — retained for <strong>seven years</strong> under
                the Tax Procedures Act and KRA record-keeping rules.
              </li>
              <li>
                <strong>Payment and settlement records</strong> — M-Pesa transactions, merchant payouts and rider
                earnings history, retained as financial records.
              </li>
              <li>
                <strong>Rider delivery history</strong> — a closed rider record is kept as a tombstone so completed
                runs and the earnings ledger remain auditable; it can no longer sign in or take work.
              </li>
              <li>
                <strong>Records tied to fraud, disputes or legal claims</strong> — kept while the matter is open.
              </li>
            </ul>
            <p>
              Retained records are kept only for these purposes, are not used for marketing, and are deleted once the
              retention period ends. Where possible they are held in a de-identified form.
            </p>

            <h3>7. Questions</h3>
            <p>
              Contact <a href="mailto:general@yotemarket.com">general@yotemarket.com</a> or{' '}
              <a href="tel:+254720730861">0720 730 861</a>. See our <Link to="/privacy">Privacy Policy</Link> for the
              full account of what we collect and your rights, and our <Link to="/terms">Terms of Service</Link>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default DeleteAccount;

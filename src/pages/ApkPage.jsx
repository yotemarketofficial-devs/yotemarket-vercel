import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { APPS, PUBLISHER, isPublished } from '../lib/apk-releases.mjs';
import { fetchReleases, mergeReleases } from '../lib/app-releases.js';
import PageHero from '../components/PageHero.jsx';
import { Icon, GooglePlayIcon } from '../components/LineIcon.jsx';
import apkPhones from '../assets/pages/apk-phones.webp';
import '../styles/pages.css';

/* /apk — the public download page for our signed Android APKs, laid out to the
 * 2026-10-09 page board (deep purple band, two app cards, three info cards).
 *
 * The audience is two-sided: a shopper on a phone with no Play Store, and an app
 * mirror (Uptodown, APKPure, Aptoide) whose listing process needs a permanent URL
 * for the developer's own build plus the metadata to verify it. Both get the same
 * facts — package name, version, version code, size, SHA-256 — and the mirror policy
 * and publisher details below stay on the page for them.
 *
 * Where those facts come from: whatever the staff console last published (a plain
 * JSON fetch, no Firebase SDK — see lib/app-releases.js), falling back to the
 * static entries in apk-releases.mjs when nothing is published or the fetch fails.
 * That's what lets a new build go live without redeploying this site.
 *
 * The board's note said "Same app. Different roles." — but these are two apps (the
 * YoteMarket app for shoppers and merchants, and the Rider app), so it says what's true.
 */

const schema = (apps) => ({
  '@context': 'https://schema.org',
  '@graph': apps.map((app) => ({
    '@type': 'MobileApplication',
    name: app.name,
    description: app.description,
    applicationCategory: 'ShoppingApplication',
    operatingSystem: `Android ${app.minAndroid}+`,
    ...(app.release.version ? { softwareVersion: app.release.version } : {}),
    ...(app.release.sizeMb ? { fileSize: `${app.release.sizeMb} MB` } : {}),
    ...(app.release.releasedOn ? { datePublished: app.release.releasedOn } : {}),
    ...(isPublished(app) ? { downloadUrl: app.release.url, installUrl: app.release.url } : {}),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KES' },
    publisher: { '@type': 'Organization', name: PUBLISHER.legalName, url: PUBLISHER.website },
  })),
});

const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

function Spec({ label, value }) {
  if (!value) return null;
  return (
    <div className="apk-spec">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/* The checksum, with a Copy button. Clipboard access can be refused (an http page, a
   locked-down webview); then the text is selected so a long-press copies it. */
function Checksum({ value }) {
  const [state, setState] = useState('');
  const copy = async (e) => {
    const code = e.currentTarget.parentElement.querySelector('code');
    try {
      await navigator.clipboard.writeText(value);
      setState('Copied');
    } catch {
      try { const r = document.createRange(); r.selectNodeContents(code); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch { /* nothing more to try */ }
      setState('Selected');
    }
    setTimeout(() => setState(''), 2200);
  };
  return (
    <div className="apk-hash">
      <div>
        <span>SHA-256 checksum</span>
        <code>{value}</code>
      </div>
      <button type="button" className="apk-copy" onClick={copy} aria-label="Copy the SHA-256 checksum">
        {state ? <><Icon name="check" /> {state}</> : <><Icon name="copy" /> Copy</>}
      </button>
    </div>
  );
}

function AppCard({ app }) {
  const { release } = app;
  const live = isPublished(app);
  const chips = [
    ['Version', release.version],
    ['Size', release.sizeMb ? `${release.sizeMb} MB` : null],
    ['Released', fmtDate(release.releasedOn)],
    ['Android', `${app.minAndroid}+`],
  ].filter(([, v]) => v);
  return (
    <article className="pg-card apk-card">
      <header className="apk-card-head">
        <img src={app.icon} alt="" width="96" height="96" />
        <div>
          <h2>{app.name}</h2>
          <p className="apk-sub">{app.subtitle}</p>
          {chips.length > 0 && (
            <ul className="apk-chips">
              {chips.map(([k, v]) => <li key={k}><span>{k}</span> {v}</li>)}
            </ul>
          )}
        </div>
      </header>

      {live ? (
        <a className="pg-btn apk-dl" href={release.url} download>
          <Icon name="download" /> Download APK{release.version ? ` · v${release.version}` : ''}
        </a>
      ) : (
        <p className="apk-pending">
          <Icon name="clock" />
          <span>
            The signed APK for this app is not published yet. Email{' '}
            <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a> for the current build.
          </span>
        </p>
      )}

      {release.sha256 && <Checksum value={release.sha256} />}

      {/* What the app is, and the facts a mirror's listing process verifies against —
          folded away for people, still in the page for crawlers. */}
      <details className="apk-details">
        <summary>App details</summary>
        <p className="apk-desc">{app.description}</p>
        <dl className="apk-specs">
          <Spec label="Package" value={<code>{app.packageId}</code>} />
          <Spec label="Version code" value={release.versionCode} />
          <Spec label="Requires" value={`Android ${app.minAndroid} and up`} />
          <Spec label="Architectures" value={app.abi} />
          <Spec label="Price" value="Free" />
        </dl>
      </details>

      {(app.playUrl || app.uptodownUrl) && (
        <div className="apk-more">
          {app.playUrl && (
            <a className="pg-btn is-ghost" href={app.playUrl} rel="noopener">
              <GooglePlayIcon className="apk-gp" /> Google Play
            </a>
          )}
          {app.uptodownUrl && (
            <a className="pg-btn is-ghost" href={app.uptodownUrl} target="_blank" rel="noreferrer">
              <Icon name="download" /> Uptodown
            </a>
          )}
        </div>
      )}
    </article>
  );
}

function ApkPage() {
  // Start with what shipped in the bundle so the page is complete on first paint,
  // then swap in whatever the staff console has published since.
  const [apps, setApps] = useState(APPS);
  useEffect(() => {
    let live = true;
    fetchReleases().then((published) => { if (live) setApps(mergeReleases(published)); });
    return () => { live = false; };
  }, []);

  return (
    <main className="pg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema(apps)) }} />

      <PageHero
        tone="band"
        className="apk-hero"
        pill={{ icon: 'download', text: 'Official downloads' }}
        title={<>Download the official<br /><span className="g">YoteMarket</span> APKs</>}
        lead={<>The signed APKs we publish ourselves, for the YoteMarket app and the YoteMarket Rider app. Check each file against its SHA-256 checksum below before you install it.</>}
        art={{
          node: <img className="apk-art" src={apkPhones} width="1200" height="644" decoding="async"
            alt="The YoteMarket shopping app and the YoteMarket Rider app, side by side on two phones" />,
        }}
        note={'Shop, sell\nor ride.'}
        noteTone="light"
      />

      <section className="pg-sec">
        <div className="pg-wrap">
          <div className="apk-grid">
            {apps.map((app) => <AppCard key={app.slug} app={app} />)}
          </div>

          <div className="apk-info">
            <div className="pg-card pg-icard">
              <span className="pg-ic"><Icon name="download" /></span>
              <div>
                <h3>Installation guide</h3>
                <p>Open the downloaded file. Android asks you to let your browser or file manager install unknown apps — that permission is per app, and you can turn it off again afterwards.</p>
              </div>
            </div>
            <div className="pg-card pg-icard">
              <span className="pg-ic"><Icon name="shield" /></span>
              <div>
                <h3>Security notice</h3>
                <p>These are the official YoteMarket APKs. Always check the SHA-256 matches before installing — a file that does not match is not ours.</p>
              </div>
            </div>
            <div className="pg-card pg-icard">
              <span className="pg-ic"><Icon name="question" /></span>
              <div>
                <h3>Need help?</h3>
                <p>Write to <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a> and we will answer.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pg-sec apk-notes">
        <div className="pg-wrap">
          <div className="apk-notes-grid">
            <div>
              <span className="pg-kicker">Installing</span>
              <h2 className="pg-h2">Installing an APK</h2>
              <p>
                Before installing, check the SHA-256 on the card matches the file you downloaded; if it does
                not, delete it and download again from this page.
              </p>
              <p>
                Updates do not arrive automatically for an APK installed this way. Check back here, or install
                from Google Play once the listing is live and updates handle themselves.
              </p>
            </div>
            <div>
              <span className="pg-kicker">App stores &amp; mirrors</span>
              <h2 className="pg-h2">Listing these APKs</h2>
              <p>
                You may list and redistribute these APKs <strong>unmodified</strong>, provided the listing names{' '}
                {PUBLISHER.legalName} as the developer and links back to {PUBLISHER.website}. Do not re-sign,
                repackage, bundle an installer, or wrap them in advertising — a build that does not match the
                SHA-256 published here is not ours, and we will report it.
              </p>
              <p>
                This page is the canonical source: the URLs are permanent, and the version, version code, size and
                checksum on each card are updated the moment a new build ships, so a crawler can poll this page to
                detect a release.
              </p>
            </div>
          </div>

          <div className="pg-card apk-publisher">
            <h2>Publisher details</h2>
            <dl className="apk-specs apk-specs--wide">
              <Spec label="Developer" value={PUBLISHER.legalName} />
              <Spec label="Country" value={PUBLISHER.country} />
              <Spec label="Website" value={<a href={PUBLISHER.website}>{PUBLISHER.website}</a>} />
              <Spec label="Contact" value={<a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>} />
              <Spec label="Phone" value={PUBLISHER.phone} />
              <Spec label="Privacy policy" value={<Link to="/privacy">yotemarket.co.ke/privacy</Link>} />
              <Spec label="Data deletion" value={<Link to="/delete-account">yotemarket.co.ke/delete-account</Link>} />
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ApkPage;

import { Link } from 'react-router-dom';
import { APPS, PUBLISHER, isPublished } from '../lib/apk-releases.mjs';

/* /apk — the public download page for our signed Android APKs.
 *
 * The audience is two-sided: a shopper on a phone with no Play Store, and an app
 * mirror (Uptodown, APKPure, Aptoide) whose listing process needs a permanent URL
 * for the developer's own build plus the metadata to verify it. Both get the same
 * facts — package name, version, size, SHA-256 — from src/lib/apk-releases.mjs.
 */

const schema = {
  '@context': 'https://schema.org',
  '@graph': APPS.map((app) => ({
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
};

const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
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

function AppCard({ app }) {
  const { release } = app;
  const live = isPublished(app);
  return (
    <article className="apk-card">
      <header className="apk-card-head">
        <img src={app.icon} alt="" width="64" height="64" />
        <div>
          <h3>{app.name}</h3>
          <p className="apk-sub">{app.subtitle}</p>
          <code className="apk-pkg">{app.packageId}</code>
        </div>
      </header>

      <p className="apk-desc">{app.description}</p>

      <dl className="apk-specs">
        <Spec label="Version" value={release.version} />
        <Spec label="Version code" value={release.versionCode} />
        <Spec label="Size" value={release.sizeMb ? `${release.sizeMb} MB` : null} />
        <Spec label="Released" value={fmtDate(release.releasedOn)} />
        <Spec label="Requires" value={`Android ${app.minAndroid} and up`} />
        <Spec label="Architectures" value={app.abi} />
        <Spec label="Price" value="Free" />
      </dl>

      {release.sha256 && (
        <div className="apk-hash">
          <span>SHA-256</span>
          <code>{release.sha256}</code>
        </div>
      )}

      <div className="apk-actions">
        {live ? (
          <a className="btn btn-primary btn-lg" href={release.url} download>
            <i className="fas fa-download"></i> Download APK
            {release.version ? ` · v${release.version}` : ''}
          </a>
        ) : (
          <p className="apk-pending">
            <i className="fas fa-clock"></i> The signed APK for this app is not published yet. Email{' '}
            <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a> for the current build.
          </p>
        )}
        {app.playUrl && (
          <a className="btn btn-outline btn-lg" href={app.playUrl} rel="noopener">
            <i className="fab fa-google-play"></i> Google Play
          </a>
        )}
        {app.uptodownUrl && (
          <a className="btn btn-outline btn-lg" href={app.uptodownUrl} target="_blank" rel="noreferrer">
            <i className="fas fa-circle-down"></i> Uptodown
          </a>
        )}
      </div>
    </article>
  );
}

function ApkPage() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <section className="pad">
        <div className="wrap">
          <div className="page-head">
            <span className="eyebrow"><i className="fab fa-android"></i> Official downloads</span>
            <h1>YoteMarket Android apps (APK)</h1>
            <p>
              The signed APKs we publish ourselves, with the version, size and checksum to verify each one
              against. Use these if your phone has no Play Store — or, if you run an app mirror, take the file
              from here rather than repackaging one.
            </p>
          </div>

          <div className="apk-grid">
            {APPS.map((app) => <AppCard key={app.slug} app={app} />)}
          </div>
        </div>
      </section>

      <section className="pad" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="prose">
            <h3>Installing an APK</h3>
            <p>
              Open the downloaded file and Android will ask you to allow installs from your browser or file
              manager — that permission is per-app and you can turn it off again afterwards. Before installing,
              check the SHA-256 above matches the file you downloaded; if it does not, delete it and download
              again from this page.
            </p>
            <p>
              Updates do not arrive automatically for an APK installed this way. Check back here, or install from
              Google Play once the listing is live and updates handle themselves.
            </p>

            <h3>For app stores and mirrors</h3>
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

            <h3>Publisher details</h3>
            <dl className="apk-specs apk-specs--wide">
              <Spec label="Developer" value={PUBLISHER.legalName} />
              <Spec label="Country" value={PUBLISHER.country} />
              <Spec label="Website" value={<a href={PUBLISHER.website}>{PUBLISHER.website}</a>} />
              <Spec label="Contact" value={<a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>} />
              <Spec label="Phone" value={PUBLISHER.phone} />
              <Spec label="Privacy policy" value={<Link to="/privacy">yotemarket.co.ke/privacy</Link>} />
              <Spec label="Data deletion" value={<Link to="/delete-account">yotemarket.co.ke/delete-account</Link>} />
            </dl>

            <p>
              Anything unclear, or a listing to arrange? Write to{' '}
              <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a> and we will answer.
            </p>
          </div>
        </div>
      </section>

      <style>{`
      .apk-grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:22px;}
      .apk-card{background:var(--surface); border:1px solid var(--line); border-radius:22px; padding:28px; box-shadow:var(--shadow);}
      .apk-card-head{display:flex; gap:16px; align-items:flex-start; margin-bottom:18px;}
      .apk-card-head img{width:64px; height:64px; border-radius:18px; object-fit:contain; flex:none;}
      .apk-card-head h3{font-size:20px; color:var(--t1); margin:0;}
      .apk-sub{font-size:14px; color:var(--t3); margin:2px 0 8px;}
      .apk-pkg{font-size:12.5px; color:var(--t3); background:var(--surface2); border:1px solid var(--line);
        border-radius:7px; padding:3px 8px; display:inline-block; word-break:break-all;}
      .apk-desc{font-size:14.5px; color:var(--t2); line-height:1.7; margin:0 0 20px;}
      .apk-specs{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px 18px; margin:0 0 18px;}
      .apk-specs--wide{grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); margin:0 0 24px;}
      .apk-spec dt{font-size:11.5px; text-transform:uppercase; letter-spacing:.07em; color:var(--t3); margin-bottom:3px;}
      .apk-spec dd{font-size:14.5px; font-weight:600; color:var(--t1); margin:0; word-break:break-word;}
      .apk-hash{background:var(--surface2); border:1px solid var(--line); border-radius:12px; padding:12px 14px; margin-bottom:20px;}
      .apk-hash span{display:block; font-size:11.5px; text-transform:uppercase; letter-spacing:.07em; color:var(--t3); margin-bottom:5px;}
      .apk-hash code{font-size:12px; color:var(--t2); word-break:break-all; line-height:1.5;}
      .apk-actions{display:flex; flex-wrap:wrap; gap:12px; align-items:center;}
      .apk-pending{font-size:14px; color:var(--t3); margin:0; line-height:1.7;}
      .apk-pending i{margin-right:7px; color:var(--purple);}
      `}</style>
    </main>
  );
}

export default ApkPage;

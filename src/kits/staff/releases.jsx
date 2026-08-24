/* releases.jsx — Staff portal: publish the Android APKs that /apk serves.
   Admin-only. Uploading a build here replaces what the public download page and
   any app mirror (Uptodown & co.) fetch, without a redeploy of this site.

   The upload goes straight to Firebase Storage under app_releases/ — see
   lib/app-releases.js for the layout and the one Storage rule it needs. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, Bar } from './ui.jsx';
import { APPS } from '../../lib/apk-releases.mjs';
import { fetchReleases, publishRelease, toMb } from '../../lib/app-releases.js';

const { useState, useEffect, useCallback } = React;

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

function AppRelease({ app, published, onPublished }) {
  const [file, setFile] = useState(null);
  const [version, setVersion] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [uptodownUrl, setUptodownUrl] = useState('');
  const [progress, setProgress] = useState(null); // 0..1 while uploading
  const [msg, setMsg] = useState(null);           // { ok, text }

  const live = published?.release || null;
  useEffect(() => {
    setUptodownUrl(published?.uptodownUrl || app.uptodownUrl || '');
  }, [published, app.uptodownUrl]);

  const pick = (e) => {
    const f = e.target.files?.[0] || null;
    setMsg(null);
    if (!f) { setFile(null); return; }
    if (/\.aab$/i.test(f.name)) {
      setFile(null);
      setMsg({ ok: false, text: 'That is an App Bundle (.aab) — Play builds one, but nobody can install it directly. Upload the .apk instead.' });
      return;
    }
    if (!/\.apk$/i.test(f.name)) {
      setFile(null);
      setMsg({ ok: false, text: 'Only a .apk can be published here.' });
      return;
    }
    setFile(f);
    // Most build filenames carry the version — offer it rather than making them retype it.
    const guess = f.name.match(/(\d+\.\d+(?:\.\d+)?)/);
    if (guess && !version) setVersion(guess[1]);
  };

  const publish = async () => {
    if (!file) { setMsg({ ok: false, text: 'Choose the signed .apk first.' }); return; }
    if (!version.trim()) { setMsg({ ok: false, text: 'Enter the version, e.g. 1.4.2.' }); return; }
    setProgress(0); setMsg(null);
    try {
      const rel = await publishRelease(
        { slug: app.slug, file, version: version.trim(), versionCode, uptodownUrl: uptodownUrl.trim() },
        setProgress,
      );
      setMsg({ ok: true, text: `v${rel.version} is live on /apk — ${rel.sizeMb} MB, checksum published.` });
      setFile(null);
      onPublished();
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'Upload failed.' });
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;

  return (
    <Card className="p-6 space-y-3">
      <div className="flex items-center gap-3">
        <img src={app.icon} alt="" className="w-10 h-10 rounded-xl" style={{ objectFit: 'contain' }} />
        <div className="min-w-0">
          <h3 className="font-bold t1">{app.name}</h3>
          <div className="text-xs t3 truncate">{app.packageId}</div>
        </div>
        <div className="ml-auto">
          {live?.url ? <Pill tone="ok">v{live.version || '?'} live</Pill> : <Pill tone="amber">Nothing published</Pill>}
        </div>
      </div>

      {live?.url && (
        <div className="text-sm t3">
          {live.sizeMb} MB · version code {live.versionCode ?? '—'} · published {fmtDate(live.releasedOn)}
          <div className="text-xs t3 mt-1" style={{ wordBreak: 'break-all' }}>SHA-256 {live.sha256}</div>
        </div>
      )}

      <input
        type="file"
        accept=".apk,application/vnd.android.package-archive"
        onChange={pick}
        disabled={busy}
        className="ym-input"
        style={{ padding: '10px 12px' }}
      />
      {file && <div className="text-xs t3">{file.name} · {toMb(file.size)} MB</div>}

      <div className="flex items-center gap-2 flex-wrap">
        <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Version (1.4.2)"
          className="ym-input" style={{ width: 150 }} disabled={busy} />
        <input value={versionCode} onChange={(e) => setVersionCode(e.target.value.replace(/[^0-9]/g, ''))}
          inputMode="numeric" placeholder="Version code" className="ym-input" style={{ width: 140 }} disabled={busy} />
      </div>
      <input value={uptodownUrl} onChange={(e) => setUptodownUrl(e.target.value)}
        placeholder="Uptodown listing URL (optional)" className="ym-input" disabled={busy} />

      {busy && <Bar pct={Math.round(progress * 100)} />}

      <Btn kind="primary" size="md" icon={busy ? 'spinner' : 'cloud-arrow-up'} onClick={publish} disabled={busy}>
        {busy ? `Uploading… ${Math.round(progress * 100)}%` : 'Publish this build'}
      </Btn>

      {msg && (
        <div className="text-sm flex items-start gap-2" style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}>
          <Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} />
          <span>{msg.text}</span>
        </div>
      )}
    </Card>
  );
}

export function AppReleases() {
  const [published, setPublished] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setPublished(await fetchReleases());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="fadeup space-y-6">
      <SectionHead
        icon="cloud-arrow-up"
        title="App releases"
        sub="Publish the signed Android APKs that yotemarket.co.ke/apk serves — and that Uptodown and other mirrors fetch"
      />

      <Card className="p-5 text-sm t3 space-y-1">
        <div><b className="t1">What this does.</b> The build you upload becomes the download on <a href="/apk" target="_blank" rel="noreferrer" style={{ color: 'var(--pri)' }}>/apk</a> straight away — no redeploy. Its size and SHA-256 are computed here and published alongside it, which is what a mirror verifies before listing.</div>
        <div>Upload the <b>.apk</b>, not the .aab: Play installs bundles, people and mirrors cannot. Shorebird patches ride on top of an installed build, so a Shorebird release still needs its APK published here.</div>
        <div>An Uptodown URL set here shows on the /apk cards. The "Get it on Uptodown" badge on the homepage and /mobile is baked into the site build — say the word and it gets set there too.</div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {APPS.map((app) => (
          <AppRelease key={app.slug} app={app} published={loading ? null : published[app.slug]} onPublished={load} />
        ))}
      </div>
    </div>
  );
}

export default AppReleases;

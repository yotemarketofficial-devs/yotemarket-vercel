/* account.jsx — your own account: who you are, and the password that gets you in.
   Self-service, so it is NOT department-gated — every member of staff has one.

   THE PASSWORD NEVER REACHES OUR BACKEND. Firebase verifies the old one and stores the
   new one; no server of ours sees either. That is the same rule the staff-badge sign-in
   follows, and the reason is the same: being able to handle staff passwords would mean
   being able to log them, and it buys nothing.

   Reauthentication is asked for every time rather than only when Firebase insists. Without
   it, anyone who found an unlocked laptop could take the account permanently by setting a
   new password — and a check that appears only sometimes is one people learn to click
   past. The rules themselves live in lib/password.js, pure and tested. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, Avatar, Bar } from './ui.jsx';
import { useAuth } from '../../lib/useAuth.jsx';
import { useStaffClaims, TIER_LABEL, DEPT_LABEL } from './service.js';
import { checkPassword, passwordStrength, MIN_LENGTH } from '../../lib/password.js';

const { useState, useMemo } = React;

const field = {
  width: '100%', padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9,
  background: 'var(--bg)', color: 'var(--t1)', fontFamily: 'inherit', fontSize: '.875rem',
};

function PasswordSection() {
  const { user, changePassword, signInMethods, resetPassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // Checked as they type, but only shown once there is something to say — a list of
  // complaints appearing against an empty box reads as failure before any attempt.
  const check = useMemo(
    () => checkPassword(next, { email: user?.email, name: user?.displayName, current }),
    [next, current, user],
  );
  const strength = useMemo(() => passwordStrength(next), [next]);
  const mismatch = confirm.length > 0 && next !== confirm;
  const ready = check.ok && !mismatch && confirm.length > 0 && current.length > 0;

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!ready || busy) return;
    setBusy(true); setMsg(null);
    try {
      await changePassword(current, next);
      setCurrent(''); setNext(''); setConfirm('');
      setMsg({ ok: true, text: 'Password changed. It applies the next time you sign in.' });
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not change the password.' });
    } finally { setBusy(false); }
  };

  /* A Google account has no password of ours to change. Saying so beats rendering a form
     that can only ever fail, and it points at the place that can actually change it. */
  if (!signInMethods?.hasPassword) {
    return (
      <Card className="p-5 space-y-2">
        <h3 className="font-bold t1"><Icon name="key" /> Password</h3>
        <div className="text-sm t2">
          You sign in with {signInMethods?.hasGoogle ? 'Google' : 'a provider we do not manage'},
          so there is no password here to change.
        </div>
        <div className="text-xs t3">
          {signInMethods?.hasGoogle
            ? 'Change it in your Google account, and turn on 2-step verification there — that is what protects this console for you.'
            : 'Ask an admin if you should have an email and password on this account.'}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="font-bold t1 mb-1"><Icon name="key" /> Password</h3>
      <p className="text-xs t3 mb-4">
        Changed here in your browser — it is never sent to our servers. You will need your
        current one, which is what stops somebody at an unlocked laptop taking the account.
      </p>

      <form className="space-y-3" onSubmit={submit}>
        <div>
          <div className="text-xs t3 mb-1">Current password</div>
          <input style={field} type={show ? 'text' : 'password'} value={current}
            autoComplete="current-password"
            onChange={(e) => setCurrent(e.target.value)} />
        </div>

        <div>
          <div className="text-xs t3 mb-1">New password</div>
          <input style={field} type={show ? 'text' : 'password'} value={next}
            autoComplete="new-password"
            onChange={(e) => setNext(e.target.value)} />
          {next.length > 0 && (
            <div className="mt-2">
              <Bar pct={(strength.score / 4) * 100}
                color={strength.tone === 'ok' ? 'var(--green, var(--pri))' : strength.tone === 'amber' ? 'var(--amber)' : 'var(--red)'} />
              <div className="text-xs t3 mt-1">{strength.label}</div>
            </div>
          )}
          {/* Every failing rule at once, each naming the thing to change. A bare "too
              weak" sends people off to add a digit and try again. */}
          {next.length > 0 && !check.ok && (
            <ul className="mt-2 space-y-1" style={{ listStyle: 'none', padding: 0 }}>
              {check.problems.map((p) => (
                <li key={p} className="text-xs" style={{ color: 'var(--red)' }}>
                  <Icon name="circle-exclamation" /> {p}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="text-xs t3 mb-1">Confirm new password</div>
          <input style={field} type={show ? 'text' : 'password'} value={confirm}
            autoComplete="new-password"
            onChange={(e) => setConfirm(e.target.value)} />
          {mismatch && (
            <div className="text-xs mt-1" style={{ color: 'var(--red)' }}>
              <Icon name="circle-exclamation" /> The two do not match.
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-xs t3" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Show what I am typing
        </label>

        {msg && (
          <div className="text-sm p-3 rounded-lg"
            style={{ background: 'var(--surface2)', color: msg.ok ? 'var(--t2)' : 'var(--red)' }}>
            <Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} /> {msg.text}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Btn type="submit" icon="check" disabled={!ready || busy}>
            {busy ? 'Changing…' : 'Change password'}
          </Btn>
          {/* The way back in for somebody who cannot remember the current one — the same
              self-service reset the sign-in screen offers, rather than a request to an
              admin who would then have to be trusted with setting it. */}
          <Btn kind="ghost" type="button" onClick={async () => {
            try {
              await resetPassword(user?.email);
              setMsg({ ok: true, text: `A reset link is on its way to ${user?.email}.` });
            } catch (err) {
              setMsg({ ok: false, text: err.message || 'Could not send a reset link.' });
            }
          }}>Email me a reset link instead</Btn>
        </div>

        <div className="text-xs t3">
          At least {MIN_LENGTH} characters. Three unrelated words are easier to remember and
          harder to guess than one word with substitutions in it.
        </div>
      </form>
    </Card>
  );
}

/* Who the server says you are. Read-only: tier and departments are a security boundary
   and are changed by an admin in Access & roles, never by the person they apply to. */
function IdentityCard() {
  const { user } = useAuth();
  const { tier, departments = [], isAdmin, profile } = useStaffClaims();
  return (
    <Card className="p-5">
      <div className="flex items-start gap-4 flex-wrap">
        <Avatar src={profile?.photoUrl} name={profile?.name || user?.displayName || user?.email} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold t1 text-lg">{profile?.name || user?.displayName || 'You'}</h3>
            {(isAdmin || tier) && <Pill tone="blue">{TIER_LABEL[isAdmin ? 'admin' : tier] || tier}</Pill>}
          </div>
          <div className="text-sm t3 mt-0.5">{profile?.title || 'No job title set'}</div>
          <div className="text-xs t3 mt-1">
            {user?.email}
            {profile?.staffId ? <> · <span className="num">{profile.staffId}</span></> : null}
          </div>
          {!!departments.length && (
            <div className="flex flex-wrap gap-1 mt-2">
              {departments.map((d) => <Pill key={d} tone="ok">{DEPT_LABEL[d] || d}</Pill>)}
            </div>
          )}
        </div>
      </div>
      <div className="text-xs t3 mt-3" style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
        Your tier and departments decide what you can reach. They are set by an admin under
        Access &amp; roles — ask there if something you need is missing.
      </div>
    </Card>
  );
}

export function MyAccount() {
  const { user, signOutUser } = useAuth();
  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="id-badge" title="My account"
        sub="Who you are on this console, and the password that gets you in"
        action={<Btn kind="ghost" icon="arrow-right-from-bracket" onClick={signOutUser}>Sign out</Btn>} />
      <IdentityCard />
      <PasswordSection />
      {!user?.emailVerified && (
        <Card className="p-4" style={{ borderLeft: '3px solid var(--amber)' }}>
          <div className="text-sm t1"><Icon name="circle-exclamation" /> Your email address is not verified.</div>
          <div className="text-xs t3 mt-1">
            Some actions check it. Open the link in the message sent when your account was created.
          </div>
        </Card>
      )}
    </div>
  );
}

export default MyAccount;

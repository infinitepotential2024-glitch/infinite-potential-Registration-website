import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabaseClient";

// Landing page for the link in Supabase's "reset your password" email
// (see resetPasswordForEmail's redirectTo in pages/admin/login.js).
// Supabase's client library reads the recovery token out of the URL on
// load and turns it into a real session by itself — this page just has
// to wait for that, then let the admin pick a new password.
export default function UpdatePassword() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Covers the case where the recovery session was already established
    // by the time this component mounted.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (password.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setErr("Passwords do not match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
    setTimeout(() => router.replace("/admin/login"), 1500);
  }

  return (
    <Layout>
      <div className="center" style={{ maxWidth: 480 }}>
        <h2>Set a new password</h2>
        {done ? (
          <div className="notice ok">Password updated. Redirecting to sign in…</div>
        ) : !ready ? (
          <p className="hint">
            Checking your reset link… If nothing happens, the link may have expired —
            request a new one from the <a href="/admin/login">sign-in page</a>.
          </p>
        ) : (
          <form className="card" onSubmit={submit}>
            <div className="field">
              <label>New password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
            </div>
            <div className="field">
              <label>Confirm new password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
            </div>
            {err && <p className="err">{err}</p>}
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? <span className="spinner" /> : null} Update password
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
}

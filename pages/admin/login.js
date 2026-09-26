
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabaseClient";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/admin");
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setNotice("");
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);

    if (error) {
      setErr("Incorrect email or password.");
      return;
    }

    router.replace("/admin");
  }

  async function resetPassword() {
    setErr("");
    setNotice("");

    if (!email.trim()) {
      setErr("Please enter your email first.");
      return;
    }

    setBusy(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/update-password`,
      }
    );

    setBusy(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setNotice(
      "Password reset email sent. Please check your inbox."
    );
  }

  return (
    <Layout>
      <div className="center" style={{ maxWidth: 480 }}>
        <h2>Administrator sign in</h2>
        <p className="hint">
          This page is for the coaching centre only.
          Student registrations never require sign-in.
        </p>

        <form className="card" onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {err && <p className="err">{err}</p>}
          {notice && <p className="hint">{notice}</p>}

          <button
            className="btn btn-primary"
            disabled={busy}
            type="submit"
          >
            {busy ? <span className="spinner" /> : null}
            Sign in
          </button>

          <button
            className="btn"
            type="button"
            disabled={busy}
            onClick={resetPassword}
          >
            Forgot Password?
          </button>
        </form>
      </div>
    </Layout>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setReady(true);
      } else {
        setError(
          "This password reset link is invalid or has expired. Please request a new password reset email."
        );
      }
    }

    checkSession();
  }, []);

  async function handleUpdatePassword(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Password updated successfully. You can now sign in.");

    setPassword("");
    setConfirmPassword("");

    await supabase.auth.signOut();
  }

  return (
    <main
      style={{
        maxWidth: "500px",
        margin: "60px auto",
        padding: "30px",
      }}
    >
      <h1>Change Administrator Password</h1>

      {error && (
        <p style={{ color: "red", marginBottom: "20px" }}>
          {error}
        </p>
      )}

      {message && (
        <p style={{ color: "green", marginBottom: "20px" }}>
          {message}
        </p>
      )}

      {ready && (
        <form onSubmit={handleUpdatePassword}>
          <label>
            New Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              display: "block",
              width: "100%",
              padding: "12px",
              margin: "8px 0 20px",
              boxSizing: "border-box",
            }}
          />

          <label>
            Confirm New Password
          </label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{
              display: "block",
              width: "100%",
              padding: "12px",
              margin: "8px 0 20px",
              boxSizing: "border-box",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 20px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      )}
    </main>
  );
}

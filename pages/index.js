import Layout from "../components/Layout";
import Link from "next/link";
import { EXAM } from "../lib/supabaseClient";

export default function Home() {
  return (
    <Layout>
      <div className="hero">
        <div className="wrap hero-grid">
          <div>
            <p style={{ color: "var(--orange)", fontWeight: 800 }}>Learn • Grow • Achieve</p>
            <h1 style={{ fontSize: "2.6rem" }}>Madhyamik 2027<br />Mock Test</h1>
            <p>Two full-length mock tests conducted by Infinite Potential. Register online, pay ₹450,
              and download your admit card once the centre verifies your payment.</p>
            <p><span className="fee">Total fee ₹{EXAM.fee}</span></p>
            <p>
              <Link href="/register" className="btn btn-primary">Register now</Link>{" "}
              <Link href="/admit" className="btn btn-ghost">Download admit card</Link>
            </p>
            <p className="hint">Exam date {EXAM.dateLong} · Test centre: {EXAM.centre}</p>
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <img src="/poster.jpg" alt="Madhyamik 2027 Mock Test poster" />
          </div>
        </div>
      </div>

      <div className="wrap section">
        <h2>Pay the registration fee</h2>
        <div className="card" style={{ maxWidth: 480, margin: "1rem auto 0", textAlign: "center" }}>
          <div className="qr-box"><img src="/qr.jpg" alt="PhonePe payment QR code" /></div>
          <p style={{ marginTop: "1rem" }}>
            Scan this QR code using PhonePe or any UPI app, or pay directly to the UPI number below.
          </p>
          <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--navy)" }}>
            <a href={`tel:${EXAM.phone}`} style={{ color: "var(--navy)" }}>{EXAM.phone}</a>
          </p>
          <p className="fee">₹{EXAM.fee}</p>
          <p className="hint" style={{ marginTop: ".6rem" }}>
            Anyone can pay using this QR code or number — after paying, register below and submit your
            UTR / transaction ID and payment screenshot so the coaching centre can verify it.
          </p>
        </div>
      </div>

      <div className="wrap section">
        <h2>How registration works</h2>
        <div className="tiles">
          <div className="tile"><h3>1. Fill the form</h3><p>Candidate details and a photo. You get a registration number immediately.</p></div>
          <div className="tile"><h3>2. Pay ₹450</h3><p>Scan the PhonePe QR code with any UPI app.</p></div>
          <div className="tile"><h3>3. Submit payment details</h3><p>Enter the UTR / transaction ID and upload the screenshot.</p></div>
          <div className="tile"><h3>4. Get verified</h3><p>The centre checks your payment, then issues a roll number and unlocks your admit card.</p></div>
        </div>
      </div>
    </Layout>
  );
}

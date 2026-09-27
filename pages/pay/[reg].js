import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { compressImage } from "../../lib/pdf";
import { EXAM } from "../../lib/supabaseClient";

export default function Pay() {
  const router = useRouter();
  const { reg } = router.query;
  const [contact, setContact] = useState("");
  const [dob, setDob] = useState("");
  const [student, setStudent] = useState(null);
  const [checkErr, setCheckErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [utr, setUtr] = useState("");
  const [shot, setShot] = useState(null);
  const [shotPreview, setShotPreview] = useState(null);
  const [payErr, setPayErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!reg) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem("ip_last_reg") || "null");
      if (saved && saved.reg_no === reg) { setContact(saved.contact); setDob(saved.dob); }
    } catch (e) {}
  }, [reg]);

  async function check(e) {
    e?.preventDefault();
    setCheckErr(""); setBusy(true);
    try {
      const res = await fetch("/api/lookup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reg_no: reg, contact, dob }),
      });
      const data = await res.json();
      if (!res.ok) { setCheckErr(data.error || "Registration details not found."); return; }
      setStudent(data);
      setUtr(data.utr || "");
    } catch (err) { setCheckErr("Network error. Try again."); }
    finally { setBusy(false); }
  }

  async function onShot(e) {
    const f = e.target.files?.[0];
    setShot(null); setShotPreview(null);
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setPayErr("Choose a JPG, PNG or WebP screenshot.");
    if (f.size > 5 * 1024 * 1024) return setPayErr("That screenshot is larger than 5 MB.");
    setPayErr("");
    try { const d = await compressImage(f, 900, 1400, 0.7, 170000); setShot(d); setShotPreview(d); }
    catch (err) { setPayErr(err.message); }
  }

  async function submitPayment(e) {
    e.preventDefault();
    const utrClean = utr.trim().toUpperCase();
    if (!/^[A-Z0-9]{8,30}$/.test(utrClean)) { setPayErr("Enter the UTR / transaction ID (8–30 letters or digits)."); return; }
    if (!shot) { setPayErr("Upload the payment screenshot."); return; }
    setPayErr(""); setSubmitting(true);
    try {
      const res = await fetch("/api/pay-submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reg_no: reg, contact, dob, utr: utrClean, screenshotBase64: shot }),
      });
      const data = await res.json();
      if (!res.ok) { setPayErr(data.error || "Could not submit payment details."); return; }
      setDone(true);
    } catch (err) { setPayErr("Network error. Try again."); }
    finally { setSubmitting(false); }
  }

  return (
    <Layout>
      <div className="center">
        <h2>Pay the registration fee</h2>

        {!student && (
          <form className="card" onSubmit={check}>
            <p>Confirm your details to continue to payment for <b>{reg}</b>.</p>
            <div className="form-grid">
              <div className="field"><label>Mobile number</label><input value={contact} onChange={(e) => setContact(e.target.value)} inputMode="numeric" maxLength={10} /></div>
              <div className="field"><label>Date of birth</label><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
            </div>
            <p className="err">{checkErr}</p>
            <button className="btn btn-primary" disabled={busy} type="submit">{busy ? <span className="spinner" /> : null} Continue</button>
          </form>
        )}

        {student && !done && (
          <>
            <div className="card" style={{ marginBottom: "1rem" }}>
              <dl className="kv">
                <dt>Candidate</dt><dd>{student.name}</dd>
                <dt>Registration no.</dt><dd>{student.reg_no}</dd>
                <dt>Amount due</dt><dd>₹{EXAM.fee}</dd>
                <dt>Status</dt><dd><span className={`pill ${student.payment_status === "VERIFIED" ? "verified" : student.payment_status === "REJECTED" ? "rejected" : "pending"}`}>{student.payment_status}</span></dd>
              </dl>
            </div>
            {student.payment_status === "VERIFIED" ? (
              <div className="notice ok">Your payment is already verified. <a href="/admit">Go to the admit card page.</a></div>
            ) : (
              <div className="card">
                <h3>Scan and pay ₹{EXAM.fee}</h3>
                <p>Scan the QR code using PhonePe or any supported UPI application to pay ₹{EXAM.fee}.</p>
                <div className="qr-box"><img src="/qr.jpg" alt="PhonePe payment QR code" /></div>
                <form onSubmit={submitPayment} style={{ marginTop: "1.2rem" }}>
                  <div className="field full">
                    <label>UTR / transaction ID</label>
                    <input value={utr} onChange={(e) => setUtr(e.target.value)} maxLength={30} placeholder="From your UPI app's payment receipt" />
                  </div>
                  <div className="field full">
                    <label>Payment screenshot</label>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onShot} />
                    {shotPreview && <img src={shotPreview} className="shot" style={{ maxHeight: 200, marginTop: ".5rem" }} alt="screenshot preview" />}
                  </div>
                  <p className="err">{payErr}</p>
                  <button className="btn btn-primary" disabled={submitting} type="submit">{submitting ? <span className="spinner" /> : null} Submit payment details</button>
                  <p className="hint" style={{ marginTop: ".8rem" }}>Submitting does not confirm payment — the coaching centre verifies it against its bank record.</p>
                </form>
              </div>
            )}
          </>
        )}

        {done && (
          <div className="notice warn">
            Payment details submitted successfully. Your payment is pending verification by the coaching centre.
            You can check status any time on the <a href="/admit">admit card page</a> using your registration number, mobile number and date of birth.
          </div>
        )}
      </div>
    </Layout>
  );
}

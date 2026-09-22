import { useState } from "react";
import Layout from "../components/Layout";
import { EXAM } from "../lib/supabaseClient";
import { buildAdmitPDF, buildReceiptPDF, downloadPdf } from "../lib/pdf";

const MOBILE_RX = /^[6-9]\d{9}$/;
const REG_RX = /^IP2027-\d{5}$/i;

export default function Admit() {
  const [reg, setReg] = useState("");
  const [contact, setContact] = useState("");
  const [dob, setDob] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [student, setStudent] = useState(null);
  const [dlBusy, setDlBusy] = useState("");

  async function find(e) {
    e.preventDefault();
    setStudent(null); setErr("");
    if (!REG_RX.test(reg.trim()) || !MOBILE_RX.test(contact) || !dob) {
      setErr("Enter the registration number (IP2027-00001), the registered mobile number and the date of birth.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/lookup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reg_no: reg.trim().toUpperCase(), contact, dob }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Registration details not found."); return; }
      setStudent(data);
    } catch (e2) { setErr("Network error. Try again."); }
    finally { setBusy(false); }
  }

  async function downloadAdmit() {
    if (student.registration_status !== "SUCCESSFUL") return;
    setDlBusy("admit");
    try {
      const doc = await buildAdmitPDF({ ...student, contact, email: student.email || "" }, EXAM);
      downloadPdf(doc, `AdmitCard_${student.reg_no}.pdf`);
    } finally { setDlBusy(""); }
  }
  async function downloadReceipt() {
    setDlBusy("receipt");
    try {
      const doc = await buildReceiptPDF({ ...student, contact }, EXAM);
      downloadPdf(doc, `Receipt_${student.reg_no}.pdf`);
    } finally { setDlBusy(""); }
  }

  return (
    <Layout>
      <div className="center">
        <h2>Download your admit card</h2>
        <p className="hint">Enter the three details exactly as given during registration.</p>
        <form className="card" onSubmit={find}>
          <div className="form-grid">
            <div className="field"><label>Registration number</label><input value={reg} onChange={(e) => setReg(e.target.value)} placeholder="IP2027-00001" /></div>
            <div className="field"><label>Mobile number</label><input value={contact} onChange={(e) => setContact(e.target.value)} inputMode="numeric" maxLength={10} /></div>
            <div className="field"><label>Date of birth</label><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
          </div>
          <p className="err">{err}</p>
          <button className="btn btn-primary" disabled={busy} type="submit">{busy ? <span className="spinner" /> : null} Find admit card</button>
        </form>

        {student && (
          <div style={{ marginTop: "1rem" }}>
            {student.registration_status === "PAYMENT_PENDING" || student.registration_status === "DRAFT" ? (
              <div className="notice warn">
                Your payment is pending verification.
                {student.registration_status === "DRAFT" && <> <a href={`/pay/${student.reg_no}`}>Pay ₹{EXAM.fee} now.</a></>}
              </div>
            ) : student.registration_status === "REJECTED" ? (
              <div className="notice bad">Your payment could not be verified{student.note ? `: ${student.note}` : ""}. Please contact the coaching centre on {EXAM.phone}.</div>
            ) : (
              <div className="notice ok">Payment verified. Your admit card is ready.</div>
            )}
            <div className="card" style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
                {student.photo_url && <img src={student.photo_url} alt="candidate" style={{ width: 92, height: 116, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} />}
                <dl className="kv" style={{ flex: 1, minWidth: 220 }}>
                  <dt>Candidate</dt><dd>{student.name}</dd>
                  <dt>Roll number</dt><dd>{student.roll_no || "—"}</dd>
                  <dt>Registration no.</dt><dd>{student.reg_no}</dd>
                  <dt>Exam date</dt><dd>{EXAM.dateLong}</dd>
                  <dt>Test centre</dt><dd>{EXAM.centre}</dd>
                </dl>
              </div>
              <div style={{ marginTop: "1rem", display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
                {student.registration_status === "SUCCESSFUL" && (
                  <button className="btn btn-primary" onClick={downloadAdmit} disabled={dlBusy === "admit"}>
                    {dlBusy === "admit" ? <span className="spinner" /> : null} Download admit card
                  </button>
                )}
                <button className="btn btn-ghost" onClick={downloadReceipt} disabled={dlBusy === "receipt"}>
                  {dlBusy === "receipt" ? <span className="spinner" /> : null} Download registration receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

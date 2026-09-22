import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { compressImage } from "../lib/pdf";

const MOBILE_RX = /^[6-9]\d{9}$/;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const NAME_RX = /^[A-Za-z][A-Za-z .'-]{1,59}$/;

export default function Register() {
  const router = useRouter();
  const [v, setV] = useState({ name: "", dob: "", father: "", mother: "", contact: "", email: "", address: "" });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [formErr, setFormErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  async function onPhoto(e) {
    const f = e.target.files?.[0];
    setPhoto(null); setPreview(null);
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setErrors({ ...errors, photo: "Choose a JPG, PNG or WebP image." });
    if (f.size > 5 * 1024 * 1024) return setErrors({ ...errors, photo: "That photo is larger than 5 MB." });
    setErrors({ ...errors, photo: "" });
    try {
      const data = await compressImage(f, 620, 800, 0.82, 150000);
      setPhoto(data); setPreview(data);
    } catch (err) { setErrors({ ...errors, photo: err.message }); }
  }

  function validate() {
    const e = {};
    if (!NAME_RX.test(v.name)) e.name = "Enter the candidate name.";
    const d = v.dob ? new Date(v.dob) : null;
    if (!d || isNaN(d) || d > new Date() || d < new Date("1995-01-01")) e.dob = "Enter a valid date of birth.";
    if (!NAME_RX.test(v.father)) e.father = "Enter the father's name.";
    if (!NAME_RX.test(v.mother)) e.mother = "Enter the mother's name.";
    if (!MOBILE_RX.test(v.contact)) e.contact = "Enter a 10-digit Indian mobile number.";
    if (!EMAIL_RX.test(v.email)) e.email = "Enter a valid email address.";
    if (v.address.trim().length < 10) e.address = "Enter the full address.";
    if (!photo) e.photo = "Upload the candidate photo.";
    return e;
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate(); setErrors(errs);
    if (Object.keys(errs).length) { setFormErr("Fix the highlighted fields and submit again."); return; }
    setFormErr(""); setBusy(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, photoBase64: photo }),
      });
      const data = await res.json();
      if (!res.ok) { setFormErr(data.error || "Registration failed."); return; }
      try { sessionStorage.setItem("ip_last_reg", JSON.stringify({ reg_no: data.reg_no, contact: v.contact, dob: v.dob })); } catch (e) {}
      router.push(`/pay/${encodeURIComponent(data.reg_no)}`);
    } catch (err) { setFormErr("Network error. Try again."); }
    finally { setBusy(false); }
  }

  const F = ({ id, label, children }) => (
    <div className="field">
      <label htmlFor={id}>{label} <span style={{ color: "var(--orange)" }}>*</span></label>
      {children}
      <p className="err">{errors[id]}</p>
    </div>
  );

  return (
    <Layout>
      <div className="center">
        <h2>Student registration</h2>
        <p className="hint">Madhyamik 2027 Mock Test · ₹450 · Exam 23.10.2026</p>
        <form className="card" onSubmit={submit} style={{ marginTop: "1rem" }}>
          <div className="field full">
            <label>Candidate photo <span style={{ color: "var(--orange)" }}>*</span></label>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ width: 100, height: 128, border: "2px dashed var(--line)", borderRadius: 10, background: "var(--sky)", display: "grid", placeItems: "center", overflow: "hidden", fontSize: ".72rem", color: "var(--muted)", textAlign: "center" }}>
                {preview ? <img src={preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "No photo"}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhoto} />
                <p className="hint">JPG, PNG or WebP up to 5 MB.</p>
                <p className="err">{errors.photo}</p>
              </div>
            </div>
          </div>
          <div className="form-grid">
            <F id="name" label="Name of the candidate"><input value={v.name} onChange={set("name")} maxLength={60} /></F>
            <F id="dob" label="Date of birth"><input type="date" value={v.dob} onChange={set("dob")} /></F>
            <F id="father" label="Father's name"><input value={v.father} onChange={set("father")} maxLength={60} /></F>
            <F id="mother" label="Mother's name"><input value={v.mother} onChange={set("mother")} maxLength={60} /></F>
            <F id="contact" label="Contact number"><input value={v.contact} onChange={set("contact")} inputMode="numeric" maxLength={10} placeholder="10-digit mobile" /></F>
            <F id="email" label="Email ID"><input type="email" value={v.email} onChange={set("email")} maxLength={80} /></F>
            <div className="field full">
              <label htmlFor="address">Address <span style={{ color: "var(--orange)" }}>*</span></label>
              <textarea rows={3} value={v.address} onChange={set("address")} maxLength={220} />
              <p className="err">{errors.address}</p>
            </div>
          </div>
          <p className="err">{formErr}</p>
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? <span className="spinner" /> : null} Create my registration
          </button>
        </form>
      </div>
    </Layout>
  );
}

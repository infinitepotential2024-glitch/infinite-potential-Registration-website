import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { compressImage } from "../lib/pdf";

const MOBILE_RX = /^[6-9]\d{9}$/;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const NAME_RX = /^[A-Za-z][A-Za-z .'-]{1,59}$/;

// Defined OUTSIDE Register so it is not re-created on every keystroke.
// This is what keeps the cursor inside the input while typing.
function Field({ id, label, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} <span style={{ color: "var(--orange)" }}>*</span>
      </label>
      {children}
      <p className="err">{error}</p>
    </div>
  );
}

export default function Register() {
  const router = useRouter();
  const [v, setV] = useState({
    name: "",
    dob: "",
    father: "",
    mother: "",
    contact: "",
    email: "",
    address: "",
  });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [signature, setSignature] = useState(null);
  const [sigPreview, setSigPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [formErr, setFormErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    const value = e.target.value;
    setV((prev) => ({ ...prev, [k]: value }));
  };

  // Shared handler for the two image uploads (photo + signature)
  const IMG = {
    photo: { w: 620, h: 800, q: 0.82, max: 150000, setData: setPhoto, setPrev: setPreview },
    signature: { w: 700, h: 260, q: 0.85, max: 90000, setData: setSignature, setPrev: setSigPreview },
  };

  async function onImage(e, kind) {
    const cfg = IMG[kind];
    const f = e.target.files?.[0];
    cfg.setData(null);
    cfg.setPrev(null);

    if (!f) return;

    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      setErrors((prev) => ({ ...prev, [kind]: "Choose a JPG, PNG or WebP image." }));
      return;
    }

    if (f.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, [kind]: "That image is larger than 5 MB." }));
      return;
    }

    setErrors((prev) => ({ ...prev, [kind]: "" }));

    try {
      const data = await compressImage(f, cfg.w, cfg.h, cfg.q, cfg.max);
      cfg.setData(data);
      cfg.setPrev(data);
    } catch (err) {
      setErrors((prev) => ({ ...prev, [kind]: err.message }));
    }
  }

  function validate() {
    const e = {};

    if (!NAME_RX.test(v.name)) {
      e.name = "Enter the candidate name.";
    }

    const d = v.dob ? new Date(v.dob) : null;
    if (!d || isNaN(d) || d > new Date() || d < new Date("1995-01-01")) {
      e.dob = "Enter a valid date of birth.";
    }

    if (!NAME_RX.test(v.father)) {
      e.father = "Enter the father's name.";
    }

    if (!NAME_RX.test(v.mother)) {
      e.mother = "Enter the mother's name.";
    }

    if (!MOBILE_RX.test(v.contact)) {
      e.contact = "Enter a 10-digit Indian mobile number.";
    }

    if (!EMAIL_RX.test(v.email)) {
      e.email = "Enter a valid email address.";
    }

    if (v.address.trim().length < 10) {
      e.address = "Enter the full address.";
    }

    if (!photo) {
      e.photo = "Upload the candidate photo.";
    }

    if (!signature) {
      e.signature = "Upload the candidate signature.";
    }

    return e;
  }

  async function submit(e) {
    e.preventDefault();

    const errs = validate();
    setErrors(errs);

    if (Object.keys(errs).length) {
      setFormErr("Fix the highlighted fields and submit again.");
      return;
    }

    setFormErr("");
    setBusy(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, photoBase64: photo, signatureBase64: signature }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.errors) {
          // Server-side validation errors (field by field)
          setErrors(data.errors);
          setFormErr("Fix the highlighted fields and submit again.");
        } else {
          setFormErr(
            data.error || `Registration failed (error ${res.status}). Try again.`
          );
        }
        return;
      }

      try {
        sessionStorage.setItem(
          "ip_last_reg",
          JSON.stringify({
            reg_no: data.reg_no,
            contact: v.contact,
            dob: v.dob,
          })
        );
      } catch (err) {}

      router.push(`/pay/${encodeURIComponent(data.reg_no)}`);
    } catch (err) {
      setFormErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <div className="center">
        <h2>Student registration</h2>
        <p className="hint">
          Madhyamik 2027 Mock Test · ₹450 · Exam 23.10.2026
        </p>

        <form className="card" onSubmit={submit} style={{ marginTop: "1rem" }}>
          <div className="field full">
            <label>
              Recent photo of the candidate <span style={{ color: "var(--orange)" }}>*</span>
            </label>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: 100,
                  height: 128,
                  border: "2px dashed var(--line)",
                  borderRadius: 10,
                  background: "var(--sky)",
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                  fontSize: ".72rem",
                  color: "var(--muted)",
                  textAlign: "center",
                }}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  "No photo"
                )}
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => onImage(e, "photo")}
                />
                <p className="hint">
                  Recent passport-size colour photo, face clearly visible. JPG, PNG or
                  WebP up to 5 MB.
                </p>
                <p className="err">{errors.photo}</p>
              </div>
            </div>
          </div>

          <div className="field full" style={{ marginTop: "1rem" }}>
            <label>
              Candidate signature <span style={{ color: "var(--orange)" }}>*</span>
            </label>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: 200,
                  height: 72,
                  border: "2px dashed var(--line)",
                  borderRadius: 10,
                  background: "#fff",
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                  fontSize: ".72rem",
                  color: "var(--muted)",
                  textAlign: "center",
                }}
              >
                {sigPreview ? (
                  <img
                    src={sigPreview}
                    alt="signature preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  "No signature"
                )}
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => onImage(e, "signature")}
                />
                <p className="hint">
                  Sign with a black or blue pen on plain white paper, then upload a
                  clear, straight, well-lit photo. It will be printed on the admit card.
                </p>
                <p className="err">{errors.signature}</p>
              </div>
            </div>
          </div>

          <div className="form-grid">
            <Field id="name" label="Name of the candidate" error={errors.name}>
              <input
                id="name"
                value={v.name}
                onChange={set("name")}
                maxLength={60}
              />
            </Field>

            <Field id="dob" label="Date of birth" error={errors.dob}>
              <input
                id="dob"
                type="date"
                value={v.dob}
                onChange={set("dob")}
              />
            </Field>

            <Field id="father" label="Father's name" error={errors.father}>
              <input
                id="father"
                value={v.father}
                onChange={set("father")}
                maxLength={60}
              />
            </Field>

            <Field id="mother" label="Mother's name" error={errors.mother}>
              <input
                id="mother"
                value={v.mother}
                onChange={set("mother")}
                maxLength={60}
              />
            </Field>

            <Field id="contact" label="Contact number" error={errors.contact}>
              <input
                id="contact"
                value={v.contact}
                onChange={set("contact")}
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile"
              />
            </Field>

            <Field id="email" label="Email ID" error={errors.email}>
              <input
                id="email"
                type="email"
                value={v.email}
                onChange={set("email")}
                maxLength={80}
              />
            </Field>

            <div className="field full">
              <label htmlFor="address">
                Address <span style={{ color: "var(--orange)" }}>*</span>
              </label>
              <textarea
                id="address"
                rows={3}
                value={v.address}
                onChange={set("address")}
                maxLength={220}
              />
              <p className="err">{errors.address}</p>
            </div>
          </div>

          <p className="err">{formErr}</p>

          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? <span className="spinner" /> : null}
            Create my registration
          </button>
        </form>
      </div>
    </Layout>
  );
}

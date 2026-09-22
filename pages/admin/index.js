import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { supabase, EXAM } from "../../lib/supabaseClient";

const VIEWS = [["all", "All registrations"], ["pending", "Payment pending"], ["verified", "Verified"], ["rejected", "Rejected"], ["export", "Exports"]];
const dmy = (iso) => { if (!iso) return "—"; const p = String(iso).split("-"); return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : iso; };
const shortDate = (iso) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleDateString("en-GB"); };
const Pill = ({ status, kind }) => {
  const c = kind === "pay" ? (status === "VERIFIED" ? "verified" : status === "REJECTED" ? "rejected" : "pending")
    : (status === "SUCCESSFUL" ? "verified" : status === "REJECTED" ? "rejected" : status === "PAYMENT_PENDING" ? "pending" : "draft");
  return <span className={`pill ${c}`}>{status.replace("_", " ")}</span>;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [view, setView] = useState("all");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace("/admin/login"); return; }
      setSession(data.session);
    });
  }, []);

  async function authedFetch(url, opts = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(url, {
      ...opts,
      headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { router.replace("/admin/login"); throw new Error("Session expired."); }
    return res;
  }

  async function load() {
    setLoading(true); setLoadErr("");
    try {
      const res = await authedFetch("/api/admin/list");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load registrations.");
      setStudents(data.students);
    } catch (e) { setLoadErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (session) load(); }, [session]);

  const filtered = useMemo(() => {
    let rows = students;
    if (view === "pending") rows = rows.filter((r) => r.payment_status === "PENDING" && r.payment_submitted);
    if (view === "verified") rows = rows.filter((r) => r.payment_status === "VERIFIED");
    if (view === "rejected") rows = rows.filter((r) => r.payment_status === "REJECTED");
    const qq = q.trim().toLowerCase();
    if (qq) rows = rows.filter((r) => [r.reg_no, r.roll_no, r.name, r.contact, r.email, r.utr].some((x) => String(x || "").toLowerCase().includes(qq)));
    return rows;
  }, [students, view, q]);

  const stats = useMemo(() => ({
    total: students.length,
    pending: students.filter((r) => r.payment_status === "PENDING" && r.payment_submitted).length,
    verified: students.filter((r) => r.payment_status === "VERIFIED").length,
    rejected: students.filter((r) => r.payment_status === "REJECTED").length,
    success: students.filter((r) => r.registration_status === "SUCCESSFUL").length,
    admits: students.filter((r) => Number(r.admit_downloads) > 0).length,
  }), [students]);

  async function verify(reg_no) {
    const res = await authedFetch("/api/admin/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reg_no }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Could not verify."); return; }
    await load(); setModal(null);
  }
  async function reject(reg_no) {
    const note = prompt("Reason shown to the student (optional):", "") ?? null;
    if (note === null) return;
    const res = await authedFetch("/api/admin/reject", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reg_no, note }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Could not reject."); return; }
    await load(); setModal(null);
  }
  async function del(reg_no) {
    if (!confirm(`Delete registration ${reg_no}? This cannot be undone.`)) return;
    const res = await authedFetch("/api/admin/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reg_no }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Could not delete."); return; }
    await load(); setModal(null);
  }

  async function viewFile(reg_no, type) {
    const res = await authedFetch("/api/admin/file-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reg_no, type }) });
    const data = await res.json();
    if (res.ok) window.open(data.url, "_blank");
    else alert(data.error || "File not found.");
  }

  async function runExport(kind) {
    const XLSX = await import("xlsx");
    let rows = students;
    if (kind === "success") rows = rows.filter((r) => r.registration_status === "SUCCESSFUL");
    if (kind === "pending") rows = rows.filter((r) => r.payment_status === "PENDING" && r.payment_submitted);
    const cols = ["reg_no", "roll_no", "name", "dob", "father", "mother", "address", "contact", "email", "payment_status", "utr", "registration_status", "created_at"];
    const headers = ["Registration Number", "Roll Number", "Candidate Name", "Date of Birth", "Father's Name", "Mother's Name", "Address", "Contact Number", "Email ID", "Payment Status", "UTR / Transaction ID", "Registration Status", "Registration Date"];
    const data = rows.map((r) => { const o = {}; cols.forEach((c, i) => { o[headers[i]] = c === "dob" ? dmy(r[c]) : c === "created_at" ? shortDate(r[c]) : (r[c] || ""); }); return o; });
    if (!data.length) { alert("Nothing to export in this group yet."); return; }
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    XLSX.writeFile(wb, `IP_${kind}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (session === undefined) return <Layout><div className="center">Checking your session…</div></Layout>;

  return (
    <Layout>
      <div className="wrap section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Admin dashboard</h2>
          <button className="btn btn-ghost btn-sm" onClick={async () => { await supabase.auth.signOut(); router.replace("/admin/login"); }}>Sign out</button>
        </div>
        <div className="side">
          {VIEWS.map(([k, label]) => <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>{label}</button>)}
        </div>
        <div className="stats">
          {[["Total registrations", stats.total], ["Payment pending", stats.pending], ["Payment verified", stats.verified],
            ["Payment rejected", stats.rejected], ["Successful enrollments", stats.success], ["Admit cards downloaded", stats.admits]]
            .map(([label, n]) => <div className="stat" key={label}><b>{n}</b><span>{label}</span></div>)}
        </div>

        {loadErr && <div className="notice bad">{loadErr}</div>}

        {view === "export" ? (
          <div className="card">
            <h3>Download registration data</h3>
            <p>Files open in Excel, Google Sheets or LibreOffice. Photos and payment screenshots are never included.</p>
            <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => runExport("success")}>Export successful enrollments ({stats.success})</button>
              <button className="btn btn-ghost" onClick={() => runExport("all")}>Export all registrations ({stats.total})</button>
              <button className="btn btn-ghost" onClick={() => runExport("pending")}>Export payment pending ({stats.pending})</button>
            </div>
          </div>
        ) : (
          <>
            <div className="toolbar">
              <input placeholder="Search name, registration no., roll no., mobile, email or UTR" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {loading ? <div className="card">Loading…</div> : filtered.length === 0 ? <div className="card">No registrations match this view.</div> : (
              <div className="tablewrap"><table>
                <thead><tr>{["Registration no.", "Roll no.", "Candidate name", "DOB", "Contact", "Email", "Payment", "Registration", "Registered", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.reg_no}>
                      <td><b>{r.reg_no}</b></td><td>{r.roll_no || "—"}</td><td>{r.name}</td><td>{dmy(r.dob)}</td>
                      <td>{r.contact}</td><td>{r.email}</td>
                      <td><Pill status={r.payment_status} kind="pay" /></td><td><Pill status={r.registration_status} kind="reg" /></td>
                      <td>{shortDate(r.created_at)}</td>
                      <td><button className="btn btn-sm btn-navy" onClick={() => setModal(r)}>Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </>
        )}
      </div>

      {modal && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              <div><h3 style={{ margin: 0 }}>{modal.name}</h3><p className="hint">{modal.reg_no} · {modal.roll_no || "no roll number yet"}</p></div>
              <button className="btn btn-sm btn-ghost" onClick={() => setModal(null)}>Close</button>
            </div>
            <dl className="kv" style={{ marginTop: ".8rem" }}>
              <dt>Date of birth</dt><dd>{dmy(modal.dob)}</dd>
              <dt>Father's name</dt><dd>{modal.father}</dd>
              <dt>Mother's name</dt><dd>{modal.mother}</dd>
              <dt>Contact</dt><dd>{modal.contact}</dd><dt>Email</dt><dd>{modal.email}</dd>
              <dt>Address</dt><dd>{modal.address}</dd>
              <dt>UTR / transaction ID</dt><dd>{modal.utr || "not submitted"}</dd>
              <dt>Payment</dt><dd><Pill status={modal.payment_status} kind="pay" /></dd>
              <dt>Registration</dt><dd><Pill status={modal.registration_status} kind="reg" /></dd>
              <dt>Registered</dt><dd>{shortDate(modal.created_at)}</dd>
            </dl>
            <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginTop: "1rem" }}>
              {modal.photo_path && <button className="btn btn-sm btn-ghost" onClick={() => viewFile(modal.reg_no, "photo")}>View photo</button>}
              {modal.screenshot_path && <button className="btn btn-sm btn-ghost" onClick={() => viewFile(modal.reg_no, "screenshot")}>View payment screenshot</button>}
              {modal.payment_status !== "VERIFIED" && <button className="btn btn-sm btn-ok" onClick={() => verify(modal.reg_no)}>Verify payment</button>}
              {modal.payment_status !== "REJECTED" && <button className="btn btn-sm btn-danger" onClick={() => reject(modal.reg_no)}>Reject payment</button>}
              <button className="btn btn-sm btn-ghost" onClick={() => del(modal.reg_no)}>Delete registration</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

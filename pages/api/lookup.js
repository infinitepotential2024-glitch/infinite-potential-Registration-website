import { supabaseAdmin, validRegNo } from "../../lib/supabaseAdmin";

// The only student-facing read endpoint. It never accepts a registration
// number or roll number on its own — all three of reg_no, contact and
// dob must match, and only a small, student-safe subset of columns is
// ever returned (no other candidate's data, no internal ids).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { reg_no, contact, dob } = req.body || {};
  if (!validRegNo(reg_no) || !/^[6-9]\d{9}$/.test(contact || "") || !dob) {
    return res.status(400).json({ error: "Registration details not found." });
  }

  const { data: s } = await supabaseAdmin
    .from("students")
    .select("reg_no, name, dob, father, mother, address, contact, email, roll_no, payment_status, registration_status, verification_note, photo_path, signature_path, created_at, utr")
    .eq("reg_no", reg_no)
    .maybeSingle();

  if (!s || s.contact !== String(contact).trim() || s.dob !== dob) {
    return res.status(404).json({ error: "Registration details not found." });
  }

  let photoUrl = null;
  if (s.photo_path) {
    const { data } = await supabaseAdmin.storage.from("photos").createSignedUrl(s.photo_path, 300);
    photoUrl = data?.signedUrl || null;
  }
  let signatureUrl = null;
  if (s.signature_path) {
    const { data } = await supabaseAdmin.storage.from("signatures").createSignedUrl(s.signature_path, 300);
    signatureUrl = data?.signedUrl || null;
  }

  // Everything below is fine to hand back here: the caller already had
  // to prove reg_no + mobile + DOB together to reach this point, and the
  // admit card / receipt PDFs are built client-side from exactly this
  // response, so dob/father/mother/address/email need to travel with it.
  return res.status(200).json({
    reg_no: s.reg_no, name: s.name, dob: s.dob, father: s.father, mother: s.mother,
    address: s.address, contact: s.contact, email: s.email, roll_no: s.roll_no,
    payment_status: s.payment_status, registration_status: s.registration_status,
    note: s.verification_note, photo_url: photoUrl, signature_url: signatureUrl,
    created_at: s.created_at,
  });
}

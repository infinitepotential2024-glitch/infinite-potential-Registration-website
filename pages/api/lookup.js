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
    .select("reg_no, name, dob, contact, roll_no, payment_status, registration_status, verification_note, photo_path, created_at, utr")
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

  return res.status(200).json({
    reg_no: s.reg_no, name: s.name, roll_no: s.roll_no,
    payment_status: s.payment_status, registration_status: s.registration_status,
    note: s.verification_note, photo_url: photoUrl, created_at: s.created_at,
  });
}

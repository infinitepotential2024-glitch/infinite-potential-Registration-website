import { supabaseAdmin, validRegNo } from "../../lib/supabaseAdmin";

// Fired once from the client right after an admit card PDF is actually
// built, so the admin dashboard's "Admit cards downloaded" stat reflects
// reality instead of always reading zero. Gated the same way as lookup —
// reg_no + mobile + DOB must match — so it can't be used to inflate an
// arbitrary student's count from outside.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { reg_no, contact, dob } = req.body || {};
  if (!validRegNo(reg_no) || !contact || !dob) return res.status(400).json({ error: "Bad request." });

  const { data: student } = await supabaseAdmin
    .from("students")
    .select("reg_no, contact, dob")
    .eq("reg_no", reg_no)
    .maybeSingle();
  if (!student || student.contact !== String(contact).trim() || student.dob !== dob) {
    return res.status(404).json({ error: "Registration details not found." });
  }

  const { error } = await supabaseAdmin.rpc("bump_admit_downloads", { p_reg_no: reg_no });
  if (error) return res.status(500).json({ error: "Could not record the download." });

  return res.status(200).json({ ok: true });
}

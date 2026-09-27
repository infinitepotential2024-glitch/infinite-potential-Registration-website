import { supabaseAdmin, requireAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  const adminEmail = await requireAdmin(req);
  if (!adminEmail) return res.status(401).json({ error: "Admin sign-in required." });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { reg_no } = req.body || {};
  if (!reg_no) return res.status(400).json({ error: "Bad request." });

  // Roll number is assigned atomically inside Postgres — see assign_roll
  // in schema.sql — so two verifications happening at the same instant
  // can never be given the same roll number.
  const { data: roll, error: rollErr } = await supabaseAdmin.rpc("assign_roll", { p_reg_no: reg_no });
  if (rollErr) return res.status(500).json({ error: "Could not assign a roll number." });

  const { error } = await supabaseAdmin
    .from("students")
    .update({
      payment_status: "VERIFIED", registration_status: "SUCCESSFUL",
      verification_note: "", decided_at: new Date().toISOString(), decided_by: adminEmail,
    })
    .eq("reg_no", reg_no);
  if (error) return res.status(500).json({ error: "Could not verify this registration." });

  return res.status(200).json({ ok: true, roll_no: roll });
}

import { supabaseAdmin, requireAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  const adminEmail = await requireAdmin(req);
  if (!adminEmail) return res.status(401).json({ error: "Admin sign-in required." });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { reg_no, note } = req.body || {};
  if (!reg_no) return res.status(400).json({ error: "Bad request." });

  const { error } = await supabaseAdmin
    .from("students")
    .update({
      payment_status: "REJECTED", registration_status: "REJECTED",
      verification_note: String(note || "").slice(0, 140),
      decided_at: new Date().toISOString(), decided_by: adminEmail,
    })
    .eq("reg_no", reg_no);
  if (error) return res.status(500).json({ error: "Could not reject this registration." });

  return res.status(200).json({ ok: true });
}

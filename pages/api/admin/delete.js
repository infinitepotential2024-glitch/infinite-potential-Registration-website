import { supabaseAdmin, requireAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  const adminEmail = await requireAdmin(req);
  if (!adminEmail) return res.status(401).json({ error: "Admin sign-in required." });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { reg_no } = req.body || {};
  if (!reg_no) return res.status(400).json({ error: "Bad request." });

  await supabaseAdmin.storage.from("photos").remove([`${reg_no}.jpg`]).catch(() => {});
  await supabaseAdmin.storage.from("screenshots").remove([`${reg_no}.jpg`]).catch(() => {});
  const { error } = await supabaseAdmin.from("students").delete().eq("reg_no", reg_no);
  if (error) return res.status(500).json({ error: "Could not delete this registration." });

  return res.status(200).json({ ok: true });
}

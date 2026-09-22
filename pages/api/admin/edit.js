import { supabaseAdmin, requireAdmin, validateStudent } from "../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  const adminEmail = await requireAdmin(req);
  if (!adminEmail) return res.status(401).json({ error: "Admin sign-in required." });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { reg_no, patch } = req.body || {};
  if (!reg_no || !patch) return res.status(400).json({ error: "Bad request." });

  const errors = validateStudent(patch);
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const { error } = await supabaseAdmin
    .from("students")
    .update({
      name: patch.name.trim(), dob: patch.dob, father: patch.father.trim(), mother: patch.mother.trim(),
      address: patch.address.trim(), contact: patch.contact.trim(), email: patch.email.trim().toLowerCase(),
    })
    .eq("reg_no", reg_no);
  if (error) {
    const msg = /duplicate/i.test(error.message) ? "That mobile number or email belongs to another registration." : "Could not save the changes.";
    return res.status(400).json({ error: msg });
  }
  return res.status(200).json({ ok: true });
}

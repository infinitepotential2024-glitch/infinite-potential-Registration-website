import { supabaseAdmin, requireAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  const adminEmail = await requireAdmin(req);
  if (!adminEmail) return res.status(401).json({ error: "Sign in as an administrator to view this." });
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { data, error } = await supabaseAdmin
    .from("students")
    .select("reg_no,name,dob,father,mother,address,contact,email,amount,payment_submitted,payment_submitted_at,utr,payment_status,registration_status,roll_no,verification_note,admit_downloads,created_at,photo_path,screenshot_path")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: "Could not load registrations." });

  return res.status(200).json({ students: data });
}

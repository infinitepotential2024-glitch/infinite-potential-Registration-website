import { supabaseAdmin, requireAdmin } from "../../../lib/supabaseAdmin";

// Photos and payment screenshots live in private storage buckets. This
// is the only way to view one, and it requires an admin session — the
// signed URL it returns expires in five minutes.
export default async function handler(req, res) {
  const adminEmail = await requireAdmin(req);
  if (!adminEmail) return res.status(401).json({ error: "Admin sign-in required." });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { reg_no, type } = req.body || {};
  const bucket = type === "screenshot" ? "screenshots" : type === "photo" ? "photos" : null;
  if (!bucket || !reg_no) return res.status(400).json({ error: "Bad request." });

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(`${reg_no}.jpg`, 300);
  if (error || !data) return res.status(404).json({ error: "File not found." });
  return res.status(200).json({ url: data.signedUrl });
}

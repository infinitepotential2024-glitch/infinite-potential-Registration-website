import { supabaseAdmin, validRegNo } from "../../lib/supabaseAdmin";

// Same three-factor check as lookup: a payment submission is only ever
// applied to a row whose registration number, mobile number AND date of
// birth all match what the caller sent — a guessed registration number
// alone cannot attach a payment to someone else's row.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { reg_no, contact, dob, utr, screenshotBase64 } = req.body || {};
  if (!validRegNo(reg_no)) return res.status(400).json({ error: "Invalid registration number." });
  if (!/^[A-Z0-9]{8,30}$/i.test(utr || "")) return res.status(400).json({ error: "Enter a valid UTR / transaction ID." });
  if (!screenshotBase64) return res.status(400).json({ error: "Upload the payment screenshot." });

  const { data: student } = await supabaseAdmin
    .from("students")
    .select("reg_no, contact, dob, payment_status")
    .eq("reg_no", reg_no)
    .maybeSingle();
  if (!student || student.contact !== String(contact).trim() || student.dob !== dob) {
    return res.status(404).json({ error: "Registration details not found." });
  }
  if (student.payment_status === "VERIFIED") {
    return res.status(409).json({ error: "This registration is already verified." });
  }

  try {
    const b64 = screenshotBase64.split(",").pop();
    const buf = Buffer.from(b64, "base64");
    if (buf.length > 5 * 1024 * 1024) return res.status(400).json({ error: "Screenshot is larger than 5 MB." });
    const { error: upErr } = await supabaseAdmin.storage
      .from("screenshots")
      .upload(`${reg_no}.jpg`, buf, { contentType: "image/jpeg", upsert: true });
    if (upErr) throw upErr;
  } catch (e) {
    return res.status(500).json({ error: "Could not store the screenshot. Try again." });
  }

  await supabaseAdmin
    .from("students")
    .update({
      payment_submitted: true,
      payment_submitted_at: new Date().toISOString(),
      utr: String(utr).trim().toUpperCase(),
      screenshot_path: `${reg_no}.jpg`,
      registration_status: "PAYMENT_PENDING",
    })
    .eq("reg_no", reg_no)
    .neq("payment_status", "VERIFIED");

  return res.status(200).json({ ok: true });
}

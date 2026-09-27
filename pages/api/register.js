import { supabaseAdmin, validateStudent } from "../../lib/supabaseAdmin";

function uploadImage(bucket, path, base64) {
  const b64 = base64.split(",").pop();
  const buf = Buffer.from(b64, "base64");
  if (buf.length > 5 * 1024 * 1024) throw new Error("too_large");
  return supabaseAdmin.storage.from(bucket).upload(path, buf, { contentType: "image/jpeg", upsert: true });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { name, dob, father, mother, contact, email, address, photoBase64, signatureBase64 } = req.body || {};

  const errors = validateStudent({ name, dob, father, mother, contact, email, address });
  if (!photoBase64) errors.photo = "Upload the candidate photo.";
  if (!signatureBase64) errors.signature = "Upload the candidate signature.";
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const contactClean = String(contact).trim();
  // Email is optional now — null when not provided, so we never write
  // an empty string into a unique column (which would collide across
  // every student who also skipped it).
  const emailClean = String(email || "").trim().toLowerCase() || null;

  // Two separate equality checks rather than one .or("contact.eq.x,email.eq.y")
  // filter string: building that string from user-controlled values isn't
  // safe (PostgREST's or() syntax treats commas/parentheses specially, and
  // the email format we accept doesn't rule those out), and it also made
  // handling "no email" awkward.
  const { data: dupContact } = await supabaseAdmin
    .from("students").select("reg_no").eq("contact", contactClean).maybeSingle();
  if (dupContact) {
    return res.status(409).json({ error: `This mobile number is already registered as ${dupContact.reg_no}.` });
  }
  if (emailClean) {
    const { data: dupEmail } = await supabaseAdmin
      .from("students").select("reg_no").eq("email", emailClean).maybeSingle();
    if (dupEmail) {
      return res.status(409).json({ error: `This email is already registered as ${dupEmail.reg_no}.` });
    }
  }

  const { data: row, error: insErr } = await supabaseAdmin
    .from("students")
    .insert({
      name: name.trim(), dob, father: father.trim(), mother: mother.trim(),
      address: address.trim(), contact: contactClean, email: emailClean,
    })
    .select("reg_no")
    .single();
  if (insErr) return res.status(500).json({ error: "Could not create the registration. Try again." });

  const regNo = row.reg_no;
  const patch = {};

  try {
    const { error: upErr } = await uploadImage("photos", `${regNo}.jpg`, photoBase64);
    if (upErr) throw upErr;
    patch.photo_path = `${regNo}.jpg`;
  } catch (e) {
    // Registration itself succeeded; the photo can be re-uploaded from
    // the payment page's status view if this step failed.
  }

  try {
    const { error: upErr } = await uploadImage("signatures", `${regNo}.jpg`, signatureBase64);
    if (upErr) throw upErr;
    patch.signature_path = `${regNo}.jpg`;
  } catch (e) {
    // Same as above — non-fatal, can be redone later.
  }

  if (Object.keys(patch).length) {
    await supabaseAdmin.from("students").update(patch).eq("reg_no", regNo);
  }

  return res.status(200).json({ reg_no: regNo });
}

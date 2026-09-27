
import { supabaseAdmin, validateStudent } from "../../lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      name,
      dob,
      father,
      mother,
      contact,
      email,
      address,
      photoBase64,
    } = req.body || {};

    // Validate student details
    const errors = validateStudent({
      name,
      dob,
      father,
      mother,
      contact,
      email,
      address,
    });

    if (!photoBase64) {
      errors.photo = "Upload the candidate photo.";
    }

    if (Object.keys(errors).length) {
      return res.status(400).json({ errors });
    }

    const contactClean = String(contact).trim();
    const emailClean = String(email).trim().toLowerCase();

    // Check for duplicate mobile number or email
    const { data: dup, error: dupErr } = await supabaseAdmin
      .from("students")
      .select("reg_no")
      .or(`contact.eq.${contactClean},email.eq.${emailClean}`)
      .limit(1)
      .maybeSingle();

    if (dupErr) {
      console.error("Duplicate check failed:", dupErr);
      return res.status(500).json({
        error: "Could not check existing registrations. Try again.",
      });
    }

    if (dup) {
      return res.status(409).json({
        error: `This mobile number or email is already registered as ${dup.reg_no}.`,
      });
    }

    // Create student registration
    const { data: row, error: insErr } = await supabaseAdmin
      .from("students")
      .insert({
        name: name.trim(),
        dob,
        father: father.trim(),
        mother: mother.trim(),
        address: address.trim(),
        contact: contactClean,
        email: emailClean,
      })
      .select("reg_no")
      .single();

    if (insErr) {
      console.error("Registration insert failed:", insErr);
      return res.status(500).json({
        error: "Could not create the registration. Try again.",
      });
    }

    const regNo = row.reg_no;

    // Upload candidate photo
    try {
      const b64 = photoBase64.split(",").pop();
      const buf = Buffer.from(b64, "base64");

      if (buf.length > 5 * 1024 * 1024) {
        throw new Error("Photo is larger than 5 MB.");
      }

      const { error: upErr } = await supabaseAdmin.storage
        .from("photos")
        .upload(`${regNo}.jpg`, buf, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (upErr) {
        console.error("Photo upload failed:", upErr);
        throw upErr;
      }

      const { error: updateErr } = await supabaseAdmin
        .from("students")
        .update({ photo_path: `${regNo}.jpg` })
        .eq("reg_no", regNo);

      if (updateErr) {
        console.error("Photo path update failed:", updateErr);
      }
    } catch (photoErr) {
      // The registration has already been created.
      // Log the photo error for troubleshooting.
      console.error("Photo processing failed:", photoErr);
    }

    return res.status(200).json({ reg_no: regNo });
  } catch (err) {
    console.error("Registration API error:", err);

    return res.status(500).json({
      error: "Could not create the registration. Try again.",
    });
  }
}

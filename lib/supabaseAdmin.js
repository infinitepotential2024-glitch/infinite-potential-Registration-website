import { createClient } from "@supabase/supabase-js";

// SERVICE ROLE key — this file must never be imported by browser code
// (only by files under pages/api/). It bypasses row-level security, so
// every route that uses it must do its own authorization check.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MOBILE_RX = /^[6-9]\d{9}$/;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const NAME_RX = /^[A-Za-z][A-Za-z .'-]{1,59}$/;
const REG_RX = /^IP2027-\d{5}$/;

export function validateStudent(v) {
  const errors = {};
  if (!NAME_RX.test(v.name || "")) errors.name = "Enter the candidate name.";
  if (!v.dob || isNaN(new Date(v.dob))) errors.dob = "Enter a valid date of birth.";
  if (!NAME_RX.test(v.father || "")) errors.father = "Enter the father's name.";
  if (!NAME_RX.test(v.mother || "")) errors.mother = "Enter the mother's name.";
  if (!MOBILE_RX.test(v.contact || "")) errors.contact = "Enter a valid 10-digit Indian mobile number.";
  if (!EMAIL_RX.test(v.email || "")) errors.email = "Enter a valid email address.";
  if (!(v.address || "").trim() || v.address.trim().length < 10) errors.address = "Enter the full address.";
  return errors;
}
export function validRegNo(x) { return REG_RX.test(String(x || "")); }

// Reads the caller's Supabase Auth access token from the Authorization
// header, resolves the signed-in user, and confirms their email is in
// the `admins` table. Returns the admin's email on success, or null.
export async function requireAdmin(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.email) return null;
  const { data: row } = await supabaseAdmin
    .from("admins")
    .select("email")
    .eq("email", data.user.email)
    .maybeSingle();
  return row ? data.user.email : null;
}

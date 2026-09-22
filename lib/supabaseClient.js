import { createClient } from "@supabase/supabase-js";

// Anon key only — this file is bundled into the browser. It can sign a
// visitor in/out of Supabase Auth, but it cannot read or write the
// `students` table: row-level security has no policy for it at all.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const EXAM = {
  name: "Madhyamik 2027 Mock Test",
  date: "23.10.2026",
  dateLong: "23 October 2026",
  centre: "West of Balisai Bazar, above Balisai Public School",
  fee: 450,
  phone: "9064790014",
  org: "Infinite Potential – An Ideal Science Coaching Centre",
};

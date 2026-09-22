# Infinite Potential — Madhyamik 2027 Mock Test registration

A public registration site (no student login needed) with a private admin
dashboard, backed by Supabase (Postgres + Auth + Storage) and deployed on
Vercel. Follow these steps in order — about 10–15 minutes.

## 1. Create the Supabase project
1. Go to https://supabase.com → New project. Pick any name/region, save
   the database password somewhere safe (you won't need it again here).
2. Wait for the project to finish provisioning (~2 minutes).

## 2. Run the database schema
1. In the Supabase dashboard, open **SQL Editor** → New query.
2. Paste the entire contents of `supabase/schema.sql` from this project
   and click **Run**.
3. This creates the `students` and `admins` tables, turns on row-level
   security (students table has NO public policy at all — every
   student-facing read/write happens through the API routes below,
   not directly against the database), and creates two private storage
   buckets, `photos` and `screenshots`.
4. If the storage-bucket inserts at the bottom of the file error out
   (some Supabase versions restrict writing to `storage.buckets`
   directly), instead go to **Storage** in the sidebar and create two
   buckets by hand: `photos` and `screenshots`, both set to **Private**.

## 3. Create the admin sign-in
1. In Supabase, open **Authentication → Users → Add user**.
2. Email: `infinitepotential2024@gmail.com`
3. Password: choose one now (not one that's been typed anywhere else,
   including this chat — pick something fresh).
4. Tick **Auto confirm user** so it's usable immediately.
5. That email is already inserted into the `admins` table by the schema
   script, so this account can sign in to `/admin` right away. To add
   another administrator later, create their Auth user the same way,
   then run in SQL Editor:
   `insert into admins (email) values ('their@email.com');`

## 4. Get your API keys
In Supabase → **Project Settings → API**, copy:
- **Project URL**
- **anon public** key
- **service_role** key (keep this one secret — never put it in
  frontend code or commit it to a public repo)

## 5. Configure the project
1. Copy `.env.example` to `.env.local`.
2. Fill in the three values from step 4.

## 6. Run it locally (optional, to check everything first)
```
npm install
npm run dev
```
Open http://localhost:3000 — register a test student, pay with any
fake UTR + screenshot, then sign in at `/admin/login` and verify it.

## 7. Deploy to Vercel
1. Push this project to a GitHub repository (private is fine).
2. Go to https://vercel.com → **Add New → Project** → import that repo.
3. In **Environment Variables**, add the same three keys from step 5.
4. Click **Deploy**. Vercel gives you a live HTTPS URL immediately,
   e.g. `https://infinite-potential-xyz.vercel.app`.
5. Optional: **Project Settings → Domains** → add your own domain
   (e.g. `ipinstitute.in`) if you own one, and follow Vercel's DNS
   instructions.

That URL is what you share on WhatsApp, Facebook, Instagram, or
anywhere else — no app install needed, works on phone, tablet or
computer.

## What's public vs. private, and why
- `/`, `/register`, `/pay/[reg]`, `/admit` — open to anyone, no login.
  They only ever talk to the three student-facing API routes
  (`/api/register`, `/api/pay-submit`, `/api/lookup`), each of which
  runs its own validation and, for anything after registration,
  requires registration number + mobile number + date of birth to
  match together before returning or changing anything.
- `/admin/*` and every `/api/admin/*` route require a valid Supabase
  Auth session whose email is listed in the `admins` table. A visitor
  who opens `/admin` directly is redirected to `/admin/login`; any
  admin API call without a valid admin session gets HTTP 401.
- The `students` table has row-level security turned on with **no**
  policy granting the public (anon) role any access — not even to
  their own row. All public reads/writes go through the API routes,
  which use the service-role key server-side and enforce the
  three-factor match themselves. This is stricter than "students can
  only see their own row": a direct database query from a browser
  returns nothing at all, for anyone who isn't an admin.
- Candidate photos and payment screenshots live in **private** storage
  buckets. They are only ever reachable through a signed URL that
  expires in 5 minutes, issued by `/api/lookup` (for the candidate's
  own photo) or `/api/admin/file-url` (admin-only, for either file).
  There is no public, guessable, or permanent URL to either file.
- Excel exports are built in the admin's browser from data it already
  legitimately fetched over an authenticated session, and download
  directly as a file — there's no export URL to guess or share.
- The admin password is never stored by this app at all: Supabase Auth
  handles hashing, sessions and rate-limiting. This app only ever
  checks "is there a valid session, and is its email in `admins`?".

## Changing the admin email on a site that's already deployed
If you already ran `schema.sql` once with a different email, re-running it
won't move admin rights to a new address by itself — do this in Supabase:
1. **Authentication → Users → Add user** → enter the new email
   (`infinitepotential2024@gmail.com`) and a password → tick **Auto
   confirm user**.
2. **SQL Editor** → run:
   `insert into admins (email) values ('infinitepotential2024@gmail.com') on conflict (email) do nothing;`
3. If the old email should no longer have access, also run:
   `delete from admins where email = 'the-old-email@gmail.com';`
   and optionally delete that user under Authentication → Users.
4. Redeploy this updated code (the new email is now the one baked into
   `schema.sql` for anyone setting the project up from scratch).

## Changing the admin password later
Supabase → Authentication → Users → find the account → **Send password
recovery** (emails a reset link) or set a new password directly from
that screen.

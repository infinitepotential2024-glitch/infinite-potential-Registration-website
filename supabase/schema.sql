-- Infinite Potential — Madhyamik 2027 Mock Test registration
-- Run this once in Supabase → SQL Editor, top to bottom.

create extension if not exists pgcrypto;

-- ---------- admins ----------
-- Anyone whose Supabase Auth email is listed here can use the admin API
-- routes. Everyone else — including a signed-in student, if you ever add
-- student accounts — gets nothing: there is no policy below that grants
-- students any access to this table or to students/students-only data.
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

insert into admins (email) values ('infinitepotential2024@gmail.com')
  on conflict (email) do nothing;

-- ---------- sequences ----------
create sequence if not exists reg_seq start 1;
create sequence if not exists roll_seq start 1;

-- ---------- students ----------
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  reg_no text unique not null default ('IP2027-' || lpad(nextval('reg_seq')::text, 5, '0')),
  name text not null,
  dob date not null,
  father text not null,
  mother text not null,
  address text not null,
  contact text unique not null,
  email text unique not null,
  photo_path text,
  amount int not null default 450,
  payment_submitted boolean not null default false,
  payment_submitted_at timestamptz,
  utr text,
  screenshot_path text,
  payment_status text not null default 'PENDING'
    check (payment_status in ('PENDING','VERIFIED','REJECTED')),
  registration_status text not null default 'DRAFT'
    check (registration_status in ('DRAFT','PAYMENT_PENDING','SUCCESSFUL','REJECTED')),
  roll_no text unique,
  verification_note text,
  decided_at timestamptz,
  decided_by text,
  admit_downloads int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_students_contact on students (contact);
create index if not exists idx_students_email on students (email);
create index if not exists idx_students_payment on students (payment_status);
create index if not exists idx_students_reg on students (registration_status);

-- keep updated_at current
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_students_touch on students;
create trigger trg_students_touch before update on students
  for each row execute function touch_updated_at();

-- ---------- row level security ----------
-- RLS is ON with NO policy for the anonymous or authenticated roles.
-- That means: a request using the public (anon) key can never read or
-- write this table directly, from any client, under any circumstance —
-- not "students only see their own row", but zero direct access. Every
-- student-facing action (register, submit payment, look up status) goes
-- through the Next.js API routes, which use the service-role key on the
-- server and apply their own narrow rules (e.g. a lookup must match
-- registration number + mobile + date of birth together). The only
-- table-level access anyone gets is the policy below, for admins.
alter table students enable row level security;

create or replace function is_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from admins where email = (auth.jwt() ->> 'email')
  );
$$;

drop policy if exists admin_all on students;
create policy admin_all on students for all
  using (is_admin()) with check (is_admin());

alter table admins enable row level security;
drop policy if exists admin_read_admins on admins;
create policy admin_read_admins on admins for select using (is_admin());

-- ---------- atomic roll-number assignment ----------
-- Runs entirely inside Postgres, so two simultaneous "verify" clicks on
-- two different students can never receive the same roll number.
create or replace function assign_roll(p_reg_no text) returns text
language plpgsql security definer as $$
declare v_roll text;
begin
  select roll_no into v_roll from students where reg_no = p_reg_no;
  if v_roll is not null then
    return v_roll;
  end if;
  v_roll := 'MP27-' || lpad(nextval('roll_seq')::text, 3, '0');
  update students set roll_no = v_roll where reg_no = p_reg_no;
  return v_roll;
end;
$$;

-- ---------- storage buckets ----------
-- Create these in Supabase → Storage (or run below if the storage
-- extension is enabled): both PRIVATE. Photos and payment screenshots
-- are only ever served through short-lived signed URLs issued by the
-- API routes after checking who is asking.
insert into storage.buckets (id, name, public)
  values ('photos', 'photos', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('screenshots', 'screenshots', false)
  on conflict (id) do nothing;

-- No storage.objects policies are created for anon/authenticated: all
-- uploads and signed-URL creation happen server-side with the service
-- role key, which bypasses storage RLS by design.

CREATE TABLE IF NOT EXISTS public.tenms_programs (
  id integer primary key,
  catalog_product_id integer not null,
  slug text,
  stream text not null default 'Common',
  subject_name_en text not null,
  subject_name_bn text not null,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.tenms_courses (
  id integer primary key,
  program_id integer not null references public.tenms_programs(id) on delete cascade,
  name_en text not null,
  name_bn text not null,
  thumbnail text,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.tenms_classes (
  id uuid primary key default gen_random_uuid(),
  course_id integer not null references public.tenms_courses(id) on delete cascade,
  class_no integer not null default 1,
  title text not null,
  status text not null default 'pending',
  scheduled_on date,
  resource_url text,
  note text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  CONSTRAINT tenms_classes_status_chk CHECK (status IN ('uploaded','pending','missing','scheduled'))
);
CREATE INDEX IF NOT EXISTS tenms_classes_course_idx ON public.tenms_classes(course_id);

CREATE TABLE IF NOT EXISTS public.tenms_catalog_cache (
  product_id integer primary key,
  slug text,
  title text,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_number text not null unique,
  student_code text,
  email text,
  stream text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

CREATE SEQUENCE IF NOT EXISTS public.ticket_no_seq START 1;

CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique default ('HSC28-' || lpad(nextval('public.ticket_no_seq')::text, 6, '0')),
  student_id uuid not null references public.students(id) on delete cascade,
  category text not null,
  title text not null,
  description text not null,
  course_id integer references public.tenms_courses(id) on delete set null,
  class_ref text,
  attachment_url text,
  status text not null default 'open',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  CONSTRAINT tickets_status_chk CHECK (status IN ('open','in_review','waiting_info','resolved','closed'))
);
CREATE INDEX IF NOT EXISTS tickets_student_idx ON public.tickets(student_id);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_type text not null,
  author_name text,
  body text not null,
  created_at timestamptz not null default now(),
  CONSTRAINT ticket_messages_author_chk CHECK (author_type IN ('student','staff'))
);
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_idx ON public.ticket_messages(ticket_id);

CREATE TABLE IF NOT EXISTS public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.tenms_programs TO anon, authenticated;
GRANT ALL ON public.tenms_programs TO service_role;
GRANT SELECT ON public.tenms_courses TO anon, authenticated;
GRANT ALL ON public.tenms_courses TO service_role;
GRANT SELECT ON public.tenms_classes TO anon, authenticated;
GRANT ALL ON public.tenms_classes TO service_role;
GRANT SELECT ON public.tenms_catalog_cache TO anon, authenticated;
GRANT ALL ON public.tenms_catalog_cache TO service_role;
GRANT SELECT ON public.notices TO anon, authenticated;
GRANT ALL ON public.notices TO service_role;
GRANT ALL ON public.students TO service_role;
GRANT ALL ON public.tickets TO service_role;
GRANT ALL ON public.ticket_messages TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ticket_no_seq TO service_role;

ALTER TABLE public.tenms_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenms_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenms_catalog_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programs are public" ON public.tenms_programs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "courses are public" ON public.tenms_courses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "classes are public" ON public.tenms_classes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog cache is public" ON public.tenms_catalog_cache FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "published notices are public" ON public.notices FOR SELECT TO anon, authenticated USING (published);

INSERT INTO public.tenms_programs (id, catalog_product_id, slug, stream, subject_name_en, subject_name_bn) VALUES
  (408, 11237, 'hsc-28-bangla-online-batch', 'Common', 'Bangla', 'বাংলা'),
  (409, 11238, 'hsc-english-28-online-batch', 'Common', 'English', 'ইংরেজি'),
  (410, 11239, 'hsc-28-ict-online-batch', 'Common', 'ICT', 'আইসিটি'),
  (407, 11245, 'hsc-28-physics-online-batch', 'Science', 'Physics', 'পদার্থবিজ্ঞান'),
  (406, 11246, 'hsc-28-chemistry-online-batch', 'Science', 'Chemistry', 'রসায়ন'),
  (405, 11247, 'hsc-28-math-online-batch', 'Science', 'Higher Math', 'উচ্চতর গণিত'),
  (404, 11248, 'hsc-28-biology-online-batch', 'Science', 'Biology', 'জীববিজ্ঞান'),
  (403, 11249, 'hsc-28-finance-online-batch', 'Business Studies', 'Finance', 'ফাইন্যান্স'),
  (402, 11250, 'hsc-28-accounting-online-batch', 'Business Studies', 'Accounting', 'হিসাববিজ্ঞান'),
  (401, 11251, 'hsc-28-management-online-batch', 'Business Studies', 'Management', 'ম্যানেজমেন্ট'),
  (400, 11252, 'hsc-28-marketing-online-batch', 'Business Studies', 'Marketing', 'মার্কেটিং'),
  (397, 11255, 'hsc-28-geography-online-batch', 'Humanities', 'Geography', 'ভূগোল'),
  (399, 11253, 'hsc-28-economics-online-batch', 'Humanities', 'Economics', 'অর্থনীতি'),
  (398, 11254, 'hsc-28-civics-online-batch', 'Humanities', 'Civics', 'পৌরনীতি')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenms_courses (id, program_id, name_en, name_bn) VALUES
  (2046, 408, 'Bangla 1st Paper', 'Bangla 1st Paper'),
  (2047, 408, 'Bangla 2nd Paper', 'Bangla 2nd Paper'),
  (2267, 408, 'Basic Building Class', 'Basic Building Class'),
  (2048, 409, 'English 1st Paper', 'English 1st Paper'),
  (2049, 409, 'English 2nd Paper', 'English 2nd Paper'),
  (2266, 409, 'Basic Building Class', 'Basic Building Class'),
  (2050, 410, 'ICT', 'ICT'),
  (2265, 410, 'Basic Building Class', 'Basic Building Class'),
  (2038, 407, 'Physics 1st Paper', 'Physics 1st Paper'),
  (2041, 407, 'Physics 2nd Paper', 'Physics 2nd Paper'),
  (2271, 407, 'Basic Building Class', 'Basic Building Class'),
  (2039, 406, 'Chemistry 1st Paper', 'Chemistry 1st Paper'),
  (2040, 406, 'Chemistry 2nd Paper', 'Chemistry 2nd Paper'),
  (2270, 406, 'Basic Building Class', 'Basic Building Class'),
  (2042, 405, 'Higher Math 1st Paper', 'Higher Math 1st Paper'),
  (2043, 405, 'Higher Math 2nd Paper', 'Higher Math 2nd Paper'),
  (2269, 405, 'Basic Building Class', 'Basic Building Class'),
  (2044, 404, 'Biology 1st Paper', 'Biology 1st Paper'),
  (2045, 404, 'Biology 2nd Paper', 'Biology 2nd Paper'),
  (2268, 404, 'Basic Building Class', 'Basic Building Class'),
  (2053, 403, 'Finance 1st Paper', 'Finance 1st Paper'),
  (2054, 403, 'Finance 2nd Paper', 'Finance 2nd Paper'),
  (2264, 403, 'Basic Building Class', 'Basic Building Class'),
  (2055, 402, 'Accounting 1st Paper', 'Accounting 1st Paper'),
  (2056, 402, 'Accounting 2nd Paper', 'Accounting 2nd Paper'),
  (2263, 402, 'Basic Building Class', 'Basic Building Class'),
  (2233, 401, 'Management 1st Paper', 'Management 1st Paper'),
  (2234, 401, 'Management 2nd Paper', 'Management 2nd Paper'),
  (2262, 401, 'Basic Building Class', 'Basic Building Class'),
  (2231, 400, 'Marketing 1st Paper', 'Marketing 1st Paper'),
  (2232, 400, 'Marketing 2nd Paper', 'Marketing 2nd Paper'),
  (2260, 400, 'Basic Building Class', 'Basic Building Class'),
  (2058, 397, 'Geography 1st Paper', 'Geography 1st Paper'),
  (2057, 397, 'Geography 2nd Paper', 'Geography 2nd Paper'),
  (2250, 397, 'Basic Building Class', 'Basic Building Class'),
  (2052, 399, 'Economics 2nd Paper', 'Economics 2nd Paper'),
  (2051, 399, 'Economics 1st Paper', 'Economics 1st Paper'),
  (2258, 399, 'Basic Building Class', 'Basic Building Class'),
  (2229, 398, 'Civics 1st Paper', 'Civics 1st Paper'),
  (2230, 398, 'Civics 2nd Paper', 'Civics 2nd Paper'),
  (2257, 398, 'Basic Building Class', 'Basic Building Class')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (name, contact_number, student_code, stream) VALUES
  ('Rahim Uddin', '01711000001', 'HSC28-S-001', 'Science'),
  ('Karim Hossain', '01711000002', 'HSC28-S-002', 'Science'),
  ('Nabila Akter', '01711000003', 'HSC28-B-001', 'Business Studies'),
  ('Sadia Islam', '01711000004', 'HSC28-H-001', 'Humanities')
ON CONFLICT (contact_number) DO NOTHING;

INSERT INTO public.notices (title, body) VALUES
  ('HSC 28 class upload schedule', 'Recorded lectures are published within 24 hours of each live class. Check the Course Activity page for the live status of every class.'),
  ('How to report a problem', 'Log in with your registered contact number, open "Report a Problem" and describe the issue. You will get a ticket ID to track it.');

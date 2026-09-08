-- שלב 1 של המיגרציה: מרחבי למידה כטבלה, ורשם משימות אחד בטבלת tasks.
-- כל הפקודות אידמפוטנטיות — הריצה חוזרת בטוחה.

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  subtitle text not null default 'עברית',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  teacher_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.spaces enable row level security;
drop policy if exists "open access spaces" on public.spaces;
create policy "open access spaces" on public.spaces for all to anon, authenticated using (true) with check (true);

insert into public.spaces (slug, name, subtitle, sort_order) values
  ('10-1','כיתה י'' 1','עברית',1),
  ('10-2','כיתה י'' 2','עברית',2),
  ('11-1','כיתה י"א 1','עברית',3),
  ('11-2','כיתה י"א 2','עברית',4),
  ('12-1','כיתה י"ב 1','עברית',5)
on conflict (slug) do nothing;

alter table public.tasks
  add column if not exists space_id uuid references public.spaces(id),
  add column if not exists engine text not null default 'legacy-core',
  add column if not exists definition jsonb,
  add column if not exists published_at timestamptz,
  add column if not exists source_id uuid,
  add column if not exists updated_at timestamptz not null default now();
alter table public.tasks drop constraint if exists task_kind_valid;
alter table public.tasks add constraint task_kind_valid check (kind in ('required','choice','parts_of_speech','standalone'));
alter table public.tasks drop constraint if exists task_engine_valid;
alter table public.tasks add constraint task_engine_valid check (engine in ('legacy-core','legacy-nb10','legacy-mi','runner'));
alter table public.tasks drop constraint if exists task_grading_mode_valid;
alter table public.tasks add constraint task_grading_mode_valid check (grading_mode in ('weighted','submission','manual'));

update public.tasks t set space_id = s.id from public.spaces s where s.slug = t.class_slug and t.space_id is null;
update public.tasks set published_at = created_at where published_at is null;

-- רישום המשימות העצמאיות ברשם, עם אותו מזהה כמו בטבלת הענף.
insert into public.tasks (id, kind, title, description, class_slug, space_id, engine, source_id, grading_mode, is_active, opens_at, closes_at, created_at, published_at, sort_order)
select t.id, 'standalone', 'התחלות חדשות',
       'תשעה עמודים קצרים: קריאת המאמר בפסקאות, שאלות לכל פסקה, פתגם, כתיבה מסכמת ומשוב — עם עוזר שיטה.',
       t.class_slug, s.id, 'legacy-nb10', t.id, 'submission', t.is_active, t.opens_at, t.closes_at, t.created_at, t.created_at, 0
from public.nb10_tasks t join public.spaces s on s.slug = t.class_slug
on conflict (id) do nothing;

insert into public.tasks (id, kind, title, description, class_slug, space_id, engine, source_id, grading_mode, is_active, opens_at, closes_at, created_at, published_at, sort_order)
select t.id, 'standalone', 'ניסוח רעיון מרכזי — תרגול',
       'שלושה עמודים קצרים: איך מזהים רעיון מרכזי, איך בודקים ניסוח, וניסוח עצמאי.',
       t.class_slug, s.id, 'legacy-mi', t.id, 'submission', t.is_active, t.opens_at, t.closes_at, t.created_at, t.created_at, 0
from public.mi_tasks t join public.spaces s on s.slug = t.class_slug
on conflict (id) do nothing;

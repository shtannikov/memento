create table memento.user_apps (
  user_id bigint not null references memento.app_users (telegram_user_id) on delete cascade,
  app_id text not null check (app_id in ('en', 'cz')),
  starter_seeded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, app_id)
);

insert into memento.user_apps (user_id, app_id, starter_seeded_at, created_at, updated_at)
select telegram_user_id, 'en', starter_seeded_at, created_at, updated_at
from memento.app_users;

alter table memento.vocabulary_items
  add column app_id text not null default 'en' check (app_id in ('en', 'cz'));
alter table memento.rounds
  add column app_id text not null default 'en' check (app_id in ('en', 'cz'));
alter table memento.generation_usage
  add column app_id text not null default 'en' check (app_id in ('en', 'cz'));

alter table memento.vocabulary_items
  drop constraint vocabulary_items_user_id_normalized_term_key,
  add constraint vocabulary_items_user_app_normalized_term_key
    unique (user_id, app_id, normalized_term);

alter table memento.generation_usage
  drop constraint generation_usage_pkey,
  add primary key (user_id, app_id, usage_date);

drop index memento.rounds_one_open_per_user_idx;
create unique index rounds_one_open_per_user_app_idx
  on memento.rounds (user_id, app_id)
  where status in ('preparing', 'active');

drop index memento.vocabulary_items_user_status_idx;
create index vocabulary_items_user_app_status_idx
  on memento.vocabulary_items (user_id, app_id, status, is_removed);
drop index memento.rounds_user_created_idx;
create index rounds_user_app_created_idx
  on memento.rounds (user_id, app_id, created_at desc);

alter table memento.user_apps enable row level security;
revoke all on table memento.user_apps from anon, authenticated;
grant select, insert, update, delete on table memento.user_apps to service_role;

create or replace function memento.reserve_generation_attempt(
  requested_user_id bigint,
  requested_app_id text,
  requested_date date
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_attempts integer;
begin
  if requested_app_id not in ('en', 'cz') then
    raise exception 'INVALID_APP';
  end if;

  insert into memento.generation_usage (user_id, app_id, usage_date, attempts)
  values (requested_user_id, requested_app_id, requested_date, 1)
  on conflict (user_id, app_id, usage_date) do update
    set attempts = memento.generation_usage.attempts + 1,
        updated_at = now()
    where memento.generation_usage.attempts < 5
  returning attempts into next_attempts;

  return next_attempts is not null;
end;
$$;

create or replace function memento.reserve_generation_attempt(
  requested_user_id bigint,
  requested_date date
) returns boolean
language sql
security invoker
set search_path = ''
as $$
  select memento.reserve_generation_attempt(requested_user_id, 'en', requested_date);
$$;

create or replace function memento.import_vocabulary_items(
  requested_user_id bigint,
  requested_app_id text,
  requested_items jsonb
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_count integer;
  additional_count integer;
  imported_count integer;
begin
  if requested_app_id not in ('en', 'cz') then
    raise exception 'INVALID_APP';
  end if;
  if requested_items is null
     or jsonb_typeof(requested_items) <> 'array'
     or jsonb_array_length(requested_items) < 1
     or jsonb_array_length(requested_items) > 50 then
    raise exception 'INVALID_IMPORT';
  end if;
  if exists (
    select 1 from jsonb_array_elements(requested_items) as item
    where jsonb_typeof(item) <> 'object'
  ) then
    raise exception 'INVALID_IMPORT';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(requested_items) as item(term text, definition text)
    where item.term is null or item.definition is null
       or char_length(btrim(item.term)) not between 1 and 35
       or char_length(btrim(item.definition)) not between 1 and 45
  ) then
    raise exception 'INVALID_IMPORT';
  end if;
  if (
    select count(*)
    from jsonb_to_recordset(requested_items) as item(term text, definition text)
  ) <> (
    select count(distinct lower(btrim(item.term)))
    from jsonb_to_recordset(requested_items) as item(term text, definition text)
  ) then
    raise exception 'DUPLICATE_IMPORT_TERM';
  end if;

  perform 1 from memento.user_apps
  where user_id = requested_user_id and app_id = requested_app_id
  for update;
  if not found then raise exception 'USER_NOT_FOUND'; end if;

  select count(*) into current_count
  from memento.vocabulary_items
  where user_id = requested_user_id
    and app_id = requested_app_id
    and not is_removed;

  select count(*) into additional_count
  from jsonb_to_recordset(requested_items) as item(term text, definition text)
  left join memento.vocabulary_items existing
    on existing.user_id = requested_user_id
   and existing.app_id = requested_app_id
   and existing.normalized_term = lower(btrim(item.term))
  where existing.id is null or existing.is_removed;

  if current_count + additional_count > 500 then
    raise exception 'VOCABULARY_LIMIT_EXCEEDED';
  end if;

  with imported as (
    insert into memento.vocabulary_items (
      user_id, app_id, term, definition, status, is_removed
    )
    select requested_user_id, requested_app_id, btrim(item.term),
      btrim(item.definition), 'learning', false
    from jsonb_to_recordset(requested_items) as item(term text, definition text)
    on conflict (user_id, app_id, normalized_term) do update
      set term = excluded.term,
          definition = excluded.definition,
          status = 'learning',
          is_removed = false,
          updated_at = now()
    returning id
  ), reset_states as (
    insert into memento.scheduling_states (
      vocabulary_id, repetitions, consecutive_correct, interval_days,
      ease_factor, next_review_at, last_reviewed_at, updated_at
    )
    select id, 0, 0, 0, 2.50, null, null, now() from imported
    on conflict (vocabulary_id) do update
      set repetitions = 0,
          consecutive_correct = 0,
          interval_days = 0,
          ease_factor = 2.50,
          next_review_at = null,
          last_reviewed_at = null,
          updated_at = now()
    returning vocabulary_id
  )
  select count(*) into imported_count from reset_states;

  return imported_count;
end;
$$;

create or replace function memento.import_vocabulary_items(
  requested_user_id bigint,
  requested_items jsonb
) returns integer
language sql
security invoker
set search_path = ''
as $$
  select memento.import_vocabulary_items(requested_user_id, 'en', requested_items);
$$;

create or replace function memento.reset_vocabulary(
  requested_user_id bigint,
  requested_app_id text
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if requested_app_id not in ('en', 'cz') then
    raise exception 'INVALID_APP';
  end if;
  perform 1 from memento.user_apps
  where user_id = requested_user_id and app_id = requested_app_id
  for update;
  if not found then raise exception 'USER_NOT_FOUND'; end if;

  delete from memento.rounds
  where user_id = requested_user_id and app_id = requested_app_id;
  delete from memento.vocabulary_items
  where user_id = requested_user_id and app_id = requested_app_id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function memento.reset_vocabulary(
  requested_user_id bigint
) returns integer
language sql
security invoker
set search_path = ''
as $$
  select memento.reset_vocabulary(requested_user_id, 'en');
$$;

revoke all on function memento.reserve_generation_attempt(bigint, text, date)
  from public, anon, authenticated;
revoke all on function memento.import_vocabulary_items(bigint, text, jsonb)
  from public, anon, authenticated;
revoke all on function memento.reset_vocabulary(bigint, text)
  from public, anon, authenticated;
grant execute on function memento.reserve_generation_attempt(bigint, text, date)
  to service_role;
grant execute on function memento.import_vocabulary_items(bigint, text, jsonb)
  to service_role;
grant execute on function memento.reset_vocabulary(bigint, text)
  to service_role;

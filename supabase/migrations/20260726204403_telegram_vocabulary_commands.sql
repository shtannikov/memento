create or replace function memento.import_vocabulary_items(
  requested_user_id bigint,
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
  if requested_items is null
     or jsonb_typeof(requested_items) <> 'array'
     or jsonb_array_length(requested_items) < 1
     or jsonb_array_length(requested_items) > 50 then
    raise exception 'INVALID_IMPORT';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(requested_items) as item
    where jsonb_typeof(item) <> 'object'
  ) then
    raise exception 'INVALID_IMPORT';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(requested_items)
      as item(term text, definition text)
    where item.term is null
       or item.definition is null
       or char_length(btrim(item.term)) not between 1 and 35
       or char_length(btrim(item.definition)) not between 1 and 45
  ) then
    raise exception 'INVALID_IMPORT';
  end if;

  if (
    select count(*)
    from jsonb_to_recordset(requested_items)
      as item(term text, definition text)
  ) <> (
    select count(distinct lower(btrim(item.term)))
    from jsonb_to_recordset(requested_items)
      as item(term text, definition text)
  ) then
    raise exception 'DUPLICATE_IMPORT_TERM';
  end if;

  perform 1
  from memento.app_users
  where telegram_user_id = requested_user_id
  for update;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  select count(*) into current_count
  from memento.vocabulary_items
  where user_id = requested_user_id
    and not is_removed;

  select count(*) into additional_count
  from jsonb_to_recordset(requested_items)
    as item(term text, definition text)
  left join memento.vocabulary_items existing
    on existing.user_id = requested_user_id
   and existing.normalized_term = lower(btrim(item.term))
  where existing.id is null or existing.is_removed;

  if current_count + additional_count > 500 then
    raise exception 'VOCABULARY_LIMIT_EXCEEDED';
  end if;

  with imported as (
    insert into memento.vocabulary_items (
      user_id,
      term,
      definition,
      status,
      is_removed
    )
    select
      requested_user_id,
      btrim(item.term),
      btrim(item.definition),
      'learning',
      false
    from jsonb_to_recordset(requested_items)
      as item(term text, definition text)
    on conflict (user_id, normalized_term) do update
      set term = excluded.term,
          definition = excluded.definition,
          status = 'learning',
          is_removed = false,
          updated_at = now()
    returning id
  ), reset_states as (
    insert into memento.scheduling_states (
      vocabulary_id,
      repetitions,
      consecutive_correct,
      interval_days,
      ease_factor,
      next_review_at,
      last_reviewed_at,
      updated_at
    )
    select
      id,
      0,
      0,
      0,
      2.50,
      null,
      null,
      now()
    from imported
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

create or replace function memento.reset_vocabulary(
  requested_user_id bigint
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  perform 1
  from memento.app_users
  where telegram_user_id = requested_user_id
  for update;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  delete from memento.rounds
  where user_id = requested_user_id;

  delete from memento.vocabulary_items
  where user_id = requested_user_id;
  get diagnostics deleted_count = row_count;

  return deleted_count;
end;
$$;

revoke all on function memento.import_vocabulary_items(bigint, jsonb)
  from public, anon, authenticated;
revoke all on function memento.reset_vocabulary(bigint)
  from public, anon, authenticated;
grant execute on function memento.import_vocabulary_items(bigint, jsonb)
  to service_role;
grant execute on function memento.reset_vocabulary(bigint)
  to service_role;

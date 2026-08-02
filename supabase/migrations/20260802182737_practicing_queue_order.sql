create or replace function memento.reorder_practicing_vocabulary(
  requested_user_id bigint,
  requested_app_id text,
  requested_vocabulary_ids bigint[],
  reordered_at timestamptz default now()
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected_count integer;
  matching_count integer;
  unique_count integer;
  updated_count integer;
begin
  if requested_vocabulary_ids is null
    or cardinality(requested_vocabulary_ids) > 500
    or array_position(requested_vocabulary_ids, null) is not null then
    raise exception 'INVALID_PRACTICING_ORDER';
  end if;

  perform 1
  from memento.user_apps
  where user_id = requested_user_id and app_id = requested_app_id
  for update;
  if not found then raise exception 'USER_NOT_FOUND'; end if;

  select count(*) into expected_count
  from memento.vocabulary_items
  where user_id = requested_user_id
    and app_id = requested_app_id
    and status = 'practicing'
    and not is_removed;

  select count(distinct vocabulary_id) into unique_count
  from unnest(requested_vocabulary_ids) as vocabulary_id;

  select count(*) into matching_count
  from memento.vocabulary_items
  where id = any(requested_vocabulary_ids)
    and user_id = requested_user_id
    and app_id = requested_app_id
    and status = 'practicing'
    and not is_removed;

  if cardinality(requested_vocabulary_ids) <> expected_count
    or unique_count <> expected_count
    or matching_count <> expected_count then
    raise exception 'INVALID_PRACTICING_ORDER';
  end if;

  update memento.speaking_states as state
  set practice_rank = requested.rank * 1024,
      updated_at = reordered_at
  from unnest(requested_vocabulary_ids) with ordinality
    as requested(vocabulary_id, rank)
  where state.vocabulary_id = requested.vocabulary_id;

  get diagnostics updated_count = row_count;
  if updated_count <> expected_count then
    raise exception 'INVALID_PRACTICING_ORDER';
  end if;
end;
$$;

create or replace function memento.return_vocabulary_to_learning(
  requested_vocabulary_id bigint,
  requested_user_id bigint,
  requested_app_id text,
  returned_at timestamptz default now()
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target memento.vocabulary_items%rowtype;
begin
  select * into target
  from memento.vocabulary_items
  where id = requested_vocabulary_id
    and user_id = requested_user_id
    and app_id = requested_app_id
    and not is_removed
  for update;

  if not found then raise exception 'VOCABULARY_NOT_FOUND'; end if;
  if target.status <> 'practicing' then return false; end if;

  update memento.vocabulary_items
  set status = 'learning', updated_at = returned_at
  where id = target.id;

  insert into memento.scheduling_states (
    vocabulary_id,
    repetitions,
    consecutive_correct,
    interval_days,
    ease_factor,
    next_review_at,
    last_reviewed_at,
    updated_at
  ) values (
    target.id, 0, 0, 0, 2.5, null, null, returned_at
  ) on conflict (vocabulary_id) do update
    set repetitions = 0,
        consecutive_correct = 0,
        interval_days = 0,
        ease_factor = 2.5,
        next_review_at = null,
        last_reviewed_at = null,
        updated_at = returned_at;

  delete from memento.speaking_states
  where vocabulary_id = target.id;

  return true;
end;
$$;

revoke all on function memento.reorder_practicing_vocabulary(
  bigint, text, bigint[], timestamptz
) from public, anon, authenticated;
revoke all on function memento.return_vocabulary_to_learning(
  bigint, bigint, text, timestamptz
) from public, anon, authenticated;
grant execute on function memento.reorder_practicing_vocabulary(
  bigint, text, bigint[], timestamptz
) to service_role;
grant execute on function memento.return_vocabulary_to_learning(
  bigint, bigint, text, timestamptz
) to service_role;

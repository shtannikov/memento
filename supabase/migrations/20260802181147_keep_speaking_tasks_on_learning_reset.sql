create or replace function memento.prepare_learning_reset(
  requested_user_id bigint,
  requested_app_id text,
  requested_at timestamptz default now()
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item_count integer;
begin
  perform 1 from memento.user_apps
  where user_id = requested_user_id and app_id = requested_app_id
  for update;
  if not found then raise exception 'USER_NOT_FOUND'; end if;

  select count(*) into item_count
  from memento.vocabulary_items
  where user_id = requested_user_id and app_id = requested_app_id
    and status = 'learning' and not is_removed;

  insert into memento.pending_resets (
    user_id, app_id, learning_count, has_open_task, requested_at, expires_at
  ) values (
    requested_user_id, requested_app_id, item_count, false,
    requested_at, requested_at + interval '10 minutes'
  ) on conflict (user_id, app_id) do update
    set learning_count = excluded.learning_count,
        has_open_task = false,
        requested_at = excluded.requested_at,
        expires_at = excluded.expires_at;

  return jsonb_build_object('learningCount', item_count);
end;
$$;

create or replace function memento.confirm_learning_reset(
  requested_user_id bigint,
  requested_app_id text,
  confirmed_at timestamptz default now()
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  pending memento.pending_resets%rowtype;
  removed_count integer;
begin
  select * into pending from memento.pending_resets
  where user_id = requested_user_id and app_id = requested_app_id
  for update;
  if not found or pending.expires_at < confirmed_at then
    delete from memento.pending_resets
    where user_id = requested_user_id and app_id = requested_app_id;
    raise exception 'RESET_CONFIRMATION_EXPIRED';
  end if;

  update memento.rounds
  set status = 'cancelled', completed_at = confirmed_at
  where user_id = requested_user_id and app_id = requested_app_id
    and status in ('preparing', 'active');

  update memento.vocabulary_items
  set is_removed = true, updated_at = confirmed_at
  where user_id = requested_user_id and app_id = requested_app_id
    and status = 'learning' and not is_removed;
  get diagnostics removed_count = row_count;

  delete from memento.pending_resets
  where user_id = requested_user_id and app_id = requested_app_id;

  return jsonb_build_object('learningCount', removed_count);
end;
$$;

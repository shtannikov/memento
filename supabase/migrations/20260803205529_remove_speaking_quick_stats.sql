drop function memento.complete_speaking_task(
  uuid, bigint, text, bigint, bigint, text, jsonb, jsonb, text, timestamptz
);

update memento.speaking_lessons
set evaluation = evaluation - 'rubric'
where evaluation ? 'rubric';

alter table memento.speaking_lessons
drop column speech_stats;

create function memento.complete_speaking_task(
  requested_task_id uuid,
  requested_user_id bigint,
  requested_app_id text,
  incoming_chat_id bigint,
  incoming_message_id bigint,
  requested_transcript text,
  requested_evaluation jsonb,
  requested_feedback_html text,
  finished_at timestamptz default now()
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_task memento.speaking_tasks%rowtype;
  usage_record record;
  new_correct integer;
  next_rank bigint;
begin
  select * into target_task from memento.speaking_tasks
  where id = requested_task_id
    and user_id = requested_user_id
    and app_id = requested_app_id
  for update;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  if target_task.status = 'completed' then
    return jsonb_build_object('alreadyCompleted', true);
  end if;
  if target_task.status <> 'active' then raise exception 'TASK_STALE'; end if;
  if jsonb_typeof(requested_evaluation->'requiredPhraseUsage') <> 'array' then
    raise exception 'INVALID_EVALUATION';
  end if;

  if (
    select count(*) from jsonb_to_recordset(requested_evaluation->'requiredPhraseUsage')
      as usage("vocabularyId" text, status text)
  ) <> (
    select count(*) from memento.speaking_task_items where task_id = requested_task_id
  ) then raise exception 'INVALID_EVALUATION'; end if;

  insert into memento.speaking_lessons (
    task_id, chat_id, message_id, transcript, transcript_expires_at,
    evaluation, feedback_html, created_at
  ) values (
    requested_task_id, incoming_chat_id, incoming_message_id,
    requested_transcript, finished_at + interval '30 days',
    coalesce(requested_evaluation, '{}'::jsonb),
    requested_feedback_html, finished_at
  );

  select coalesce(max(state.practice_rank), 0) into next_rank
  from memento.speaking_states state
  join memento.vocabulary_items item on item.id = state.vocabulary_id
  where item.user_id = requested_user_id
    and item.app_id = requested_app_id
    and item.status = 'practicing'
    and not item.is_removed;

  for usage_record in
    select item.vocabulary_id,
      coalesce(usage.status, 'missed') as status
    from memento.speaking_task_items item
    left join jsonb_to_recordset(requested_evaluation->'requiredPhraseUsage')
      as usage("vocabularyId" text, status text)
      on usage."vocabularyId" = item.vocabulary_id::text
    where item.task_id = requested_task_id
  loop
    next_rank := next_rank + 1024;
    update memento.speaking_states
    set practice_rank = next_rank,
        correct_uses = correct_uses + case when usage_record.status = 'used_correctly' then 1 else 0 end,
        incorrect_uses = incorrect_uses + case when usage_record.status = 'used_incorrectly' then 1 else 0 end,
        missed = missed + case when usage_record.status = 'missed' then 1 else 0 end,
        first_seen_at = coalesce(first_seen_at, finished_at),
        last_seen_at = finished_at,
        last_used_at = case when usage_record.status = 'used_correctly' then finished_at else last_used_at end,
        updated_at = finished_at
    where vocabulary_id = usage_record.vocabulary_id
    returning correct_uses into new_correct;

    if new_correct >= 3 then
      update memento.vocabulary_items
      set status = 'learned', updated_at = finished_at
      where id = usage_record.vocabulary_id
        and user_id = requested_user_id and app_id = requested_app_id
        and status = 'practicing' and not is_removed;
    end if;
  end loop;

  update memento.speaking_tasks
  set status = 'completed', completed_at = finished_at
  where id = requested_task_id;

  return jsonb_build_object('alreadyCompleted', false);
end;
$$;

revoke all on function memento.complete_speaking_task(
  uuid, bigint, text, bigint, bigint, text, jsonb, text, timestamptz
) from public, anon, authenticated;

grant execute on function memento.complete_speaking_task(
  uuid, bigint, text, bigint, bigint, text, jsonb, text, timestamptz
) to service_role;

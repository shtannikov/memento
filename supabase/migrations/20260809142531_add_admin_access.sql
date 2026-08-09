create table memento.admin_users (
  telegram_user_id bigint primary key check (telegram_user_id > 0),
  created_at timestamptz not null default now()
);

alter table memento.admin_users enable row level security;
revoke all on table memento.admin_users from public, anon, authenticated;
grant select on table memento.admin_users to service_role;

create function memento.admin_list_user_app_stats(
  requested_date date default (timezone('utc', now()))::date
) returns table (
  telegram_user_id bigint,
  app_id text,
  username text,
  first_name text,
  last_name text,
  joined_at timestamptz,
  last_used_at timestamptz,
  vocabulary_total bigint,
  vocabulary_learning bigint,
  vocabulary_practicing bigint,
  vocabulary_learned bigint,
  quizzes_completed bigint,
  last_quiz_completed_at timestamptz,
  speaking_completed bigint,
  last_speaking_completed_at timestamptz,
  quiz_attempts_today integer,
  speaking_attempts_today bigint
)
language sql
security invoker
set search_path = ''
as $$
  select
    users.telegram_user_id,
    user_app.app_id,
    users.username,
    users.first_name,
    users.last_name,
    user_app.created_at as joined_at,
    user_app.updated_at as last_used_at,
    coalesce(vocabulary.total, 0) as vocabulary_total,
    coalesce(vocabulary.learning, 0) as vocabulary_learning,
    coalesce(vocabulary.practicing, 0) as vocabulary_practicing,
    coalesce(vocabulary.learned, 0) as vocabulary_learned,
    coalesce(quizzes.completed, 0) as quizzes_completed,
    quizzes.last_completed_at as last_quiz_completed_at,
    coalesce(speaking.completed, 0) as speaking_completed,
    speaking.last_completed_at as last_speaking_completed_at,
    coalesce(quiz_usage.attempts, 0) as quiz_attempts_today,
    coalesce(speaking_usage.attempts, 0) as speaking_attempts_today
  from memento.user_apps as user_app
  join memento.app_users as users
    on users.telegram_user_id = user_app.user_id
  left join lateral (
    select
      count(*) as total,
      count(*) filter (where item.status = 'learning') as learning,
      count(*) filter (where item.status = 'practicing') as practicing,
      count(*) filter (where item.status = 'learned') as learned
    from memento.vocabulary_items as item
    where item.user_id = user_app.user_id
      and item.app_id = user_app.app_id
      and not item.is_removed
  ) as vocabulary on true
  left join lateral (
    select
      count(*) as completed,
      max(round.completed_at) as last_completed_at
    from memento.rounds as round
    where round.user_id = user_app.user_id
      and round.app_id = user_app.app_id
      and round.status = 'succeeded'
  ) as quizzes on true
  left join lateral (
    select
      count(*) as completed,
      max(task.completed_at) as last_completed_at
    from memento.speaking_tasks as task
    where task.user_id = user_app.user_id
      and task.app_id = user_app.app_id
      and task.status = 'completed'
  ) as speaking on true
  left join memento.generation_usage as quiz_usage
    on quiz_usage.user_id = user_app.user_id
   and quiz_usage.app_id = user_app.app_id
   and quiz_usage.usage_date = requested_date
  left join lateral (
    select count(*) as attempts
    from memento.speaking_tasks as task
    where task.user_id = user_app.user_id
      and task.app_id = user_app.app_id
      and task.task_date = requested_date
  ) as speaking_usage on true
  order by user_app.updated_at desc, users.telegram_user_id, user_app.app_id;
$$;

create function memento.admin_reset_daily_limits(
  requested_user_id bigint,
  requested_app_id text,
  requested_date date default (timezone('utc', now()))::date
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  quiz_attempts integer := 0;
  speaking_attempts integer := 0;
begin
  perform 1
  from memento.user_apps
  where user_id = requested_user_id
    and app_id = requested_app_id
  for update;

  if not found then
    raise exception 'USER_APP_NOT_FOUND';
  end if;

  delete from memento.generation_usage
  where user_id = requested_user_id
    and app_id = requested_app_id
    and usage_date = requested_date
  returning attempts into quiz_attempts;

  update memento.speaking_tasks
  set task_date = requested_date - 1
  where user_id = requested_user_id
    and app_id = requested_app_id
    and task_date = requested_date;
  get diagnostics speaking_attempts = row_count;

  return jsonb_build_object(
    'quizAttemptsReset', coalesce(quiz_attempts, 0),
    'speakingAttemptsReset', speaking_attempts
  );
end;
$$;

revoke all on function memento.admin_list_user_app_stats(date)
  from public, anon, authenticated;
revoke all on function memento.admin_reset_daily_limits(bigint, text, date)
  from public, anon, authenticated;
grant execute on function memento.admin_list_user_app_stats(date)
  to service_role;
grant execute on function memento.admin_reset_daily_limits(bigint, text, date)
  to service_role;

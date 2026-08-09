drop function memento.admin_list_user_app_stats(date);

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
  quiz_failures_total bigint,
  quiz_failures_today bigint,
  last_quiz_completed_at timestamptz,
  speaking_completed bigint,
  speaking_failures_total bigint,
  speaking_failures_today bigint,
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
    coalesce(quizzes.failed, 0) as quiz_failures_total,
    coalesce(quizzes.failed_today, 0) as quiz_failures_today,
    quizzes.last_completed_at as last_quiz_completed_at,
    coalesce(speaking.completed, 0) as speaking_completed,
    coalesce(speaking.failed, 0) as speaking_failures_total,
    coalesce(speaking.failed_today, 0) as speaking_failures_today,
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
      count(*) filter (where round.status = 'succeeded') as completed,
      count(*) filter (where round.status = 'failed') as failed,
      count(*) filter (
        where round.status = 'failed'
          and round.created_at >= (requested_date::timestamp at time zone 'utc')
          and round.created_at < ((requested_date + 1)::timestamp at time zone 'utc')
      ) as failed_today,
      max(round.completed_at) filter (where round.status = 'succeeded') as last_completed_at
    from memento.rounds as round
    where round.user_id = user_app.user_id
      and round.app_id = user_app.app_id
  ) as quizzes on true
  left join lateral (
    select
      count(*) filter (where task.status = 'completed') as completed,
      count(*) filter (where task.status = 'failed') as failed,
      count(*) filter (
        where task.status = 'failed'
          and task.created_at >= (requested_date::timestamp at time zone 'utc')
          and task.created_at < ((requested_date + 1)::timestamp at time zone 'utc')
      ) as failed_today,
      max(task.completed_at) filter (where task.status = 'completed') as last_completed_at
    from memento.speaking_tasks as task
    where task.user_id = user_app.user_id
      and task.app_id = user_app.app_id
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

revoke all on function memento.admin_list_user_app_stats(date)
  from public, anon, authenticated;
grant execute on function memento.admin_list_user_app_stats(date)
  to service_role;

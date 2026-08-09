# Memento Admin

The admin Mini App is implemented in this folder. Next.js route entrypoints live
under `src/app/(admin)` and contain no business logic.

## Access

Add an administrator separately in each Supabase environment:

```sql
insert into memento.admin_users (telegram_user_id)
values (123456789)
on conflict (telegram_user_id) do nothing;
```

Remove access by deleting that exact ID from `memento.admin_users`.

Set the server-only `TELEGRAM_ADMIN_BOT_TOKEN` in Vercel Preview and Production.
Stage uses its own bot token; Production must never reuse it. The existing
`npm run stage:telegram` command points the Stage admin bot menu button at the
current Preview `/admin` route.

## Daily limit reset

Quiz usage is removed for the selected UTC date. Speaking tasks are retained,
but their `task_date` quota bucket is moved to the previous date. Their real
history continues to use `created_at` and `completed_at`; lessons and learning
progress are not changed.

alter table memento.speaking_tasks
  drop constraint speaking_tasks_status_check;

alter table memento.speaking_tasks
  add constraint speaking_tasks_status_check
  check (status in (
    'preparing',
    'ready',
    'active',
    'completed',
    'failed',
    'superseded'
  ));

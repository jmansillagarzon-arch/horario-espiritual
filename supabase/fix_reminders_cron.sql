-- Corrige el cron job de recordatorios (la vez anterior quedó con placeholders)

select cron.unschedule('horario-espiritual-recordatorios');

select cron.schedule(
  'horario-espiritual-recordatorios',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://horario-espiritual-theta.vercel.app/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer hE9x7Kp2qL5vN8wR3tY6mZ1jF4bC0dA')
  );
  $$
);

-- Verificación: debería aparecer una fila con tu URL y schedule correctos
select jobname, schedule, command from cron.job where jobname = 'horario-espiritual-recordatorios';

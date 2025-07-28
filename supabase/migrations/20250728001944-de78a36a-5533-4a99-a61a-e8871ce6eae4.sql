-- Habilitar extensão pg_cron para agendamento de tarefas
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilitar extensão pg_net para requisições HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar cron job para cancelar pedidos PIX expirados a cada 5 minutos
SELECT cron.schedule(
  'cancel-expired-pix-reservations',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT cancel_expired_pix_reservations();
  $$
);
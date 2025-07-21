-- Atualizar a reserva específica para status pago
UPDATE bookings 
SET status = 'paid', 
    updated_at = now()
WHERE id = '591c9e83-4fab-49ed-9740-3fe6f195580d';
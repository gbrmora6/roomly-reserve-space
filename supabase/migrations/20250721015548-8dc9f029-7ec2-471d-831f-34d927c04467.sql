-- Atualizar ordem específica com TID fictício para teste
UPDATE orders 
SET click2pay_tid = 'test-tid-04874133', 
    external_identifier = '04874133',
    updated_at = now()
WHERE id = '0731d7e1-7b23-4f53-8158-7c0104874133';

-- Atualizar status para pago e confirmar carrinho
UPDATE orders 
SET status = 'paid',
    updated_at = now()
WHERE id = '0731d7e1-7b23-4f53-8158-7c0104874133';

-- Confirmar carrinho para o usuário
SELECT confirm_cart_payment('60a30a40-9bad-4e74-9c17-fbeab5947a24', '0731d7e1-7b23-4f53-8158-7c0104874133');
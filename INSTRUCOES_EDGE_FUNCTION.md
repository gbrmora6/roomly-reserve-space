# Instruções para Corrigir Edge Function Click2Pay Manualmente

## Problema Identificado

O problema estava no arquivo `fix_click2pay_edge_function.sql` que continha URLs incorretas da API Click2Pay:

### URLs Incorretas (ANTES):
- `https://api.click2pay.com.br/qr/boleto/` ❌
- `https://api.click2pay.com.br/pdf/boleto/` ❌  
- `https://api.click2pay.com.br/qr/pix/` ❌

### URLs Corretas (DEPOIS):
- `https://apisandbox.click2pay.com.br/v1/transactions/boleto/` ✅
- `https://apisandbox.click2pay.com.br/v1/transactions/boleto/{id}/pdf` ✅
- `https://apisandbox.click2pay.com.br/v1/transactions/pix/{id}/qr` ✅

## Correções Aplicadas

1. **Endpoint do Boleto QR Code:**
   - De: `https://api.click2pay.com.br/qr/boleto/`
   - Para: `https://apisandbox.click2pay.com.br/v1/transactions/boleto/`

2. **Endpoint do Boleto PDF:**
   - De: `https://api.click2pay.com.br/pdf/boleto/`
   - Para: `https://apisandbox.click2pay.com.br/v1/transactions/boleto/{id}/pdf`

3. **Endpoint do PIX QR Code:**
   - De: `https://api.click2pay.com.br/qr/pix/`
   - Para: `https://apisandbox.click2pay.com.br/v1/transactions/pix/{id}/qr`

## Status da Correção

✅ **CORRIGIDO**: O arquivo `fix_click2pay_edge_function.sql` foi atualizado com os endpoints corretos da API Click2Pay sandbox.

## Próximos Passos

1. Execute o arquivo SQL corrigido no Supabase Dashboard
2. Teste a funcionalidade de pagamento
3. Verifique se os URLs gerados agora estão corretos

## Observações Importantes

- Os endpoints agora seguem o padrão oficial da API Click2Pay v1
- Utiliza o ambiente sandbox (`apisandbox.click2pay.com.br`)
- Mantém compatibilidade com a estrutura existente do banco de dados
- A Edge Function TypeScript (`supabase/functions/click2pay-integration/index.ts`) já estava correta

## 📋 Passo a Passo

### 1. Executar o Script SQL
1. Abra o **Supabase Dashboard**
2. Vá para **SQL Editor**
3. Cole o conteúdo do arquivo `fix_click2pay_edge_function.sql`
4. Execute o script completo

### 2. Verificar se as Tabelas Existem
Antes de executar, certifique-se de que estas tabelas existem:
- `orders`
- `order_items` 
- `profiles`
- `cart_items`

### 3. Testar a Função

#### Teste Básico:
```sql
SELECT handle_click2pay_request();
```

#### Teste com Dados Personalizados:
```sql
SELECT click2pay_integration('{
    "action": "create-checkout",
    "userId": "593d531c-75c3-4945-a608-88586de39da0",
    "paymentMethod": "boleto",
    "paymentData": {
        "nomeCompleto": "Gabriel Moraes Teste",
        "cpfCnpj": "12345678901",
        "telefone": "73999999999",
        "email": "gabriel_moraes1997@outlook.com",
        "dataNascimento": "1997-01-01",
        "rua": "Rua Teste",
        "numero": "123",
        "complemento": "Apto 1",
        "bairro": "Centro",
        "cidade": "Almadina",
        "estado": "BA",
        "cep": "45640-000"
    }
}');
```

#### Teste PIX:
```sql
SELECT click2pay_integration('{
    "action": "create-checkout",
    "userId": "593d531c-75c3-4945-a608-88586de39da0",
    "paymentMethod": "pix",
    "paymentData": {
        "nomeCompleto": "Gabriel Moraes Teste",
        "cpfCnpj": "12345678901",
        "email": "gabriel_moraes1997@outlook.com"
    }
}');
```

### 4. Verificar Resultados

#### Verificar Ordem Criada:
```sql
SELECT * FROM orders 
WHERE user_id = '593d531c-75c3-4945-a608-88586de39da0' 
ORDER BY created_at DESC 
LIMIT 5;
```

#### Verificar Itens da Ordem:
```sql
SELECT oi.*, o.total_amount, o.status 
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.user_id = '593d531c-75c3-4945-a608-88586de39da0'
ORDER BY o.created_at DESC;
```

#### Verificar Detalhes de Pagamento:
```sql
SELECT pd.*, o.payment_method, o.status
FROM payment_details pd
JOIN orders o ON o.id = pd.order_id
WHERE o.user_id = '593d531c-75c3-4945-a608-88586de39da0'
ORDER BY pd.created_at DESC;
```

### 5. Integração com Frontend

Para usar esta função no lugar da Edge Function, você pode:

#### Opção 1: Chamar via RPC do Supabase
```javascript
const { data, error } = await supabase.rpc('click2pay_integration', {
  request_body: JSON.stringify({
    action: 'create-checkout',
    userId: userId,
    paymentMethod: 'boleto',
    paymentData: paymentData
  })
});
```

#### Opção 2: Criar uma Edge Function Simples
Crie uma nova Edge Function que apenas chama a função SQL:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  const requestBody = await req.text()
  
  const { data, error } = await supabase.rpc('click2pay_integration', {
    request_body: requestBody
  })
  
  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  return new Response(data, {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

## 🔧 Troubleshooting

### Erro: "relation does not exist"
- Verifique se todas as tabelas necessárias existem
- Execute as migrações do banco de dados

### Erro: "permission denied"
- Verifique as políticas RLS das tabelas
- Certifique-se de que o usuário tem permissões adequadas

### Erro: "User profile not found"
- Verifique se o userId existe na tabela `profiles`
- Use um userId válido do seu banco de dados

### Erro: "Cart is empty"
- Adicione itens ao carrinho antes de testar
- Use a função `get_cart()` para verificar o carrinho

## 📝 Notas Importantes

1. **Esta é uma solução temporária** até que a Edge Function seja corrigida
2. **Dados simulados**: A função gera dados simulados da API Click2Pay
3. **Teste em ambiente de desenvolvimento** antes de usar em produção
4. **Backup**: Faça backup do banco antes de executar o script
5. **Monitoramento**: Monitore os logs para identificar possíveis problemas

## 🚀 Próximos Passos

1. Testar a função com dados reais
2. Integrar com o frontend
3. Implementar a API real do Click2Pay quando possível
4. Migrar de volta para Edge Function quando o problema for resolvido
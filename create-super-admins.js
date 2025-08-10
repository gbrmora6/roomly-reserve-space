/*
 * Script atualizado para criar usuários super_admin
 * Este script criará dois super_admin conforme solicitado
 */

// Dados dos super admins atualizados com as credenciais solicitadas
const superAdmins = [
  {
    email: 'cpd@sapiens-psi.com.br',
    password: '10671023456g',
    first_name: 'CPD',
    last_name: 'Admin',
    branch_id: '64a43fed-587b-415c-aeac-0abfd7867566' // Default branch
  },
  {
    email: 'anaelisa@sapiens-psi.com.br',
    password: 'Sapiens.123',
    first_name: 'Ana Elisa',
    last_name: 'Admin',
    branch_id: '64a43fed-587b-415c-aeac-0abfd7867566' // Default branch
  }
];

// Para executar este script, você precisa de um token de autenticação de um super_admin existente
const AUTH_TOKEN = 'SUA_TOKEN_AQUI'; // Substitua pela token obtida do login
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaWlkY2Rzdm1xeGRrY2xnZXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NDY3NDksImV4cCI6MjA2MTAyMjc0OX0.Wwc-QQghL_Z7XE4S_VuweP01TCW6id07LZRht6gynAM";

async function createSuperAdmin(userData, authToken) {
  // Add role field to the request
  const requestData = {
    ...userData,
    role: 'super_admin'
  };

  const response = await fetch('https://fgiidcdsvmqxdkclgety.supabase.co/functions/v1/admin-user-mgmt/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify(requestData)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Erro ao criar usuário ${userData.email}: ${result.error}`);
  }
  
  return result;
}

// Função principal
async function main() {
  console.log('Criando usuários super_admin...');
  console.log('⚠️  IMPORTANTE: Certifique-se de que tem um super_admin ativo para obter o token!');
  
  if (AUTH_TOKEN === 'SUA_TOKEN_AQUI') {
    console.log('\n❌ ERRO: Configure o AUTH_TOKEN primeiro!');
    console.log('1. Faça login no sistema como super_admin (cpd@sapiens-psi.com.br já existe)');
    console.log('2. Abra as DevTools do navegador');
    console.log('3. Vá para Application/Local Storage e copie o token do supabase.auth.token');
    console.log('4. Cole o token na variável AUTH_TOKEN neste arquivo');
    console.log('5. Execute novamente: node create-super-admins.js\n');
    return;
  }

  try {
    for (const admin of superAdmins) {
      console.log(`\nCriando usuário: ${admin.email}`);
      
      try {
        const result = await createSuperAdmin(admin, AUTH_TOKEN);
        console.log(`✅ Usuário ${admin.email} criado com sucesso!`);
        console.log(`   - ID: ${result.userId}`);
        
        // Como o Edge Function cria com role 'admin', precisamos alterar para 'super_admin'
        console.log(`⚠️  Agora é necessário atualizar o role para super_admin via SQL`);
        
      } catch (err) {
        if (err.message.includes('User already registered')) {
          console.log(`ℹ️  Usuário ${admin.email} já existe, pulando...`);
        } else {
          console.error(`❌ Erro ao criar ${admin.email}:`, err.message);
        }
      }
    }
    
    console.log('\n🔧 PRÓXIMOS PASSOS:');
    console.log('Execute no console SQL do Supabase:');
    console.log(`UPDATE profiles SET role = 'super_admin' WHERE email IN ('cpd@sapiens-psi.com.br', 'anaelisa@sapiens-psi.com.br');`);
    console.log('\n✅ Processo completo!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

main().catch(console.error);
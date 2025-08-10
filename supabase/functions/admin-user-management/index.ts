import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, DELETE, PUT',
};

interface CreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  branch_id: string;
  role?: 'admin' | 'super_admin';
}

interface UpdateUserRequest {
  userId: string;
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  branch_id?: string;
}

interface DeleteUserRequest {
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl) {
      console.error('Environment variable SUPABASE_URL is missing');
      return new Response(
        JSON.stringify({ success: false, error: 'SUPABASE_URL not configured in Edge Function environment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!supabaseServiceKey) {
      console.error('Environment variable SUPABASE_SERVICE_ROLE_KEY is missing');
      return new Response(
        JSON.stringify({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured in Edge Function environment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!supabaseAnonKey) {
      console.error('Environment variable SUPABASE_ANON_KEY is missing');
      return new Response(
        JSON.stringify({ success: false, error: 'SUPABASE_ANON_KEY not configured in Edge Function environment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Verify super admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData } = await supabaseAuth.auth.getUser(token);
    
    if (!userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not authenticated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is super admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, branch_id')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const isSuperAdmin = profile.role === 'super_admin' || 
      userData.user.email === 'admin@example.com' ||
      userData.user.email === 'cpd@sapiens-psi.com.br';

    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied: Only super administrators can manage admin users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log('Super admin verified, processing request...');

    const method = req.method;
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    if (method === 'POST' && action === 'create') {
      const { email, password, first_name, last_name, branch_id, role }: CreateUserRequest = await req.json();

      // Map requested role to database enum values
      let requestedRole = 'admin';
      if (role === 'super_admin') {
        requestedRole = 'super_admin'; // Use super_admin (with underscore) as it exists in enum
      }

      // Only a real super_admin (by profile.role) can create other super_admins
      if (requestedRole === 'super_admin' && profile.role !== 'super_admin') {
        return new Response(
          JSON.stringify({ success: false, error: 'Access denied: Only super administrators can create other super administrators' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      // Ensure branch_id is a valid UUID string; otherwise omit it to avoid DB trigger cast errors
      const isUuid = (v?: string) => !!v && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
      const metadata: Record<string, any> = {
        first_name,
        last_name,
        role: requestedRole
      };
      if (isUuid(branch_id)) {
        metadata.branch_id = branch_id;
      }

      console.log('Creating new admin user:', { email, first_name, last_name, branch_id: isUuid(branch_id) ? branch_id : '(omitted - invalid UUID)', role: requestedRole });

      // Create user in Auth with email confirmation disabled
      try {
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm email
          user_metadata: metadata
        });

        if (createError) {
          console.error('Error creating user in Auth:', createError);
          console.error('Full createError object:', JSON.stringify(createError, null, 2));
          
          // Handle specific Auth error types
          if (createError.message?.includes('already registered')) {
            return new Response(
              JSON.stringify({ success: false, error: 'User with this email already exists' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
            );
          }
          
          const msg = `Failed to create user: ${createError.message}`;
          const status = typeof (createError as any)?.status === 'number' ? (createError as any).status : 400;
          return new Response(
            JSON.stringify({ success: false, error: msg }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
          );
        }

        const userId = createData.user?.id;
        if (!userId) {
          return new Response(
            JSON.stringify({ success: false, error: 'User ID not returned from Auth creation' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        console.log('User created in Auth successfully:', userId);

        // Create profile in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email,
            first_name,
            last_name,
            branch_id: isUuid(branch_id) ? branch_id : null,
            role: requestedRole,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Try to clean up the Auth user if profile creation fails
          await supabase.auth.admin.deleteUser(userId);
          return new Response(
            JSON.stringify({ success: false, error: `Failed to create user profile: ${profileError.message}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        console.log('Admin user created successfully:', userId);

        return new Response(
          JSON.stringify({
            success: true,
            message: requestedRole === 'super_admin' ? 'Usuário super_admin criado com sucesso' : 'Usuário administrador criado com sucesso',
            userId: userId
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
        
      } catch (authCreateError: any) {
        console.error('Exception during user creation:', authCreateError);
        console.error('Exception stack:', authCreateError.stack);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Auth creation failed: ${authCreateError.message}`,
            details: authCreateError.toString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

    } else if (method === 'PUT' && action === 'update') {
      const { userId, email, password, first_name, last_name, branch_id }: UpdateUserRequest = await req.json();

      console.log('Updating admin user:', { userId, email, first_name, last_name, branch_id });

      // Update user in Auth
      const authUpdateData: any = {};
      if (email) authUpdateData.email = email;
      if (password) authUpdateData.password = password;
      if (first_name || last_name || branch_id) {
        authUpdateData.user_metadata = {
          first_name,
          last_name,
          branch_id,
          role: 'admin'
        };
      }

      if (Object.keys(authUpdateData).length > 0) {
        const { error: authError } = await supabase.auth.admin.updateUserById(userId, authUpdateData);
        if (authError) {
          console.error('Error updating user in Auth:', authError);
          const msg = `Failed to update user: ${authError.message}`;
          const status = typeof (authError as any)?.status === 'number' ? (authError as any).status : 400;
          return new Response(
            JSON.stringify({ success: false, error: msg }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
          );
        }
      }

      // Update profile in profiles table
      const profileUpdateData: any = { updated_at: new Date().toISOString() };
      if (email) profileUpdateData.email = email;
      if (first_name) profileUpdateData.first_name = first_name;
      if (last_name) profileUpdateData.last_name = last_name;
      if (branch_id) profileUpdateData.branch_id = branch_id;

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to update user profile: ${profileError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Admin user updated successfully:', userId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Usuário administrador atualizado com sucesso'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } else if (method === 'DELETE' && action === 'delete') {
      const { userId }: DeleteUserRequest = await req.json();

      console.log('Deleting admin user:', userId);

      // Delete user from Auth (this will cascade to profiles if properly configured)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) {
        console.error('Error deleting user from Auth:', authError);
        const msg = `Failed to delete user: ${authError.message}`;
        const status = typeof (authError as any)?.status === 'number' ? (authError as any).status : 400;
        return new Response(
          JSON.stringify({ success: false, error: msg }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
        );
      }

      // Also delete from profiles table (in case cascade doesn't work)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        // Don't throw error here since Auth deletion was successful
      }

      console.log('Admin user deleted successfully:', userId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Usuário administrador excluído com sucesso'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action or method' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Error in admin user management:', error);

    // Default to 500 but downgrade to more meaningful codes based on message
    const message: string = error?.message || 'Erro interno do servidor';
    let status = 500;
    const msgLower = message.toLowerCase();
    if (msgLower.includes('authorization header missing') || msgLower.includes('not authenticated')) status = 401;
    else if (msgLower.includes('access denied')) status = 403;
    else if (msgLower.includes('invalid') || msgLower.includes('invalid action') || msgLower.includes('bad request')) status = 400;
    else if (msgLower.includes('already')) status = 409;
    else if (msgLower.includes('profile not found')) status = 404;

    return new Response(
      JSON.stringify({
        success: false,
        error: message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
      }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CashPaymentRequest {
  userId: string;
  totalAmount: number;
  paymentData: any;
  couponData?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, totalAmount, paymentData, couponData }: CashPaymentRequest = await req.json();

    console.log('Processing cash payment for admin:', { userId, totalAmount });

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Verify admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: userData } = await supabaseAuth.auth.getUser(token);
    
    if (!userData.user) {
      throw new Error('User not authenticated');
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, branch_id')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      throw new Error('Access denied: Only administrators can process cash payments');
    }

    console.log('Admin verified, processing cash payment...');

    // Start transaction by creating order
    const orderId = crypto.randomUUID();
    
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        user_id: userId,
        total_amount: totalAmount,
        status: 'paid', // Immediately mark as paid for cash
        payment_method: 'dinheiro',
        branch_id: profile.branch_id,
        payment_data: {
          ...paymentData,
          processed_by_admin: userData.user.id,
          processed_at: new Date().toISOString()
        },
        external_identifier: `cash_${Date.now()}_${userId.substring(0, 8)}`
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw new Error('Failed to create order');
    }

    console.log('Order created:', order.id);

    // Create reservations for checkout
    const { data: reservationResult, error: reservationError } = await supabase
      .rpc('create_reservations_for_checkout', {
        p_user_id: userId,
        p_order_id: orderId
      });

    if (reservationError) {
      console.error('Error creating reservations:', reservationError);
      throw new Error('Failed to create reservations');
    }

    console.log('Reservations created successfully');

    // Confirm cart payment (mark reservations as paid)
    const { data: confirmResult, error: confirmError } = await supabase
      .rpc('confirm_cart_payment', {
        p_user_id: userId,
        p_order_id: orderId
      });

    if (confirmError) {
      console.error('Error confirming payment:', confirmError);
      throw new Error('Failed to confirm payment');
    }

    console.log('Payment confirmed successfully');

    // Get cart items to create order items and reduce stock
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId);

    if (cartError) {
      console.error('Error fetching cart items:', cartError);
    }

    // Create order items and reduce product stock
    if (cartItems && cartItems.length > 0) {
      for (const item of cartItems) {
        if (item.item_type === 'product') {
          // Create order item
          await supabase
            .from('order_items')
            .insert({
              order_id: orderId,
              product_id: item.item_id,
              quantity: item.quantity,
              price_per_unit: item.price / item.quantity,
              branch_id: profile.branch_id
            });

          // Reduce product stock
          const { error: stockError } = await supabase
            .from('products')
            .update({
              quantity: supabase.sql`quantity - ${item.quantity}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.item_id);

          if (stockError) {
            console.error('Error reducing stock for product:', item.item_id, stockError);
          }
        }
      }
    }

    // Register coupon usage if applicable
    if (couponData && couponData.couponId) {
      try {
        await supabase
          .from('coupon_usage')
          .insert({
            coupon_id: couponData.couponId,
            user_id: userId,
            branch_id: profile.branch_id,
            discount_applied: couponData.discountAmount,
            order_id: orderId
          });
      } catch (couponError) {
        console.error('Error registering coupon usage:', couponError);
        // Don't fail the payment for coupon errors
      }
    }

    // Clear cart (this will be done by confirm_cart_payment function)
    
    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderId,
        status: 'paid',
        message: 'Pagamento em dinheiro processado com sucesso',
        transactionId: `cash_${Date.now()}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing cash payment:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
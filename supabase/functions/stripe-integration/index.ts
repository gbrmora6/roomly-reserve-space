
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { action, productData, userId, productIds, quantities } = await req.json();

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Switch based on the action requested
    switch (action) {
      case "create-product":
        // Create a product in Stripe
        const stripeProduct = await stripe.products.create({
          name: productData.name,
          description: productData.description || "",
          active: true,
          metadata: {
            model: productData.model || "",
            product_id: productData.id,
          },
        });

        // Create a price for the product
        const stripePrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: Math.round(productData.price * 100), // Convert to cents
          currency: "brl",
        });

        // Update the product in Supabase with Stripe IDs
        const { error: updateError } = await supabase
          .from("products")
          .update({
            stripe_product_id: stripeProduct.id,
            stripe_price_id: stripePrice.id,
          })
          .eq("id", productData.id);

        if (updateError) {
          throw new Error(`Supabase update failed: ${updateError.message}`);
        }

        return new Response(JSON.stringify({ 
          success: true,
          stripeProduct,
          stripePrice
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      
      case "update-product":
        // Check if product exists in Stripe
        if (!productData.stripe_product_id) {
          throw new Error("Product doesn't have a Stripe ID");
        }
        
        // Update product in Stripe
        const updatedStripeProduct = await stripe.products.update(
          productData.stripe_product_id,
          {
            name: productData.name,
            description: productData.description || "",
            metadata: {
              model: productData.model || "",
              product_id: productData.id,
            },
          }
        );
        
        // If price has changed, create a new price and update the product
        const currentPrice = await stripe.prices.retrieve(productData.stripe_price_id);
        const newPriceInCents = Math.round(productData.price * 100);
        
        let updatedStripePrice = currentPrice;
        
        if (currentPrice.unit_amount !== newPriceInCents) {
          // Deactivate old price
          await stripe.prices.update(currentPrice.id, { active: false });
          
          // Create new price
          updatedStripePrice = await stripe.prices.create({
            product: productData.stripe_product_id,
            unit_amount: newPriceInCents,
            currency: "brl",
          });
          
          // Update the price ID in Supabase
          const { error: priceUpdateError } = await supabase
            .from("products")
            .update({ stripe_price_id: updatedStripePrice.id })
            .eq("id", productData.id);
          
          if (priceUpdateError) {
            throw new Error(`Supabase price update failed: ${priceUpdateError.message}`);
          }
        }

        return new Response(JSON.stringify({ 
          success: true,
          stripeProduct: updatedStripeProduct,
          stripePrice: updatedStripePrice,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      case "create-checkout":
        if (!userId || !productIds || !quantities || productIds.length === 0) {
          throw new Error("Missing required parameters");
        }

        // Get user information directly from auth.users instead of profiles
        const { data: userData, error: userError } = await supabase
          .auth.admin.getUserById(userId);

        if (userError || !userData) {
          console.error("Error fetching user data:", userError);
          throw new Error(`Failed to get user: ${userError?.message || "Unknown error"}`);
        }

        const userEmail = userData.user.email;
        
        if (!userEmail) {
          throw new Error("User email not found");
        }

        // Fetch products data from Supabase
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("id, name, price, stripe_price_id")
          .in("id", productIds);

        if (productsError || !productsData) {
          throw new Error(`Error fetching products: ${productsError?.message || "No products found"}`);
        }

        // Check if products have stripe_price_id
        const productsWithoutStripeId = productsData.filter(p => !p.stripe_price_id);
        
        // If any products don't have Stripe IDs, create them now
        if (productsWithoutStripeId.length > 0) {
          for (const product of productsWithoutStripeId) {
            // Get full product data
            const { data: fullProduct } = await supabase
              .from("products")
              .select("*")
              .eq("id", product.id)
              .single();
              
            if (fullProduct) {
              // Create in Stripe
              const stripeProduct = await stripe.products.create({
                name: fullProduct.name,
                description: fullProduct.description || "",
                active: true,
                metadata: {
                  model: fullProduct.model || "",
                  product_id: fullProduct.id,
                },
              });
              
              // Create price
              const stripePrice = await stripe.prices.create({
                product: stripeProduct.id,
                unit_amount: Math.round(fullProduct.price * 100),
                currency: "brl",
              });
              
              // Update in database
              await supabase
                .from("products")
                .update({
                  stripe_product_id: stripeProduct.id,
                  stripe_price_id: stripePrice.id,
                })
                .eq("id", fullProduct.id);
                
              // Update our local copy
              product.stripe_price_id = stripePrice.id;
            }
          }
          
          // Refresh products data after creating Stripe products
          const { data: refreshedProducts } = await supabase
            .from("products")
            .select("id, name, price, stripe_price_id")
            .in("id", productIds);
            
          if (refreshedProducts) {
            productsData.length = 0;
            productsData.push(...refreshedProducts);
          }
        }

        // Create line items for checkout
        const lineItems = productsData.map((product, index) => {
          if (!product.stripe_price_id) {
            throw new Error(`Product ${product.id} does not have a Stripe price ID`);
          }
          
          return {
            price: product.stripe_price_id,
            quantity: quantities[index],
          };
        });

        // Get the URL origin for success and cancel URLs
        const url = new URL(req.url);
        const origin = url.origin || "http://localhost:3000";

        // Create checkout session in Stripe
        const session = await stripe.checkout.sessions.create({
          line_items: lineItems,
          mode: "payment",
          success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/payment-canceled`,
          client_reference_id: userId,
          customer_email: userEmail,
          metadata: {
            userId,
          },
        });

        // Create order in Supabase
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: userId,
            total_amount: productsData.reduce((sum, product, index) => 
              sum + (product.price * quantities[index]), 0),
            stripe_session_id: session.id,
            status: "pending",
          })
          .select("id")
          .single();

        if (orderError || !order) {
          throw new Error(`Error creating order: ${orderError?.message || "Unknown error"}`);
        }

        // Create order items
        const orderItems = productIds.map((productId, index) => {
          const product = productsData.find(p => p.id === productId);
          return {
            order_id: order.id,
            product_id: productId,
            quantity: quantities[index],
            price_per_unit: product?.price || 0,
          };
        });

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          console.error("Error creating order items:", itemsError);
          // We don't throw here to ensure checkout still proceeds
        }

        return new Response(JSON.stringify({ 
          success: true,
          url: session.url,
          sessionId: session.id,
          orderId: order.id,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      case "sync-products":
        // Sync all products to Stripe that don't have a stripe_product_id yet
        const { data: productsToSync, error: syncError } = await supabase
          .from("products")
          .select("*")
          .is("stripe_product_id", null);

        if (syncError) {
          throw new Error(`Error fetching products to sync: ${syncError.message}`);
        }

        if (!productsToSync || productsToSync.length === 0) {
          return new Response(JSON.stringify({ 
            success: true,
            message: "No products to sync"
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        const results = [];
        for (const product of productsToSync) {
          try {
            // Create product in Stripe
            const stripeProduct = await stripe.products.create({
              name: product.name,
              description: product.description || "",
              active: product.is_active,
              metadata: {
                model: product.model || "",
                product_id: product.id,
              },
            });

            // Create price for the product
            const stripePrice = await stripe.prices.create({
              product: stripeProduct.id,
              unit_amount: Math.round(product.price * 100), // Convert to cents
              currency: "brl",
            });

            // Update product with Stripe IDs
            const { error: updateError } = await supabase
              .from("products")
              .update({
                stripe_product_id: stripeProduct.id,
                stripe_price_id: stripePrice.id,
              })
              .eq("id", product.id);

            results.push({
              id: product.id,
              success: !updateError,
              error: updateError?.message,
            });
          } catch (error) {
            results.push({
              id: product.id,
              success: false,
              error: error.message,
            });
          }
        }

        return new Response(JSON.stringify({ 
          success: true,
          results 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      default:
        return new Response(JSON.stringify({ 
          success: false,
          error: "Invalid action"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

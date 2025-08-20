import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Edge Function started - create-checkout-session')
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header provided')
    }
    
    const token = authHeader.replace('Bearer ', '')
    console.log('🔑 Token received, length:', token.length)

    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError) {
      console.error('❌ User authentication error:', userError)
      throw new Error('User authentication failed: ' + userError.message)
    }
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    console.log('✅ User authenticated successfully:', user.id)

    const requestBody = await req.json()
    console.log('📝 Request body:', requestBody)
    
    const { priceId, planId, customerEmail, customerName, customerPhone, successUrl, cancelUrl } = requestBody

    // Validate required fields
    if (!priceId || !planId || !customerEmail) {
      throw new Error('Missing required fields: priceId, planId, customerEmail')
    }

    console.log('🎯 Creating checkout for:', { priceId, planId, customerEmail, customerName })

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }
    
    const stripe = new (await import('https://esm.sh/stripe@14.21.0')).default(
      stripeSecretKey,
      { apiVersion: '2023-10-16' }
    )
    
    console.log('💳 Stripe initialized')

    // Get user profile data from Supabase for additional info
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users_a18')
      .select('name, phone')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.warn('⚠️ Could not fetch user profile:', profileError)
    }

    // Use profile data if available, fallback to provided data
    const finalCustomerName = customerName || userProfile?.name || ''
    const finalCustomerPhone = customerPhone || userProfile?.phone || ''
    
    console.log('👤 Customer data:', { 
      email: customerEmail, 
      name: finalCustomerName, 
      phone: finalCustomerPhone 
    })

    // Create or retrieve customer
    let customer
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
      console.log('👥 Found existing customer:', customer.id)
      
      // Update customer with latest info
      customer = await stripe.customers.update(customer.id, {
        name: finalCustomerName,
        phone: finalCustomerPhone,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      console.log('✅ Customer updated with data')
    } else {
      // Create new customer with all available data
      customer = await stripe.customers.create({
        email: customerEmail,
        name: finalCustomerName,
        phone: finalCustomerPhone,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      console.log('✅ New customer created:', customer.id)
    }

    // Create Checkout Session with pre-populated data
    const sessionConfig = {
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${req.headers.get('origin')}/admin/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/admin/billing?canceled=true`,
      
      // Pre-populate customer information
      customer_update: {
        address: 'auto',
        name: 'auto',
        shipping: 'auto',
      },
      
      // Billing address collection
      billing_address_collection: 'auto',
      
      // Metadata for webhook processing
      metadata: {
        user_id: user.id,
        plan_id: planId,
        customer_email: customerEmail,
        customer_name: finalCustomerName,
      },
      
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: planId,
        },
      },
      
      // Localization
      locale: 'es',
      
      // Phone number collection
      phone_number_collection: {
        enabled: true,
      },
      
      // Tax ID collection for Mexican customers
      tax_id_collection: {
        enabled: true,
      },
      
      // Invoice creation settings
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Suscripción ${planId}`,
          metadata: {
            user_id: user.id,
            plan_id: planId,
          },
          custom_fields: [
            {
              name: 'Usuario',
              value: finalCustomerName || customerEmail,
            }
          ]
        }
      },
    }
    
    console.log('🛒 Creating checkout session with config')
    
    const session = await stripe.checkout.sessions.create(sessionConfig)
    
    console.log('✅ Checkout session created:', session.id)

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('❌ Error creating checkout session:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred creating the checkout session',
        details: error.toString()
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
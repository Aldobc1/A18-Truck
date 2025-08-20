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

    // Initialize Supabase client con service role para operaciones privilegiadas
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Usar service role key
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ No authorization header provided')
      throw new Error('No authorization header provided')
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔑 Token received, length:', token.length)
    console.log('🔑 Token preview:', token.substring(0, 20) + '...')

    // ✅ VALIDACIÓN MEJORADA DEL USUARIO CON DEBUG
    let user
    try {
      console.log('👤 PASO 1: Validando token del usuario...')
      
      // Usar supabase client normal para validar el token del usuario
      const userSupabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      )
      
      console.log('🔍 Obteniendo usuario del token...')
      const { data: { user: authUser }, error: userError } = await userSupabase.auth.getUser(token)
      
      console.log('📊 Respuesta de getUser:', { 
        user: authUser ? { id: authUser.id, email: authUser.email } : null, 
        error: userError 
      })

      if (userError) {
        console.error('❌ User authentication error:', userError)
        throw new Error(`User authentication failed: ${userError.message}`)
      }

      if (!authUser) {
        console.error('❌ No user found in token')
        throw new Error('No user found in token')
      }

      if (!authUser.id) {
        console.error('❌ User ID not found in token')
        throw new Error('User ID not found in token')
      }

      console.log('✅ Usuario autenticado:', { id: authUser.id, email: authUser.email })

      // ✅ VALIDAR QUE EL USUARIO EXISTE EN NUESTRA BASE DE DATOS
      console.log('🔍 PASO 2: Buscando perfil del usuario en base de datos...')
      const { data: userProfile, error: profileError } = await supabaseClient
        .from('users_a18')
        .select('id, email, name, phone, role')
        .eq('id', authUser.id)
        .single()

      console.log('📊 Respuesta de perfil:', { userProfile, profileError })

      if (profileError || !userProfile) {
        console.error('❌ User profile not found:', profileError)
        throw new Error('User profile not found in database')
      }

      user = {
        id: authUser.id,
        email: authUser.email || userProfile.email,
        ...userProfile
      }
      
      console.log('✅ Usuario completo:', user)
    } catch (authError) {
      console.error('❌ Authentication process failed:', authError)
      throw new Error(`Authentication failed: ${authError.message}`)
    }

    console.log('📋 PASO 3: Procesando request body...')
    const requestBody = await req.json()
    console.log('📊 Request body completo:', requestBody)

    const { priceId, planId, customerEmail, customerName, customerPhone, successUrl, cancelUrl } = requestBody

    // Validate required fields
    if (!priceId || !planId || !customerEmail) {
      console.error('❌ Missing required fields:', { priceId, planId, customerEmail })
      throw new Error('Missing required fields: priceId, planId, customerEmail')
    }

    console.log('🎯 Creating checkout for:', { priceId, planId, customerEmail, customerName })

    // Initialize Stripe
    console.log('💳 PASO 4: Inicializando Stripe...')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      console.error('❌ STRIPE_SECRET_KEY not configured')
      throw new Error('STRIPE_SECRET_KEY not configured')
    }

    console.log('🔑 Stripe secret key disponible:', stripeSecretKey ? 'Sí' : 'No')
    console.log('🔑 Stripe key preview:', stripeSecretKey?.substring(0, 10) + '...')

    const stripe = new (await import('https://esm.sh/stripe@14.21.0')).default(
      stripeSecretKey,
      { apiVersion: '2023-10-16' }
    )

    console.log('✅ Stripe inicializado correctamente')

    // Use user data from our database
    const finalCustomerName = customerName || user.name || ''
    const finalCustomerPhone = customerPhone || user.phone || ''

    console.log('👤 Datos finales del cliente:', {
      email: customerEmail,
      name: finalCustomerName,
      phone: finalCustomerPhone
    })

    // Create or retrieve customer
    console.log('🔍 PASO 5: Buscando/creando cliente en Stripe...')
    let customer
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    })

    console.log('📊 Clientes existentes encontrados:', existingCustomers.data.length)

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
      console.log('👤 Creando nuevo cliente...')
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
    console.log('🛒 PASO 6: Creando checkout session...')
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

    console.log('📋 Configuración de checkout session:', JSON.stringify(sessionConfig, null, 2))

    const session = await stripe.checkout.sessions.create(sessionConfig)

    console.log('✅ Checkout session created successfully!')
    console.log('🔗 Session ID:', session.id)
    console.log('🔗 Session URL:', session.url)

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('❌ ERROR COMPLETO en create-checkout-session:')
    console.error('   - Mensaje:', error.message)
    console.error('   - Stack:', error.stack)
    console.error('   - Objeto completo:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred creating the checkout session',
        details: error.toString(),
        stack: error.stack
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
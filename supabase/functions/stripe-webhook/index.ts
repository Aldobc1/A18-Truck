import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  // Manejar OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ✅ USAR VARIABLES SIN PREFIJO SUPABASE_
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
    
    // ✅ Para Supabase URL y Service Role, usar las variables internas automáticas
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')! // Esta es automática
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Esta es automática

    console.log('🔧 Environment check:')
    console.log('- STRIPE_WEBHOOK_SECRET:', STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing')
    console.log('- STRIPE_SECRET_KEY:', STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing')
    console.log('- SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing')
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing')

    // Verificar webhook signature
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('Missing stripe-signature header')
    }

    const body = await req.text()
    
    // Crear cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Importar y configurar Stripe
    const { default: Stripe } = await import('https://esm.sh/stripe@14.21.0')
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })

    // Verificar el evento de webhook
    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.log(`❌ Webhook signature verification failed: ${err.message}`)
      return new Response(`Webhook Error: ${err.message}`, { 
        status: 400,
        headers: corsHeaders 
      })
    }

    console.log(`🔔 Processing webhook: ${event.type}`)

    // Procesar el evento usando la función de Supabase
    const { data, error } = await supabase.rpc('handle_stripe_webhook', {
      event_id: event.id,
      event_type: event.type,
      event_data: event
    })

    if (error) {
      console.error('❌ Error processing webhook in Supabase:', error)
      throw error
    }

    console.log('✅ Webhook processed successfully:', data)

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
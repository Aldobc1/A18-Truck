import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Initialize Stripe with your secret key
    const stripe = new (await import('https://esm.sh/stripe@14.21.0')).default(
      Deno.env.get('STRIPE_SECRET_KEY') ?? '', 
      {
        apiVersion: '2023-10-16',
      }
    )

    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const signature = req.headers.get('Stripe-Signature')!
    const body = await req.text()

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    )

    console.log('Webhook received:', event.type)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object
        await handleCheckoutCompleted(supabaseClient, session)
        break

      case 'invoice.payment_succeeded':
        const invoice = event.data.object
        await handleInvoicePaymentSucceeded(supabaseClient, invoice)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object
        await handleSubscriptionUpdated(supabaseClient, subscription)
        break

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object
        await handleSubscriptionDeleted(supabaseClient, deletedSubscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function handleCheckoutCompleted(supabase: any, session: any) {
  try {
    const userId = session.metadata?.user_id
    const planId = session.metadata?.plan_id

    if (!userId) {
      console.error('No user_id in session metadata')
      return
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription)

    // Insert or update subscription in database
    const { error } = await supabase
      .from('subscriptions_stripe_a18')
      .upsert({
        user_id: userId,
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer,
        plan_type: planId,
        status: 'active',
        price_amount: session.amount_total,
        price_currency: session.currency,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error updating subscription:', error)
    } else {
      console.log('Subscription updated successfully')
    }

  } catch (error) {
    console.error('Error handling checkout completed:', error)
  }
}

async function handleInvoicePaymentSucceeded(supabase: any, invoice: any) {
  try {
    // Get subscription to find user_id
    if (!invoice.subscription) return

    const { data: subscription } = await supabase
      .from('subscriptions_stripe_a18')
      .select('user_id')
      .eq('stripe_subscription_id', invoice.subscription)
      .single()

    if (!subscription) {
      console.error('No subscription found for invoice')
      return
    }

    // Insert invoice record
    const { error } = await supabase
      .from('invoices_stripe_a18')
      .upsert({
        user_id: subscription.user_id,
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: invoice.subscription,
        status: invoice.status,
        amount_total: invoice.amount_paid,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
        period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
        hosted_invoice_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
        paid_at: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : null,
        created_at: new Date(invoice.created * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error inserting invoice:', error)
    } else {
      console.log('Invoice inserted successfully')
    }

  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error)
  }
}

async function handleSubscriptionUpdated(supabase: any, subscription: any) {
  try {
    const { error } = await supabase
      .from('subscriptions_stripe_a18')
      .update({
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error updating subscription:', error)
    } else {
      console.log('Subscription updated successfully')
    }

  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionDeleted(supabase: any, subscription: any) {
  try {
    const { error } = await supabase
      .from('subscriptions_stripe_a18')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error updating canceled subscription:', error)
    } else {
      console.log('Subscription canceled successfully')
    }

  } catch (error) {
    console.error('Error handling subscription deleted:', error)
  }
}
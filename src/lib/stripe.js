import { loadStripe } from '@stripe/stripe-js';
import supabase from './supabase';

// Tu clave pública de Stripe
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51RsqI63xfQJC1PHSLXPQnFOzwam6mVIXFMCEXQAUyKYBgM03U3j7BdevpQhdzcM29fDW6eFHzdG03p9zDYWyN8c400h74bHpVS';

// Inicializar Stripe
let stripePromise;
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

// Planes de suscripción
export const SUBSCRIPTION_PLANS = {
  basico: {
    id: 'basico',
    name: 'Plan Básico',
    price: 499,
    currency: 'MXN',
    interval: 'mes',
    priceId: 'price_1QdOl53xfQJC1PHSMhEJvqvZ', // Reemplaza con tu Price ID real
    paymentLink: 'https://buy.stripe.com/cNi28kd7n9s2fANgikaVa03',
    features: [
      'Hasta 10 camiones',
      'Gestión básica de proyectos',
      'Soporte por email',
      'Dashboard básico'
    ]
  },
  empresarial: {
    id: 'empresarial',
    name: 'Plan Empresarial',
    price: 899,
    currency: 'MXN',
    interval: 'mes',
    priceId: 'price_1QdOl53xfQJC1PHSMhEJvqvZ', // Reemplaza con tu Price ID real
    paymentLink: 'https://buy.stripe.com/aFa7sEgjz7jU3S5fegaVa04',
    features: [
      'Hasta 50 camiones',
      'Gestión avanzada de proyectos',
      'Reportes detallados',
      'Soporte prioritario',
      'Múltiples workspaces'
    ]
  },
  profesional: {
    id: 'profesional',
    name: 'Plan Profesional',
    price: 1499,
    currency: 'MXN',
    interval: 'mes',
    priceId: 'price_1QdOl53xfQJC1PHSMhEJvqvZ', // Reemplaza con tu Price ID real
    paymentLink: 'https://buy.stripe.com/14AcMYc3jfQqfANc24aVa05',
    features: [
      'Camiones ilimitados',
      'Todas las funciones',
      'API personalizada',
      'Soporte 24/7',
      'Workspaces ilimitados',
      'Integraciones avanzadas'
    ]
  }
};

// Función para crear checkout session con datos pre-poblados
export const createCheckoutSession = async (planId, userEmail, userName) => {
  try {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      throw new Error('Plan no encontrado');
    }

    // Llamar a tu función de Supabase Edge Function para crear la sesión
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        priceId: plan.priceId,
        planId: planId,
        customerEmail: userEmail,
        customerName: userName,
        successUrl: `${window.location.origin}/#/admin/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/#/admin/billing?canceled=true`
      }
    });

    if (error) {
      console.error('Error creating checkout session:', error);
      // Fallback a payment link si falla la creación de sesión
      return redirectToStripeCheckout(planId);
    }

    if (data?.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No se pudo crear la sesión de pago');
    }
  } catch (err) {
    console.error('Error in createCheckoutSession:', err);
    // Fallback a payment link
    return redirectToStripeCheckout(planId);
  }
};

// Función de respaldo para redirigir a Stripe Payment Link
export const redirectToStripeCheckout = async (planId) => {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) {
    throw new Error('Plan no encontrado');
  }
  
  // Redirigir al payment link de Stripe (sin pre-población)
  window.location.href = plan.paymentLink;
};

// Función para manejar el webhook de Stripe
export const handleStripeWebhook = async (event) => {
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleSuccessfulPayment(session);
        break;
      
      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        await handleInvoicePayment(invoice);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;
      
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await handleSubscriptionCancellation(deletedSubscription);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error handling Stripe webhook:', error);
    throw error;
  }
};

// Manejar pago exitoso
const handleSuccessfulPayment = async (session) => {
  try {
    const { error } = await supabase
      .from('subscriptions_stripe_a18')
      .upsert([{
        user_id: session.metadata?.user_id,
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer,
        plan_type: session.metadata?.plan_id,
        plan_name: SUBSCRIPTION_PLANS[session.metadata?.plan_id]?.name,
        status: 'active',
        price_amount: session.amount_total,
        price_currency: session.currency,
        current_period_start: new Date(session.metadata?.period_start * 1000).toISOString(),
        current_period_end: new Date(session.metadata?.period_end * 1000).toISOString(),
        payment_link_url: session.url,
        updated_at: new Date().toISOString()
      }]);

    if (error) throw error;
  } catch (err) {
    console.error('Error handling successful payment:', err);
    throw err;
  }
};

// Manejar actualización de suscripción
const handleSubscriptionUpdate = async (subscription) => {
  try {
    const { error } = await supabase
      .from('subscriptions_stripe_a18')
      .update({
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) throw error;
  } catch (err) {
    console.error('Error handling subscription update:', err);
    throw err;
  }
};

// Manejar pago de factura
const handleInvoicePayment = async (invoice) => {
  try {
    const { error } = await supabase
      .from('invoices_stripe_a18')
      .upsert([{
        user_id: invoice.metadata?.user_id,
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
        updated_at: new Date().toISOString()
      }]);

    if (error) throw error;
  } catch (err) {
    console.error('Error handling invoice payment:', err);
    throw err;
  }
};

// Manejar cancelación de suscripción
const handleSubscriptionCancellation = async (subscription) => {
  try {
    const { error } = await supabase
      .from('subscriptions_stripe_a18')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) throw error;
  } catch (err) {
    console.error('Error handling subscription cancellation:', err);
    throw err;
  }
};

// Función para formatear precio
export const formatPrice = (amount, currency = 'MXN') => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(amount);
};

// Función para formatear fecha
export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Función para obtener el estado del portal del cliente
export const getCustomerPortalUrl = async (customerId) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: {
        customerId: customerId,
        returnUrl: `${window.location.origin}/#/admin/billing`
      }
    });

    if (error) throw error;
    return data.url;
  } catch (err) {
    console.error('Error creating portal session:', err);
    throw err;
  }
};
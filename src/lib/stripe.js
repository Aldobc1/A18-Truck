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
    priceId: 'price_1RxvqZ3xfQJC1PHSbDFoTgwS',
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
    priceId: 'price_1Rxvqo3xfQJC1PHSPK9dKCBW',
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
    priceId: 'price_1RxvrB3xfQJC1PHS4q6Ty9FK',
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

// ✅ FUNCIÓN CON DEBUG DETALLADO
export const createCheckoutSession = async (planId, userEmail, userName) => {
  console.group('🚀 DEBUG: createCheckoutSession');
  console.log('📋 Parámetros iniciales:', { planId, userEmail, userName });
  
  try {
    // PASO 1: Validar plan
    console.log('📝 PASO 1: Validando plan...');
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      throw new Error('Plan no encontrado');
    }
    console.log('✅ Plan encontrado:', plan);

    // PASO 2: Obtener sesión de Supabase
    console.log('🔐 PASO 2: Obteniendo sesión de Supabase...');
    let session;
    let accessToken;
    
    try {
      const sessionResponse = await supabase.auth.getSession();
      console.log('📊 Respuesta completa de getSession:', sessionResponse);
      
      const { data: { session: currentSession }, error: sessionError } = sessionResponse;
      
      if (sessionError) {
        console.error('❌ Error obteniendo sesión:', sessionError);
        throw new Error(`Error de sesión: ${sessionError.message}`);
      }
      
      if (!currentSession) {
        console.error('❌ No hay sesión activa');
        throw new Error('No hay sesión activa. Por favor inicia sesión nuevamente.');
      }

      if (!currentSession.access_token) {
        console.error('❌ Token de acceso no disponible');
        throw new Error('Token de acceso no disponible');
      }

      session = currentSession;
      accessToken = currentSession.access_token;
      
      console.log('✅ Sesión obtenida exitosamente:');
      console.log('   - Usuario ID:', session.user?.id);
      console.log('   - Email:', session.user?.email);
      console.log('   - Token length:', accessToken?.length);
      
    } catch (sessionErr) {
      console.error('❌ Error en manejo de sesión:', sessionErr);
      console.log('🔄 Fallback a payment link por error de sesión');
      console.groupEnd();
      return redirectToStripeCheckout(planId);
    }

    // PASO 3: Obtener perfil del usuario
    console.log('👤 PASO 3: Obteniendo perfil del usuario...');
    let userProfile = {};
    try {
      const profileResponse = await supabase
        .from('users_a18')
        .select('name, phone')
        .eq('id', session.user.id)
        .single();
      
      console.log('📊 Respuesta de perfil:', profileResponse);
      userProfile = profileResponse.data || {};
      console.log('✅ Perfil del usuario:', userProfile);
    } catch (profileErr) {
      console.warn('⚠️ No se pudo obtener perfil del usuario:', profileErr);
    }

    // PASO 4: Preparar datos del cliente
    console.log('📋 PASO 4: Preparando datos del cliente...');
    const customerData = {
      email: userEmail || session.user.email,
      name: userName || userProfile.name || '',
      phone: userProfile.phone || ''
    };
    console.log('✅ Datos del cliente preparados:', customerData);

    // PASO 5: Preparar payload para función Edge
    console.log('📦 PASO 5: Preparando payload para función Edge...');
    const payload = {
      priceId: plan.priceId,
      planId: planId,
      customerEmail: customerData.email,
      customerName: customerData.name,
      customerPhone: customerData.phone,
      successUrl: `${window.location.origin}/#/admin/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/#/admin/billing?canceled=true`
    };
    console.log('✅ Payload preparado:', payload);

    // PASO 6: Invocar función Edge
    console.log('📡 PASO 6: Invocando función Edge...');
    console.log('   - URL de función: create-checkout-session');
    console.log('   - Headers de autorización: Bearer [TOKEN]');
    
    let response;
    try {
      const edgeResponse = await supabase.functions.invoke('create-checkout-session', {
        body: payload,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 Respuesta completa de función Edge:', edgeResponse);
      
      if (edgeResponse.error) {
        console.error('❌ Error de función Edge:', edgeResponse.error);
        throw edgeResponse.error;
      }

      response = edgeResponse.data;
      console.log('✅ Datos de respuesta:', response);

    } catch (edgeErr) {
      console.error('❌ Error invocando función Edge:', edgeErr);
      console.error('   - Mensaje:', edgeErr.message);
      console.error('   - Stack:', edgeErr.stack);
      
      // Verificar si es un error de autenticación específico
      const errorMessage = edgeErr.message || edgeErr.toString();
      if (errorMessage.includes('authentication') || errorMessage.includes('sub claim') || errorMessage.includes('invalid claim')) {
        console.log('🔄 Error de autenticación detectado, usando payment link');
        console.groupEnd();
        return redirectToStripeCheckout(planId);
      }
      
      throw edgeErr;
    }

    // PASO 7: Procesar respuesta
    console.log('✅ PASO 7: Procesando respuesta...');
    if (response?.url) {
      console.log('🎉 ¡Checkout session creado exitosamente!');
      console.log('   - URL de checkout:', response.url);
      console.groupEnd();
      window.location.href = response.url;
    } else {
      console.error('❌ Respuesta inválida de la función Edge:', response);
      throw new Error('No se recibió URL de checkout');
    }
    
  } catch (err) {
    console.error('❌ ERROR GENERAL en createCheckoutSession:');
    console.error('   - Mensaje:', err.message);
    console.error('   - Stack completo:', err.stack);
    console.error('   - Objeto completo:', err);
    
    // Mostrar mensaje específico al usuario
    const userMessage = err.message?.includes('authentication') || err.message?.includes('session')
      ? 'Error de autenticación. Redirigiendo a checkout externo...'
      : `Error al procesar: ${err.message}`;
    
    // Mostrar mensaje temporal al usuario
    if (typeof alert !== 'undefined') {
      alert(userMessage);
    }
    
    // Fallback final a payment link
    console.log('🔄 Fallback final a payment link');
    console.groupEnd();
    return redirectToStripeCheckout(planId);
  }
};

// Función de respaldo con debug
export const redirectToStripeCheckout = async (planId) => {
  console.group('🔗 DEBUG: redirectToStripeCheckout');
  console.log('📋 Plan ID:', planId);
  
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) {
    console.error('❌ Plan no encontrado para ID:', planId);
    console.groupEnd();
    throw new Error('Plan no encontrado');
  }

  console.log('✅ Plan encontrado:', plan);
  console.log('🔗 Payment Link:', plan.paymentLink);
  
  try {
    console.log('🚀 Redirigiendo a Stripe Payment Link...');
    window.location.href = plan.paymentLink;
    console.groupEnd();
  } catch (err) {
    console.error('❌ Error redirigiendo a payment link:', err);
    // Como último recurso, abrir en nueva ventana
    console.log('🆘 Último recurso: abrir en nueva ventana');
    window.open(plan.paymentLink, '_blank');
    console.groupEnd();
  }
};

// Resto de funciones sin cambios...
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
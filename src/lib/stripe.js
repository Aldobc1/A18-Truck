import { loadStripe } from '@stripe/stripe-js';

// ✅ Tu Publishable Key de producción configurada correctamente
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51RsqI63xfQJC1PHSLXPQnFOzwam6mVIXFMCEXQAUyKYBgM03U3j7BdevpQhdzcM29fDW6eFHzdG03p9zDYWyN8c400h74bHpVS';

// Validar que la clave esté configurada
if (!STRIPE_PUBLISHABLE_KEY || STRIPE_PUBLISHABLE_KEY === 'pk_live_TU_CLAVE_AQUI') {
  console.error('⚠️ Configura tu Publishable Key de Stripe en src/lib/stripe.js');
  throw new Error('Stripe Publishable Key no configurada');
}

if (!STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_')) {
  console.warn('⚠️ Asegúrate de usar la clave de PRODUCCIÓN (pk_live_...)');
}

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

export default stripePromise;
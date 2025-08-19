// ============================================
// CONFIGURACIÓN DE WEBHOOKS DE STRIPE
// ============================================

import supabase from '../lib/supabase';

// Función para manejar webhooks de Stripe
export const handleStripeWebhook = async (event) => {
  try {
    console.log('🔔 Processing Stripe webhook:', event.type);
    
    // Llamar a la función de Supabase para procesar el webhook
    const { data, error } = await supabase.rpc('handle_stripe_webhook', {
      event_id: event.id,
      event_type: event.type,
      event_data: event
    });

    if (error) {
      console.error('❌ Error processing webhook in Supabase:', error);
      throw error;
    }

    console.log('✅ Webhook processed successfully:', data);
    return { success: true, data };

  } catch (err) {
    console.error('❌ Error in handleStripeWebhook:', err);
    return { success: false, error: err.message };
  }
};

// Función para verificar el estado de una suscripción
export const checkSubscriptionStatus = async (workspaceId) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions_a18')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { success: true, subscription: data };
  } catch (err) {
    console.error('Error checking subscription status:', err);
    return { success: false, error: err.message };
  }
};

// Función para activar suscripción manualmente (para testing)
export const activateSubscriptionManual = async (workspaceId, userId, planId) => {
  try {
    const { data, error } = await supabase.rpc('activate_subscription_manual', {
      p_workspace_id: workspaceId,
      p_user_id: userId,
      p_plan_id: planId
    });

    if (error) {
      throw error;
    }

    console.log('✅ Subscription activated manually:', data);
    return { success: true, subscriptionId: data };
  } catch (err) {
    console.error('❌ Error activating subscription manually:', err);
    return { success: false, error: err.message };
  }
};

// Función para simular un webhook de Stripe (para testing)
export const simulateStripeWebhook = async (eventType, subscriptionData) => {
  const mockEvent = {
    id: `evt_test_${Date.now()}`,
    type: eventType,
    data: {
      object: {
        ...subscriptionData,
        metadata: {
          workspace_id: subscriptionData.workspace_id,
          user_id: subscriptionData.user_id,
          plan_id: subscriptionData.plan_id
        }
      }
    },
    created: Math.floor(Date.now() / 1000)
  };

  return await handleStripeWebhook(mockEvent);
};

export default {
  handleStripeWebhook,
  checkSubscriptionStatus,
  activateSubscriptionManual,
  simulateStripeWebhook
};
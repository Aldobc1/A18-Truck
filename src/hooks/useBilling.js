import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import supabase from '../lib/supabase';

export const useBilling = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 🎯 PLANES CON PAYMENT LINKS DE PRODUCCIÓN
  const plans = [
    {
      id: 'basic',
      name: 'Básico',
      price: 499, // $499 MXN
      currency: 'MXN',
      interval: 'month',
      // 🚨 REEMPLAZAR CON TU PAYMENT LINK DE PRODUCCIÓN
      paymentLink: 'https://buy.stripe.com/cNi28kd7n9s2fANgikaVa03',
      features: [
        'Hasta 5 camiones',
        'Gestión básica de proyectos',
        'Registros de salida/entrega',
        'Soporte por email',
        'Dashboard básico'
      ]
    },
    {
      id: 'business',
      name: 'Empresarial',
      price: 899, // $899 MXN
      currency: 'MXN',
      interval: 'month',
      // 🚨 REEMPLAZAR CON TU PAYMENT LINK DE PRODUCCIÓN
      paymentLink: 'https://buy.stripe.com/aFa7sEgjz7jU3S5fegaVa04',
      features: [
        'Hasta 25 camiones',
        'Gestión avanzada de proyectos',
        'Múltiples workspaces',
        'Análisis y reportes',
        'Soporte prioritario',
        'Integración NFC',
        'Gestión de usuarios'
      ],
      popular: true
    },
    {
      id: 'professional',
      name: 'Profesional',
      price: 1499, // $1499 MXN
      currency: 'MXN',
      interval: 'month',
      // 🚨 REEMPLAZAR CON TU PAYMENT LINK DE PRODUCCIÓN
      paymentLink: 'https://buy.stripe.com/14AcMYc3jfQqfANc24aVa05',
      features: [
        'Camiones ilimitados',
        'Proyectos ilimitados',
        'Workspaces ilimitados',
        'Analytics avanzados',
        'Soporte 24/7',
        'API personalizada',
        'Integraciones personalizadas',
        'Gerente de cuenta dedicado'
      ]
    }
  ];

  // Fetch billing data
  const fetchBillingData = async () => {
    if (!user || !currentWorkspace) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Obtener suscripción
      const { data: subData, error: subError } = await supabase
        .from('subscriptions_a18')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') {
        throw subError;
      }

      setSubscription(subData);

      // Obtener facturas
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices_a18')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (invoicesError) {
        throw invoicesError;
      }

      setInvoices(invoicesData || []);

      // Obtener métodos de pago
      const { data: paymentMethodsData, error: paymentError } = await supabase
        .from('payment_methods_a18')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (paymentError) {
        throw paymentError;
      }

      setPaymentMethods(paymentMethodsData || []);

    } catch (err) {
      console.error('Error fetching billing data:', err);
      setError(err.message || 'Error al cargar información de facturación');
    } finally {
      setLoading(false);
    }
  };

  // Create subscription - SOLO PARA TRACKING LOCAL
  const createSubscription = async (planId) => {
    if (!user || !currentWorkspace) {
      throw new Error('Usuario o workspace no disponible');
    }

    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Plan no encontrado');
      }

      // ⚠️ IMPORTANTE: Esto solo crea un registro local
      // El pago real se procesa en Stripe externamente
      const { data, error } = await supabase
        .from('subscriptions_a18')
        .insert([{
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          plan_id: planId,
          status: 'pending', // Comienza como pendiente hasta confirmar pago
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          stripe_subscription_id: `sub_pending_${Date.now()}`, // Temporal
          stripe_customer_id: `cus_pending_${user.id}` // Temporal
        }])
        .select()
        .single();

      if (error) throw error;

      setSubscription(data);
      return data;

    } catch (err) {
      console.error('Error creating subscription:', err);
      throw err;
    }
  };

  // Update subscription
  const updateSubscription = async (planId) => {
    if (!subscription) {
      throw new Error('No hay suscripción activa');
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions_a18')
        .update({
          plan_id: planId,
          status: 'pending', // Marca como pendiente hasta confirmar pago
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)
        .select()
        .single();

      if (error) throw error;

      setSubscription(data);
      return data;

    } catch (err) {
      console.error('Error updating subscription:', err);
      throw err;
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    if (!subscription) {
      throw new Error('No hay suscripción activa');
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions_a18')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)
        .select()
        .single();

      if (error) throw error;

      setSubscription(data);
      return data;

    } catch (err) {
      console.error('Error cancelling subscription:', err);
      throw err;
    }
  };

  // Add payment method - PLACEHOLDER para futura implementación
  const addPaymentMethod = async (paymentMethodData) => {
    if (!user || !currentWorkspace) {
      throw new Error('Usuario o workspace no disponible');
    }

    try {
      const isFirstMethod = paymentMethods.length === 0;

      const { data, error } = await supabase
        .from('payment_methods_a18')
        .insert([{
          user_id: user.id,
          workspace_id: currentWorkspace.id,
          stripe_payment_method_id: paymentMethodData.id,
          type: paymentMethodData.type || 'card',
          brand: paymentMethodData.card?.brand,
          last4: paymentMethodData.card?.last4,
          exp_month: paymentMethodData.card?.exp_month,
          exp_year: paymentMethodData.card?.exp_year,
          is_default: isFirstMethod
        }])
        .select()
        .single();

      if (error) throw error;

      setPaymentMethods(prev => [...prev, data]);
      return data;

    } catch (err) {
      console.error('Error adding payment method:', err);
      throw err;
    }
  };

  // Set default payment method
  const setDefaultPaymentMethod = async (paymentMethodId) => {
    try {
      await supabase
        .from('payment_methods_a18')
        .update({ is_default: false })
        .eq('workspace_id', currentWorkspace.id);

      const { data, error } = await supabase
        .from('payment_methods_a18')
        .update({ is_default: true })
        .eq('id', paymentMethodId)
        .select()
        .single();

      if (error) throw error;

      setPaymentMethods(prev =>
        prev.map(pm => ({
          ...pm,
          is_default: pm.id === paymentMethodId
        }))
      );

      return data;

    } catch (err) {
      console.error('Error setting default payment method:', err);
      throw err;
    }
  };

  // Remove payment method
  const removePaymentMethod = async (paymentMethodId) => {
    try {
      const { error } = await supabase
        .from('payment_methods_a18')
        .update({ is_active: false })
        .eq('id', paymentMethodId);

      if (error) throw error;

      setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));

    } catch (err) {
      console.error('Error removing payment method:', err);
      throw err;
    }
  };

  // Get current plan
  const getCurrentPlan = () => {
    if (!subscription) return null;
    return plans.find(plan => plan.id === subscription.plan_id);
  };

  // Load data on mount and when dependencies change
  useEffect(() => {
    fetchBillingData();
  }, [user, currentWorkspace]);

  return {
    // Data
    subscription,
    invoices,
    paymentMethods,
    plans,
    loading,
    error,
    // Computed
    currentPlan: getCurrentPlan(),
    // Actions
    fetchBillingData,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    addPaymentMethod,
    setDefaultPaymentMethod,
    removePaymentMethod
  };
};

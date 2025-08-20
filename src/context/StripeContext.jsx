import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from './AuthContext';

const StripeContext = createContext();

export const useStripe = () => {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
};

export const StripeProvider = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar datos de suscripción e facturas
  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
      fetchInvoicesData();
    } else {
      setSubscription(null);
      setInvoices([]);
      setLoading(false);
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('subscriptions_stripe_a18')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      setSubscription(data?.[0] || null);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoicesData = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices_stripe_a18')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.message);
    }
  };

  // Función para crear o actualizar suscripción
  const updateSubscription = async (subscriptionData) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions_stripe_a18')
        .upsert([{
          user_id: user.id,
          ...subscriptionData
        }])
        .select();

      if (error) throw error;

      setSubscription(data[0]);
      return data[0];
    } catch (err) {
      console.error('Error updating subscription:', err);
      throw err;
    }
  };

  // Función para crear factura
  const createInvoice = async (invoiceData) => {
    try {
      const { data, error } = await supabase
        .from('invoices_stripe_a18')
        .insert([{
          user_id: user.id,
          ...invoiceData
        }])
        .select();

      if (error) throw error;

      setInvoices(prev => [data[0], ...prev]);
      return data[0];
    } catch (err) {
      console.error('Error creating invoice:', err);
      throw err;
    }
  };

  // Función para cancelar suscripción
  const cancelSubscription = async () => {
    try {
      if (!subscription) throw new Error('No hay suscripción activa');

      const { data, error } = await supabase
        .from('subscriptions_stripe_a18')
        .update({ 
          cancel_at_period_end: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)
        .select();

      if (error) throw error;

      setSubscription(data[0]);
      return data[0];
    } catch (err) {
      console.error('Error canceling subscription:', err);
      throw err;
    }
  };

  const value = {
    subscription,
    invoices,
    loading,
    error,
    fetchSubscriptionData,
    fetchInvoicesData,
    updateSubscription,
    createInvoice,
    cancelSubscription
  };

  return (
    <StripeContext.Provider value={value}>
      {children}
    </StripeContext.Provider>
  );
};
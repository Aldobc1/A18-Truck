import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import CheckoutForm from './CheckoutForm';

const { FiX, FiLoader, FiExternalLink, FiCreditCard } = FiIcons;

// ✅ Usar tu Publishable Key de producción
const stripePromise = loadStripe('pk_live_51RsqI63xfQJC1PHSLXPQnFOzwam6mVIXFMCEXQAUyKYBgM03U3j7BdevpQhdzcM29fDW6eFHzdG03p9zDYWyN8c400h74bHpVS');

const StripeCheckout = ({ isOpen, onClose, planDetails, onSuccess, onError }) => {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [useHostedCheckout, setUseHostedCheckout] = useState(false);

  useEffect(() => {
    if (isOpen && planDetails) {
      createPaymentIntent();
    }
  }, [isOpen, planDetails]);

  const createPaymentIntent = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🚀 Creating payment intent for plan:', planDetails);

      // En un entorno real, esto sería una llamada a tu backend
      // Por ahora, simulamos la creación del PaymentIntent
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1500));

      // ✅ Para demo, usar client_secret simulado con datos del plan
      const mockClientSecret = `pi_${planDetails.id}_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`;
      console.log('✅ Mock client secret created:', mockClientSecret);

      setClientSecret(mockClientSecret);
    } catch (err) {
      console.error('❌ Error creating payment intent:', err);
      setError('Error al preparar el pago. Intentando con checkout externo...');
      
      // Si falla, ofrecer usar el checkout hospedado
      setTimeout(() => {
        setUseHostedCheckout(true);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (paymentIntent) => {
    console.log('✅ Payment succeeded:', paymentIntent);
    onSuccess?.(paymentIntent);
    onClose();
  };

  const handleError = (error) => {
    console.error('❌ Payment failed:', error);
    setError('Error en el pago: ' + error.message);
    onError?.(error);
    
    // Ofrecer usar checkout hospedado como fallback
    setTimeout(() => {
      setUseHostedCheckout(true);
    }, 2000);
  };

  // ✅ Función para abrir checkout externo de Stripe
  const openHostedCheckout = () => {
    if (planDetails?.paymentLink) {
      console.log('🔗 Opening hosted Stripe checkout:', planDetails.paymentLink);
      window.open(planDetails.paymentLink, '_blank');
      onClose(); // Cerrar el modal
    }
  };

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#2563eb',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Checkout - {planDetails?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <SafeIcon icon={FiX} className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <SafeIcon icon={FiLoader} className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600 text-center">
              Preparando el pago seguro...
              <br />
              <span className="text-sm text-gray-500">Esto puede tomar unos segundos</span>
            </p>
          </div>
        ) : error && !useHostedCheckout ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiX} className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4 text-sm">{error}</p>
            <div className="space-y-3">
              <button
                onClick={createPaymentIntent}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Intentar de nuevo
              </button>
              <button
                onClick={() => setUseHostedCheckout(true)}
                className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                <span>Usar checkout externo</span>
              </button>
            </div>
          </div>
        ) : useHostedCheckout ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiExternalLink} className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Continuar con Stripe
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              Te redirigiremos a la página segura de Stripe para completar tu pago.
            </p>

            {/* Plan Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-semibold text-gray-900 mb-2">Resumen del Plan</h4>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{planDetails?.name}</span>
                <span className="font-bold text-gray-900">
                  ${planDetails?.price}/mes
                </span>
              </div>
              {planDetails?.description && (
                <p className="text-sm text-gray-500 mt-2">{planDetails.description}</p>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={openHostedCheckout}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-semibold"
              >
                <SafeIcon icon={FiCreditCard} className="w-5 h-5" />
                <span>Continuar a Stripe</span>
              </button>
              <button
                onClick={onClose}
                className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              🔒 Pago 100% seguro procesado por Stripe
            </p>
          </div>
        ) : clientSecret && stripePromise ? (
          <Elements options={options} stripe={stripePromise}>
            <CheckoutForm
              clientSecret={clientSecret}
              planDetails={planDetails}
              onSuccess={handleSuccess}
              onError={handleError}
              mode="subscription"
            />
          </Elements>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Error al cargar el formulario de pago</p>
            <button
              onClick={() => setUseHostedCheckout(true)}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
              <span>Usar checkout externo</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StripeCheckout;
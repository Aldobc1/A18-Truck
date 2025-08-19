import React, { useState } from 'react';
import {
  useStripe,
  useElements,
  CardElement,
  PaymentElement
} from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiCreditCard, FiLock, FiCheck, FiAlertCircle } = FiIcons;

const CheckoutForm = ({ 
  clientSecret, 
  planDetails, 
  onSuccess, 
  onError,
  mode = 'subscription' // 'subscription' or 'payment'
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      let result;
      
      if (mode === 'subscription') {
        // Para suscripciones
        result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/#/admin/billing?success=true`,
          },
          redirect: 'if_required'
        });
      } else {
        // Para pagos únicos
        const cardElement = elements.getElement(CardElement);
        
        result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
          }
        });
      }

      if (result.error) {
        setError(result.error.message);
        onError?.(result.error);
      } else {
        setSucceeded(true);
        onSuccess?.(result.paymentIntent || result.subscription);
      }
    } catch (err) {
      setError('Error procesando el pago: ' + err.message);
      onError?.(err);
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  if (succeeded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <SafeIcon icon={FiCheck} className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          ¡Pago Exitoso!
        </h3>
        <p className="text-gray-600">
          Tu suscripción ha sido activada correctamente.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Plan Details */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Resumen del Plan</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">{planDetails?.name}</span>
          <span className="font-bold text-gray-900">
            ${planDetails?.price}/{planDetails?.interval === 'month' ? 'mes' : 'año'}
          </span>
        </div>
        {planDetails?.description && (
          <p className="text-sm text-gray-500 mt-2">{planDetails.description}</p>
        )}
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Información de Pago
        </label>
        <div className="border border-gray-300 rounded-lg p-4">
          {mode === 'subscription' ? (
            <PaymentElement />
          ) : (
            <CardElement options={cardElementOptions} />
          )}
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <SafeIcon icon={FiLock} className="w-4 h-4" />
        <span>Tu información está protegida con encriptación SSL</span>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
        >
          <div className="flex items-center">
            <SafeIcon icon={FiAlertCircle} className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Submit Button */}
      <motion.button
        type="submit"
        disabled={!stripe || processing}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {processing ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Procesando...</span>
          </>
        ) : (
          <>
            <SafeIcon icon={FiCreditCard} className="w-5 h-5" />
            <span>
              Pagar ${planDetails?.price}
              {mode === 'subscription' && `/${planDetails?.interval === 'month' ? 'mes' : 'año'}`}
            </span>
          </>
        )}
      </motion.button>

      {/* Terms */}
      <p className="text-xs text-gray-500 text-center">
        Al proceder, aceptas nuestros{' '}
        <a href="#" className="text-blue-600 hover:underline">
          Términos de Servicio
        </a>{' '}
        y{' '}
        <a href="#" className="text-blue-600 hover:underline">
          Política de Privacidad
        </a>
      </p>
    </form>
  );
};

export default CheckoutForm;
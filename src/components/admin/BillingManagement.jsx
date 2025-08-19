import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Elements } from '@stripe/react-stripe-js';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useBilling } from '../../hooks/useBilling';
import stripePromise from '../../lib/stripe';
import StripeCheckout from '../stripe/StripeCheckout';
import PaymentMethodForm from '../stripe/PaymentMethodForm';

const { 
  FiCreditCard, FiDollarSign, FiCalendar, FiDownload, FiCheck, FiX, 
  FiAlertTriangle, FiRefreshCw, FiPackage, FiZap, FiStar, FiTruck, 
  FiUsers, FiBarChart, FiPlus 
} = FiIcons;

const BillingManagement = () => {
  const {
    subscription,
    invoices,
    paymentMethods,
    plans,
    loading,
    error,
    currentPlan,
    fetchBillingData,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    addPaymentMethod,
    setDefaultPaymentMethod,
    removePaymentMethod
  } = useBilling();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState('');
  const [localError, setLocalError] = useState('');

  // ✅ CORREGIDO: Función para seleccionar plan y abrir checkout integrado
  const handlePlanSelect = (plan) => {
    console.log('Plan selected:', plan);
    setSelectedPlan(plan);
    setShowUpgradeModal(false);
    setShowStripeCheckout(true); // Abrir modal de Stripe integrado
  };

  // ✅ CORREGIDO: Manejar éxito del pago
  const handlePaymentSuccess = async (paymentIntent) => {
    setProcessing(true);
    setLocalError('');
    setSuccess('');

    try {
      if (!subscription) {
        // Crear nueva suscripción
        await createSubscription(selectedPlan.id);
        setSuccess('Suscripción creada exitosamente');
      } else {
        // Actualizar suscripción existente
        await updateSubscription(selectedPlan.id);
        setSuccess('Plan actualizado exitosamente');
      }

      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error upgrading plan:', err);
      setLocalError('Error al actualizar el plan: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ✅ CORREGIDO: Manejar error del pago con fallback
  const handlePaymentError = (error) => {
    console.error('Payment failed:', error);
    setLocalError('Error en el pago: ' + error.message);
    
    // Fallback: abrir enlace directo de Stripe si el checkout integrado falla
    if (selectedPlan?.paymentLink) {
      console.log('Opening Stripe hosted checkout as fallback');
      setTimeout(() => {
        window.open(selectedPlan.paymentLink, '_blank');
      }, 2000);
    }
  };

  const handleAddPaymentMethod = async (paymentMethod) => {
    try {
      await addPaymentMethod(paymentMethod);
      setSuccess('Método de pago agregado exitosamente');
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setLocalError('Error al agregar método de pago: ' + err.message);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('¿Estás seguro de que deseas cancelar tu suscripción? Perderás acceso a las funciones premium al final del período actual.')) {
      return;
    }

    setProcessing(true);
    setLocalError('');
    setSuccess('');

    try {
      await cancelSubscription();
      setSuccess('Suscripción cancelada exitosamente');
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setLocalError('Error al cancelar la suscripción: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'cancelled': return 'Cancelada';
      case 'past_due': return 'Vencida';
      case 'pending': return 'Pendiente';
      default: return 'Desconocido';
    }
  };

  const getInvoiceStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInvoiceStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Pagada';
      case 'pending': return 'Pendiente';
      case 'failed': return 'Fallida';
      default: return 'Desconocido';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación y Suscripción</h1>
          <p className="text-gray-600">Administra tu plan, pagos y facturas</p>
        </div>
        <button
          onClick={fetchBillingData}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          disabled={loading}
        >
          <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Mensajes */}
      {(error || localError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{error || localError}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <SafeIcon icon={FiCheck} className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Plan Actual */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <SafeIcon icon={FiPackage} className="w-5 h-5 mr-2 text-blue-600" />
            Plan Actual
          </h2>
        </div>
        <div className="p-6">
          {currentPlan ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <SafeIcon icon={currentPlan.icon || FiTruck} className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{currentPlan.name}</h3>
                  <p className="text-gray-600">${currentPlan.price}/mes</p>
                  {subscription && (
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(subscription.status)}`}>
                        {getStatusText(subscription.status)}
                      </span>
                      {subscription.current_period_end && (
                        <span className="text-sm text-gray-500">
                          Renovación: {new Date(subscription.current_period_end).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  disabled={processing}
                >
                  <SafeIcon icon={FiZap} className="w-4 h-4" />
                  <span>Cambiar Plan</span>
                </button>
                {subscription && subscription.status === 'active' && (
                  <button
                    onClick={handleCancelSubscription}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                    disabled={processing}
                  >
                    {processing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <SafeIcon icon={FiX} className="w-4 h-4" />
                    )}
                    <span>Cancelar</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <SafeIcon icon={FiPackage} className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay suscripción activa</h3>
              <p className="text-gray-600 mb-4">Selecciona un plan para comenzar</p>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <SafeIcon icon={FiZap} className="w-5 h-5" />
                <span>Ver Planes</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Métodos de Pago */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <SafeIcon icon={FiCreditCard} className="w-5 h-5 mr-2 text-purple-600" />
              Métodos de Pago
            </h2>
            <button 
              onClick={() => setShowPaymentMethodForm(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <SafeIcon icon={FiPlus} className="w-4 h-4" />
              <span>Agregar Tarjeta</span>
            </button>
          </div>
        </div>
        <div className="p-6">
          {paymentMethods.length > 0 ? (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-100 p-2 rounded">
                      <SafeIcon icon={FiCreditCard} className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          **** **** **** {method.last4}
                        </span>
                        <span className="text-sm text-gray-500 uppercase">{method.brand}</span>
                        {method.is_default && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Expira {method.exp_month?.toString().padStart(2, '0')}/{method.exp_year}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {!method.is_default && (
                      <button
                        onClick={() => setDefaultPaymentMethod(method.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Hacer principal
                      </button>
                    )}
                    <button
                      onClick={() => removePaymentMethod(method.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <SafeIcon icon={FiCreditCard} className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay métodos de pago</h3>
              <p className="text-gray-600">Agrega una tarjeta para gestionar tus pagos</p>
            </div>
          )}
        </div>
      </div>

      {/* Historial de Facturas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <SafeIcon icon={FiDollarSign} className="w-5 h-5 mr-2 text-green-600" />
            Historial de Facturas
          </h2>
        </div>
        <div className="p-6">
          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${invoice.amount} {invoice.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getInvoiceStatusColor(invoice.status)}`}>
                          {getInvoiceStatusText(invoice.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {invoice.download_url && (
                          <button className="text-blue-600 hover:text-blue-900 flex items-center space-x-1">
                            <SafeIcon icon={FiDownload} className="w-4 h-4" />
                            <span>Descargar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <SafeIcon icon={FiDollarSign} className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay facturas</h3>
              <p className="text-gray-600">Las facturas aparecerán aquí una vez que tengas una suscripción activa</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cambio de Plan */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Seleccionar Plan</h2>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <SafeIcon icon={FiX} className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border-2 rounded-xl p-6 relative ${
                    plan.popular ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                        <SafeIcon icon={FiStar} className="w-4 h-4" />
                        <span>Más Popular</span>
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <SafeIcon icon={plan.icon || FiTruck} className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      ${plan.price}
                      <span className="text-lg font-normal text-gray-600">/mes</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <SafeIcon icon={FiCheck} className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePlanSelect(plan)}
                    disabled={processing}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                      plan.popular
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {processing ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Procesando...
                      </div>
                    ) : (
                      currentPlan && currentPlan.id === plan.id ? 'Plan Actual' : 'Seleccionar Plan'
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Todos los planes incluyen una prueba gratuita de 14 días. Cancela en cualquier momento.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Stripe Checkout Modal - ✅ CORREGIDO: Envolver en Elements */}
      {showStripeCheckout && (
        <Elements stripe={stripePromise}>
          <StripeCheckout
            isOpen={showStripeCheckout}
            onClose={() => setShowStripeCheckout(false)}
            planDetails={selectedPlan}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </Elements>
      )}
      
      {/* Payment Method Form */}
      {showPaymentMethodForm && (
        <Elements stripe={stripePromise}>
          <PaymentMethodForm
            isOpen={showPaymentMethodForm}
            onClose={() => setShowPaymentMethodForm(false)}
            onSuccess={handleAddPaymentMethod}
            onError={(error) => setLocalError('Error al agregar método de pago: ' + error.message)}
          />
        </Elements>
      )}
    </div>
  );
};

export default BillingManagement;
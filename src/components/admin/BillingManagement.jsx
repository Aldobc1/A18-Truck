import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStripe } from '../../context/StripeContext';
import { useAuth } from '../../context/AuthContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { SUBSCRIPTION_PLANS, formatPrice, formatDate, createCheckoutSession, redirectToStripeCheckout, getCustomerPortalUrl } from '../../lib/stripe';

const { FiCreditCard, FiFileText, FiCalendar, FiDollarSign, FiCheck, FiX, FiAlertTriangle, FiExternalLink, FiDownload, FiRefreshCw, FiPackage, FiCrown, FiStar, FiZap } = FiIcons;

const BillingManagement = () => {
  const { subscription, invoices, loading, error, fetchSubscriptionData, fetchInvoicesData, cancelSubscription } = useStripe();
  const { user } = useAuth();
  const [showPlans, setShowPlans] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    // Si no hay suscripción activa, mostrar planes por defecto
    if (!loading && !subscription) {
      setShowPlans(true);
    }

    // Verificar si hay parámetros de éxito o cancelación en la URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success')) {
      setActionSuccess('¡Suscripción activada exitosamente! Los cambios pueden tardar unos minutos en reflejarse.');
      // Limpiar la URL y actualizar datos
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => {
        fetchSubscriptionData();
        fetchInvoicesData();
      }, 2000);
    } else if (urlParams.get('canceled')) {
      setActionError('El proceso de pago fue cancelado. Puedes intentarlo nuevamente cuando gustes.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [loading, subscription, fetchSubscriptionData, fetchInvoicesData]);

  const handleRefresh = async () => {
    try {
      await fetchSubscriptionData();
      await fetchInvoicesData();
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('¿Estás seguro de que deseas cancelar tu suscripción? Se cancelará al final del período de facturación actual.')) {
      return;
    }

    try {
      setProcessing(true);
      setActionError('');
      await cancelSubscription();
      setActionSuccess('Suscripción marcada para cancelación. Se cancelará al final del período actual.');
      setTimeout(() => {
        setActionSuccess('');
      }, 5000);
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setActionError('Error al cancelar la suscripción: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpgrade = async (planId) => {
    try {
      setProcessing(true);
      setActionError('');
      
      // Intentar crear checkout session con datos pre-poblados
      await createCheckoutSession(planId, user?.email, user?.name || user?.email?.split('@')[0]);
    } catch (err) {
      console.error('Error redirecting to checkout:', err);
      setActionError('Error al procesar la suscripción: ' + err.message);
      setProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!subscription?.stripe_customer_id) {
      setActionError('No se encontró información del cliente. Por favor contacta con soporte.');
      return;
    }

    try {
      setProcessing(true);
      const portalUrl = await getCustomerPortalUrl(subscription.stripe_customer_id);
      window.location.href = portalUrl;
    } catch (err) {
      console.error('Error accessing customer portal:', err);
      setActionError('Error al acceder al portal de gestión: ' + err.message);
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Activa</span>;
      case 'canceled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">Cancelada</span>;
      case 'past_due':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">Vencida</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">{status}</span>;
    }
  };

  const getInvoiceStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Pagada</span>;
      case 'open':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Pendiente</span>;
      case 'void':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">Anulada</span>;
      case 'uncollectible':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">Incobrable</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">{status}</span>;
    }
  };

  const getPlanIcon = (planId) => {
    switch (planId) {
      case 'basico':
        return FiPackage;
      case 'empresarial':
        return FiStar;
      case 'profesional':
        return FiCrown;
      default:
        return FiZap;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación y Suscripciones</h1>
          <p className="text-gray-600">Gestiona tu suscripción y revisa tus facturas</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
            <span>Actualizar</span>
          </button>
          {subscription && (
            <button
              onClick={() => setShowPlans(!showPlans)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Ver Planes
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      {(error || actionError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{error || actionError}</p>
          </div>
        </div>
      )}

      {actionSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <SafeIcon icon={FiCheck} className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{actionSuccess}</p>
          </div>
        </div>
      )}

      {/* Información del Usuario */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Información de Facturación</h3>
        <div className="text-sm text-blue-800">
          <p><strong>Email:</strong> {user?.email}</p>
          {user?.name && <p><strong>Nombre:</strong> {user.name}</p>}
        </div>
      </div>

      {/* Suscripción Actual */}
      {subscription ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <SafeIcon icon={FiCreditCard} className="w-5 h-5 mr-2 text-blue-600" />
              Suscripción Actual
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <div className="flex items-center space-x-2">
                  <SafeIcon icon={getPlanIcon(subscription.plan_type)} className="w-5 h-5 text-blue-600" />
                  <span className="text-base font-medium text-gray-900">{subscription.plan_name}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(subscription.status)}
                  {subscription.cancel_at_period_end && (
                    <span className="text-xs text-orange-600">(Se cancela al final del período)</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                <p className="text-base font-medium text-gray-900">
                  {formatPrice(subscription.price_amount / 100, subscription.price_currency?.toUpperCase())}/mes
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Próxima facturación</label>
                <p className="text-base text-gray-900">
                  {subscription.current_period_end ? formatDate(subscription.current_period_end) : 'No disponible'}
                </p>
              </div>
            </div>

            {/* Período actual */}
            {subscription.current_period_start && subscription.current_period_end && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <SafeIcon icon={FiCalendar} className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-medium text-blue-900">Período de Facturación Actual</h3>
                </div>
                <p className="text-sm text-blue-800">
                  Del {formatDate(subscription.current_period_start)} al {formatDate(subscription.current_period_end)}
                </p>
              </div>
            )}

            {/* Acciones */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleManageSubscription}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                disabled={processing}
              >
                <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                <span>Gestionar Suscripción</span>
              </button>

              {subscription.status === 'active' && !subscription.cancel_at_period_end && (
                <button
                  onClick={handleCancelSubscription}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  disabled={processing}
                >
                  {processing ? 'Procesando...' : 'Cancelar Suscripción'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 text-yellow-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">No tienes una suscripción activa</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Suscríbete a uno de nuestros planes para acceder a todas las funcionalidades.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Planes Disponibles */}
      {(showPlans || !subscription) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <SafeIcon icon={FiPackage} className="w-5 h-5 mr-2 text-purple-600" />
                Planes Disponibles
              </h2>
              {subscription && (
                <button
                  onClick={() => setShowPlans(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <SafeIcon icon={FiX} className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
                const isCurrentPlan = subscription?.plan_type === plan.id;
                const PlanIcon = getPlanIcon(plan.id);

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border rounded-xl p-6 relative ${
                      isCurrentPlan
                        ? 'border-blue-500 bg-blue-50'
                        : plan.id === 'empresarial'
                        ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {plan.id === 'empresarial' && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          Más Popular
                        </span>
                      </div>
                    )}

                    {isCurrentPlan && (
                      <div className="absolute -top-3 right-4">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          Plan Actual
                        </span>
                      </div>
                    )}

                    <div className="text-center">
                      <SafeIcon
                        icon={PlanIcon}
                        className={`w-12 h-12 mx-auto mb-4 ${
                          plan.id === 'basico'
                            ? 'text-green-600'
                            : plan.id === 'empresarial'
                            ? 'text-purple-600'
                            : 'text-yellow-600'
                        }`}
                      />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-gray-900">
                          {formatPrice(plan.price)}
                        </span>
                        <span className="text-gray-600">/{plan.interval}</span>
                      </div>

                      <ul className="text-left space-y-2 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <SafeIcon icon={FiCheck} className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isCurrentPlan || processing}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                          isCurrentPlan
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : plan.id === 'empresarial'
                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isCurrentPlan
                          ? 'Plan Actual'
                          : processing
                          ? 'Procesando...'
                          : 'Seleccionar Plan'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Historial de Facturas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <SafeIcon icon={FiFileText} className="w-5 h-5 mr-2 text-green-600" />
            Historial de Facturas
          </h2>
        </div>
        <div className="p-6">
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <SafeIcon icon={FiFileText} className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay facturas disponibles</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Período
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(invoice.created_at)}
                        </div>
                        {invoice.paid_at && (
                          <div className="text-xs text-gray-500">
                            Pagada: {formatDate(invoice.paid_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatPrice(invoice.amount_total / 100, invoice.currency?.toUpperCase())}
                        </div>
                        {invoice.amount_paid !== invoice.amount_total && (
                          <div className="text-xs text-gray-500">
                            Pagado: {formatPrice(invoice.amount_paid / 100, invoice.currency?.toUpperCase())}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getInvoiceStatusBadge(invoice.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invoice.period_start && invoice.period_end ? (
                          <div className="text-sm text-gray-900">
                            {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {invoice.hosted_invoice_url && (
                            <a
                              href={invoice.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900"
                              title="Ver factura"
                            >
                              <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                            </a>
                          )}
                          {invoice.invoice_pdf && (
                            <a
                              href={invoice.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-900"
                              title="Descargar PDF"
                            >
                              <SafeIcon icon={FiDownload} className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingManagement;
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { simulateStripeWebhook, activateSubscriptionManual } from '../../api/webhooks';

const { FiZap, FiPlay, FiCheck, FiX, FiAlertTriangle, FiSettings, FiCode } = FiIcons;

const WebhookTester = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState('checkout.session.completed');

  const webhookEvents = [
    {
      type: 'checkout.session.completed',
      name: 'Pago Completado',
      description: 'Simula un pago exitoso de Stripe',
      color: 'bg-green-600'
    },
    {
      type: 'invoice.payment_succeeded',
      name: 'Factura Pagada',
      description: 'Simula el pago exitoso de una factura',
      color: 'bg-blue-600'
    },
    {
      type: 'invoice.payment_failed',
      name: 'Pago Fallido',
      description: 'Simula un pago fallido',
      color: 'bg-red-600'
    },
    {
      type: 'customer.subscription.updated',
      name: 'Suscripción Actualizada',
      description: 'Simula la actualización de una suscripción',
      color: 'bg-purple-600'
    },
    {
      type: 'customer.subscription.deleted',
      name: 'Suscripción Cancelada',
      description: 'Simula la cancelación de una suscripción',
      color: 'bg-orange-600'
    }
  ];

  const handleSimulateWebhook = async () => {
    if (!user || !currentWorkspace) {
      setResult({
        success: false,
        error: 'Usuario o workspace no disponible'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const subscriptionData = {
        id: `sub_test_${Date.now()}`,
        customer: `cus_test_${user.id}`,
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
        workspace_id: currentWorkspace.id,
        user_id: user.id,
        plan_id: 'business',
        subscription: `sub_test_${Date.now()}`
      };

      const response = await simulateStripeWebhook(selectedEvent, subscriptionData);
      setResult(response);

    } catch (err) {
      console.error('Error simulating webhook:', err);
      setResult({
        success: false,
        error: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateManual = async () => {
    if (!user || !currentWorkspace) {
      setResult({
        success: false,
        error: 'Usuario o workspace no disponible'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await activateSubscriptionManual(
        currentWorkspace.id,
        user.id,
        'business'
      );
      setResult(response);
    } catch (err) {
      console.error('Error activating subscription:', err);
      setResult({
        success: false,
        error: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Solo mostrar para superadmin
  if (user?.role !== 'superadmin') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 text-yellow-600 mr-2" />
          <p className="text-yellow-800 text-sm">
            Solo los SuperAdmins pueden acceder al probador de webhooks.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <SafeIcon icon={FiZap} className="w-5 h-5 mr-2 text-yellow-600" />
            Probador de Webhooks de Stripe
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Simula eventos de Stripe para probar la integración de facturación
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Información del contexto */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Contexto de Prueba</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Usuario:</span>
                <p className="text-blue-800">{user?.email}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Workspace:</span>
                <p className="text-blue-800">{currentWorkspace?.name || 'No seleccionado'}</p>
              </div>
            </div>
          </div>

          {/* Selector de evento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Evento de Webhook
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {webhookEvents.map((event) => (
                <option key={event.type} value={event.type}>
                  {event.name} - {event.description}
                </option>
              ))}
            </select>
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSimulateWebhook}
              disabled={loading || !currentWorkspace}
              className="flex items-center justify-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <SafeIcon icon={FiPlay} className="w-5 h-5" />
              )}
              <span>Simular Webhook</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleActivateManual}
              disabled={loading || !currentWorkspace}
              className="flex items-center justify-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <SafeIcon icon={FiZap} className="w-5 h-5" />
              )}
              <span>Activar Manualmente</span>
            </motion.button>
          </div>

          {/* Resultado */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg border ${
                result.success
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-start space-x-2">
                <SafeIcon
                  icon={result.success ? FiCheck : FiX}
                  className={`w-5 h-5 mt-0.5 ${
                    result.success ? 'text-green-600' : 'text-red-600'
                  }`}
                />
                <div className="flex-1">
                  <h4 className="font-medium">
                    {result.success ? 'Webhook Procesado Exitosamente' : 'Error en el Webhook'}
                  </h4>
                  {result.error && (
                    <p className="text-sm mt-1">{result.error}</p>
                  )}
                  {result.success && result.data && (
                    <pre className="text-xs mt-2 bg-white p-2 rounded border overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Configuración de Webhooks */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <SafeIcon icon={FiSettings} className="w-5 h-5 mr-2 text-gray-600" />
            Configuración de Webhooks en Stripe
          </h3>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">URL del Webhook:</h4>
              <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm">
                https://tu-dominio.com/api/webhooks/stripe
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Eventos a Configurar:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {webhookEvents.map((event) => (
                  <div key={event.type} className="flex items-center space-x-2">
                    <SafeIcon icon={FiCode} className="w-4 h-4 text-gray-500" />
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {event.type}
                    </code>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-yellow-800 text-sm">
                  <p className="font-medium mb-1">Nota Importante:</p>
                  <p>
                    Para producción, configura estos webhooks en tu dashboard de Stripe
                    apuntando a tu servidor backend que procesará los eventos y actualizará
                    la base de datos de Supabase.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebhookTester;
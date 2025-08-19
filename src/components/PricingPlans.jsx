import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Elements } from '@stripe/react-stripe-js';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import stripePromise from '../lib/stripe';
import StripeCheckout from './stripe/StripeCheckout';

const { FiCheck, FiCreditCard, FiTruck, FiUsers, FiBarChart, FiShield, FiZap, FiStar } = FiIcons;

const PricingPlans = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = [
    {
      id: "basic",
      name: "Básico",
      amount: 499,
      priceId: "price_1RxtxD3DpfSyrm2Bl6SI8cOe",
      paymentLink: "https://buy.stripe.com/test_eVqdR2b0u3qM5z96LwcQU00",
      currency: "USD",
      interval: "month",
      description: "Perfecto para pequeñas operaciones",
      icon: FiTruck,
      color: "blue",
      features: [
        "Hasta 5 camiones",
        "Gestión básica de proyectos",
        "Registros de salida/entrega",
        "Soporte por email",
        "Dashboard básico"
      ]
    },
    {
      id: "business",
      name: "Empresarial",
      amount: 899,
      priceId: "price_1RxtxD3DpfSyrm2BkBQ9FRZS",
      paymentLink: "https://buy.stripe.com/test_00w3co7OiaTe8Ll4DocQU02",
      currency: "USD",
      interval: "month",
      description: "Ideal para empresas en crecimiento",
      icon: FiUsers,
      color: "purple",
      popular: true,
      features: [
        "Hasta 25 camiones",
        "Gestión avanzada de proyectos",
        "Múltiples workspaces",
        "Análisis y reportes",
        "Soporte prioritario",
        "Integración NFC",
        "Gestión de usuarios"
      ]
    },
    {
      id: "professional",
      name: "Profesional",
      amount: 1499,
      priceId: "price_1RxtxD3DpfSyrm2BWn1FdDdu",
      paymentLink: "https://buy.stripe.com/test_eVq6oA7Oi0eAbXxgm6cQU01",
      currency: "USD",
      interval: "month",
      description: "Para operaciones empresariales grandes",
      icon: FiBarChart,
      color: "green",
      features: [
        "Camiones ilimitados",
        "Proyectos ilimitados",
        "Workspaces ilimitados",
        "Analytics avanzados",
        "Soporte 24/7",
        "API personalizada",
        "Integraciones personalizadas",
        "Gerente de cuenta dedicado"
      ]
    }
  ];

  const handlePlanClick = (plan) => {
    // Para demo, primero intentamos con Stripe Checkout integrado
    setSelectedPlan({
      ...plan,
      price: isAnnual ? Math.round(plan.amount * 0.8) : plan.amount
    });
    setShowStripeCheckout(true);
    
    // Fallback: abrir enlace de Stripe si el checkout integrado falla
    // setTimeout(() => {
    //   window.open(plan.paymentLink, '_blank');
    // }, 500);
  };

  const handlePaymentSuccess = (paymentIntent) => {
    console.log('Payment succeeded:', paymentIntent);
    alert('¡Pago exitoso! Tu suscripción ha sido activada.');
  };

  const handlePaymentError = (error) => {
    console.error('Payment failed:', error);
    // Fallback a Stripe Checkout externo
    if (selectedPlan?.paymentLink) {
      window.open(selectedPlan.paymentLink, '_blank');
    }
  };

  const getColorClasses = (color, popular = false) => {
    const colors = {
      blue: {
        bg: popular ? 'bg-blue-600' : 'bg-white',
        border: popular ? 'border-blue-600' : 'border-gray-200',
        text: popular ? 'text-white' : 'text-gray-900',
        button: 'bg-blue-600 hover:bg-blue-700 text-white',
        icon: 'text-blue-600',
        accent: 'text-blue-600'
      },
      purple: {
        bg: popular ? 'bg-purple-600' : 'bg-white',
        border: popular ? 'border-purple-600' : 'border-gray-200',
        text: popular ? 'text-white' : 'text-gray-900',
        button: 'bg-purple-600 hover:bg-purple-700 text-white',
        icon: 'text-purple-600',
        accent: 'text-purple-600'
      },
      green: {
        bg: popular ? 'bg-green-600' : 'bg-white',
        border: popular ? 'border-green-600' : 'border-gray-200',
        text: popular ? 'text-white' : 'text-gray-900',
        button: 'bg-green-600 hover:bg-green-700 text-white',
        icon: 'text-green-600',
        accent: 'text-green-600'
      }
    };
    return colors[color];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4"
          >
            Planes de Suscripción
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 mb-8"
          >
            Elige el plan perfecto para tu operación de camiones
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center space-x-4"
          >
            <span className={`text-sm font-medium ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
              Mensual
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAnnual ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnnual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
              Anual
            </span>
            {isAnnual && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Ahorra 20%
              </span>
            )}
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-6">
          {plans.map((plan, index) => {
            const colorClasses = getColorClasses(plan.color, plan.popular);
            const price = isAnnual ? Math.round(plan.amount * 0.8) : plan.amount;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`relative rounded-2xl shadow-lg ${colorClasses.bg} ${colorClasses.border} border-2 p-8 ${
                  plan.popular ? 'transform scale-105' : ''
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
                      <SafeIcon icon={FiStar} className="w-4 h-4 mr-1" />
                      Más Popular
                    </span>
                  </div>
                )}

                {/* Plan Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-6 ${
                  plan.popular ? 'bg-white bg-opacity-20' : 'bg-gray-100'
                }`}>
                  <SafeIcon 
                    icon={plan.icon} 
                    className={`w-6 h-6 ${plan.popular ? 'text-white' : colorClasses.icon}`} 
                  />
                </div>

                {/* Plan Name */}
                <h3 className={`text-2xl font-bold mb-2 ${colorClasses.text}`}>
                  {plan.name}
                </h3>

                {/* Plan Description */}
                <p className={`text-sm mb-6 ${plan.popular ? 'text-white text-opacity-90' : 'text-gray-600'}`}>
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline">
                    <span className={`text-4xl font-bold ${colorClasses.text}`}>
                      ${price}
                    </span>
                    <span className={`text-lg ml-1 ${plan.popular ? 'text-white text-opacity-75' : 'text-gray-500'}`}>
                      /{isAnnual ? 'año' : 'mes'}
                    </span>
                  </div>
                  {isAnnual && (
                    <p className={`text-sm mt-1 ${plan.popular ? 'text-white text-opacity-75' : 'text-gray-500'}`}>
                      ${plan.amount}/mes facturado anualmente
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <SafeIcon 
                        icon={FiCheck} 
                        className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${
                          plan.popular ? 'text-white' : colorClasses.accent
                        }`} 
                      />
                      <span className={`text-sm ${plan.popular ? 'text-white text-opacity-90' : 'text-gray-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handlePlanClick(plan)}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
                    plan.popular 
                      ? 'bg-white text-purple-600 hover:bg-gray-100' 
                      : colorClasses.button
                  }`}
                >
                  <SafeIcon icon={FiCreditCard} className="w-5 h-5" />
                  <span>Comenzar Ahora</span>
                </motion.button>

                {/* Security Badge */}
                <div className="flex items-center justify-center mt-4 space-x-2">
                  <SafeIcon 
                    icon={FiShield} 
                    className={`w-4 h-4 ${plan.popular ? 'text-white text-opacity-75' : 'text-gray-400'}`} 
                  />
                  <span className={`text-xs ${plan.popular ? 'text-white text-opacity-75' : 'text-gray-500'}`}>
                    Pago seguro con Stripe
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-16"
        >
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              ¿Necesitas un plan personalizado?
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              Para empresas con necesidades específicas, ofrecemos soluciones personalizadas
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gray-900 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2">
                <SafeIcon icon={FiUsers} className="w-5 h-5" />
                <span>Contactar Ventas</span>
              </button>
              <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
                <SafeIcon icon={FiZap} className="w-5 h-5" />
                <span>Ver Demo</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Preguntas Frecuentes
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Puedo cambiar de plan en cualquier momento?
              </h3>
              <p className="text-gray-600">
                Sí, puedes actualizar o degradar tu plan en cualquier momento. Los cambios se aplicarán en tu próximo ciclo de facturación.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Ofrecen una prueba gratuita?
              </h3>
              <p className="text-gray-600">
                Sí, todos nuestros planes incluyen una prueba gratuita de 14 días. No se requiere tarjeta de crédito para comenzar.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Qué métodos de pago aceptan?
              </h3>
              <p className="text-gray-600">
                Aceptamos todas las principales tarjetas de crédito y débito a través de Stripe, nuestro procesador de pagos seguro.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stripe Checkout Modal */}
      <Elements stripe={stripePromise}>
        <StripeCheckout
          isOpen={showStripeCheckout}
          onClose={() => setShowStripeCheckout(false)}
          planDetails={selectedPlan}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      </Elements>
    </div>
  );
};

export default PricingPlans;
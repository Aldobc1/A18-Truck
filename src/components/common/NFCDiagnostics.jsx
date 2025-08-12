import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiWifi, FiSmartphone, FiAlertTriangle, FiCheckCircle, FiXCircle, FiInfo } = FiIcons;

const NFCDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState({
    nfcSupported: false,
    isHttps: false,
    browser: '',
    platform: '',
    permissions: 'unknown'
  });

  useEffect(() => {
    const runDiagnostics = async () => {
      const userAgent = navigator.userAgent;
      let browser = 'Desconocido';
      
      if (userAgent.includes('Chrome')) browser = 'Chrome';
      else if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Safari')) browser = 'Safari';
      else if (userAgent.includes('Edge')) browser = 'Edge';
      
      const isAndroid = userAgent.includes('Android');
      const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad');
      const platform = isAndroid ? 'Android' : isIOS ? 'iOS' : 'Desktop';
      
      let permissions = 'unknown';
      try {
        if ('permissions' in navigator && 'NDEFReader' in window) {
          const permission = await navigator.permissions.query({ name: 'nfc' });
          permissions = permission.state;
        }
      } catch (error) {
        permissions = 'error';
      }

      setDiagnostics({
        nfcSupported: 'NDEFReader' in window,
        isHttps: location.protocol === 'https:',
        browser,
        platform,
        permissions
      });
    };

    runDiagnostics();
  }, []);

  const getStatusIcon = (status) => {
    if (status === true) return <SafeIcon icon={FiCheckCircle} className="w-5 h-5 text-green-600" />;
    if (status === false) return <SafeIcon icon={FiXCircle} className="w-5 h-5 text-red-600" />;
    return <SafeIcon icon={FiInfo} className="w-5 h-5 text-yellow-600" />;
  };

  const getRecommendations = () => {
    const recommendations = [];
    
    if (!diagnostics.nfcSupported) {
      recommendations.push('Usa Chrome en Android para soporte completo de NFC');
    }
    
    if (!diagnostics.isHttps) {
      recommendations.push('Accede desde HTTPS para habilitar NFC');
    }
    
    if (diagnostics.platform === 'iOS') {
      recommendations.push('iOS no soporta NFC Web API - usa el modo manual');
    }
    
    if (diagnostics.browser === 'Firefox') {
      recommendations.push('Firefox no soporta NFC Web API - usa Chrome');
    }
    
    if (diagnostics.permissions === 'denied') {
      recommendations.push('Permite el acceso a NFC en la configuración del navegador');
    }

    return recommendations;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center space-x-3 mb-6">
        <SafeIcon icon={FiWifi} className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Diagnóstico NFC</h2>
          <p className="text-gray-600">Estado del soporte NFC en tu dispositivo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estado Técnico */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 mb-3">Estado Técnico</h3>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">NFC API Soportada</span>
            {getStatusIcon(diagnostics.nfcSupported)}
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Conexión HTTPS</span>
            {getStatusIcon(diagnostics.isHttps)}
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Navegador</span>
            <span className="font-mono text-sm text-gray-600">{diagnostics.browser}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Plataforma</span>
            <span className="font-mono text-sm text-gray-600">{diagnostics.platform}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Permisos NFC</span>
            <span className={`font-semibold text-sm ${
              diagnostics.permissions === 'granted' ? 'text-green-600' :
              diagnostics.permissions === 'denied' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {diagnostics.permissions === 'granted' ? 'Concedidos' :
               diagnostics.permissions === 'denied' ? 'Denegados' : 'Desconocidos'}
            </span>
          </div>
        </div>

        {/* Recomendaciones */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 mb-3">Recomendaciones</h3>
          
          {getRecommendations().length === 0 ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <SafeIcon icon={FiCheckCircle} className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">¡Todo está configurado correctamente!</span>
              </div>
              <p className="text-green-700 text-sm mt-2">
                Tu dispositivo debería poder leer etiquetas NFC sin problemas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {getRecommendations().map((recommendation, index) => (
                <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <SafeIcon icon={FiAlertTriangle} className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="text-yellow-800 text-sm">{recommendation}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Instrucciones adicionales */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <SafeIcon icon={FiSmartphone} className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-800 font-medium text-sm mb-2">Configuración del Dispositivo:</p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Activa NFC en Configuraciones → Conexiones</li>
                  <li>• Permite permisos de NFC para el navegador</li>
                  <li>• Mantén la pantalla desbloqueada durante el escaneo</li>
                  <li>• Acerca el dispositivo a 1-2 cm de la etiqueta</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botón de prueba */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-center">
          <p className="text-gray-600 text-sm mb-4">
            Si NFC no funciona, siempre puedes usar el modo manual para seleccionar camiones.
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Actualizar Diagnóstico
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default NFCDiagnostics;
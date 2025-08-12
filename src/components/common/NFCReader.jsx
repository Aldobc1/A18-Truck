import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiWifi, FiX, FiSmartphone, FiAlertTriangle, FiInfo, FiSettings, FiRefreshCw } = FiIcons;

const NFCReader = ({ onRead, onClose, onTimeout }) => {
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(15);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [browserInfo, setBrowserInfo] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [permissionState, setPermissionState] = useState('unknown');
  const [scanAttempts, setScanAttempts] = useState(0);
  const [lastError, setLastError] = useState('');

  useEffect(() => {
    // Detectar información del navegador
    const userAgent = navigator.userAgent;
    let browser = 'Desconocido';
    
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    const isAndroid = userAgent.includes('Android');
    const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad');
    
    setBrowserInfo(`${browser} - ${isAndroid ? 'Android' : isIOS ? 'iOS' : 'Desktop'}`);

    let abortController;
    let timeoutId;
    let countdownId;
    let ndef;

    const startNFCRead = async () => {
      // Verificar soporte de NFC
      if (!('NDEFReader' in window)) {
        setNfcSupported(false);
        setError(`NFC no soportado en ${browserInfo}. Usa el botón "Generar Tag de Prueba" para continuar.`);
        setShowDiagnostics(true);
        return;
      }

      try {
        setNfcSupported(true);
        setIsReading(true);
        setError('');
        setScanAttempts(prev => prev + 1);
        
        // Verificar permisos de NFC
        try {
          if ('permissions' in navigator) {
            const permission = await navigator.permissions.query({ name: 'nfc' });
            setPermissionState(permission.state);
            console.log('NFC Permission:', permission.state);
            
            if (permission.state === 'denied') {
              throw new Error('Permisos de NFC denegados. Habilita NFC en Configuración → Apps → Chrome → Permisos.');
            }
          }
        } catch (permError) {
          console.warn('Could not check NFC permissions:', permError);
          setPermissionState('unknown');
        }
        
        // Crear nuevo AbortController para cada intento
        abortController = new AbortController();
        
        // Crear instancia de NDEFReader
        ndef = new window.NDEFReader();
        
        // Configurar event listeners ANTES de iniciar el scan
        const handleReading = (event) => {
          console.log('🎉 NFC Tag detected!', event);
          console.log('Serial Number:', event.serialNumber);
          console.log('Message:', event.message);
          
          // Limpiar timeouts
          if (timeoutId) clearTimeout(timeoutId);
          if (countdownId) clearInterval(countdownId);
          
          // Detener lectura
          setIsReading(false);
          
          // Usar serialNumber como identificador único
          const tagId = event.serialNumber || `NFC_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
          
          console.log('📤 Sending tag ID:', tagId);
          onRead(tagId);
        };

        const handleReadingError = (event) => {
          console.error('❌ NFC Reading Error:', event);
          setLastError(`Error de lectura: ${event.error?.message || 'Error desconocido'}`);
          setError('Error al leer la etiqueta NFC. Acerca más el dispositivo y mantén la etiqueta estable.');
          
          // No detener completamente, permitir reintentos
          setTimeout(() => {
            if (scanAttempts < 3) {
              console.log('🔄 Reintentando lectura NFC...');
              setError('');
            }
          }, 2000);
        };

        // Agregar event listeners
        ndef.addEventListener('reading', handleReading);
        ndef.addEventListener('readingerror', handleReadingError);

        console.log('🚀 Iniciando scan NFC...');
        
        // Iniciar el scan
        await ndef.scan({ signal: abortController.signal });
        
        console.log('✅ NFC scan iniciado exitosamente');
        
        // Countdown timer
        countdownId = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(countdownId);
              if (abortController && !abortController.signal.aborted) {
                abortController.abort();
              }
              if (onTimeout) {
                onTimeout();
              }
              setIsReading(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // Timeout principal
        timeoutId = setTimeout(() => {
          if (abortController && !abortController.signal.aborted) {
            abortController.abort();
          }
          if (onTimeout) {
            onTimeout();
          }
          setIsReading(false);
        }, 15000); // 15 segundos

      } catch (error) {
        console.error('❌ NFC Error:', error);
        setLastError(error.message);
        
        // Manejar errores específicos
        if (error.name === 'AbortError') {
          console.log('⏹️ NFC scan abortado');
          if (timeLeft > 0) {
            setError('Escaneo cancelado. Intenta nuevamente.');
          }
        } else if (error.name === 'NotAllowedError') {
          setError('❌ Permisos de NFC denegados. Ve a Configuración → Apps → Chrome → Permisos y habilita NFC.');
        } else if (error.name === 'NotSupportedError') {
          setError('❌ NFC no soportado en este dispositivo.');
        } else if (error.name === 'InvalidStateError') {
          setError('❌ NFC no está disponible. Verifica que esté activado en Configuración.');
        } else {
          setError(`❌ Error: ${error.message}`);
        }
        
        setIsReading(false);
        if (countdownId) clearInterval(countdownId);
        if (timeoutId) clearTimeout(timeoutId);
        
        // Mostrar diagnósticos automáticamente en caso de error
        setShowDiagnostics(true);
      }
    };

    // Delay para evitar problemas de inicialización
    const initTimeout = setTimeout(() => {
      startNFCRead();
    }, 500);

    return () => {
      console.log('🧹 Limpiando recursos NFC...');
      clearTimeout(initTimeout);
      
      if (abortController && !abortController.signal.aborted) {
        abortController.abort();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (countdownId) {
        clearInterval(countdownId);
      }
      
      // Remover event listeners
      if (ndef) {
        ndef.removeEventListener('reading', () => {});
        ndef.removeEventListener('readingerror', () => {});
      }
    };
  }, [onRead, onTimeout, browserInfo, scanAttempts]);

  const handleClose = () => {
    setIsReading(false);
    onClose();
  };

  const handleManualSelect = () => {
    if (onTimeout) {
      onTimeout();
    } else {
      handleClose();
    }
  };

  const generateTestTag = () => {
    const testTag = `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    console.log('🧪 Generando tag de prueba:', testTag);
    onRead(testTag);
  };

  const retryNFCScan = () => {
    setError('');
    setLastError('');
    setShowDiagnostics(false);
    setTimeLeft(15);
    setScanAttempts(0);
    window.location.reload();
  };

  const checkNFCStatus = async () => {
    try {
      if ('NDEFReader' in window) {
        const ndef = new window.NDEFReader();
        console.log('✅ NDEFReader disponible');
        
        // Verificar permisos
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({ name: 'nfc' });
          console.log('🔐 Permisos NFC:', permission.state);
          setPermissionState(permission.state);
        }
        
        return true;
      } else {
        console.log('❌ NDEFReader no disponible');
        return false;
      }
    } catch (error) {
      console.error('❌ Error verificando NFC:', error);
      return false;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-center max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Lector NFC</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="text-blue-500 hover:text-blue-700 transition-colors"
              title="Mostrar diagnósticos"
            >
              <SafeIcon icon={FiInfo} className="w-5 h-5" />
            </button>
            <button
              onClick={checkNFCStatus}
              className="text-green-500 hover:text-green-700 transition-colors"
              title="Verificar estado NFC"
            >
              <SafeIcon icon={FiRefreshCw} className="w-5 h-5" />
            </button>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Diagnósticos */}
        {showDiagnostics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-gray-50 rounded-lg text-left text-sm"
          >
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
              <SafeIcon icon={FiSettings} className="w-4 h-4 mr-2" />
              Diagnósticos NFC
            </h3>
            <div className="space-y-2 text-gray-600">
              <div className="flex justify-between">
                <span>Navegador:</span>
                <span className="font-mono text-xs">{browserInfo}</span>
              </div>
              <div className="flex justify-between">
                <span>NFC API:</span>
                <span className={`font-semibold ${nfcSupported ? 'text-green-600' : 'text-red-600'}`}>
                  {nfcSupported ? 'Soportado' : 'No Soportado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>HTTPS:</span>
                <span className={`font-semibold ${location.protocol === 'https:' ? 'text-green-600' : 'text-red-600'}`}>
                  {location.protocol === 'https:' ? 'Sí' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Permisos:</span>
                <span className={`font-semibold ${
                  permissionState === 'granted' ? 'text-green-600' :
                  permissionState === 'denied' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {permissionState === 'granted' ? 'Concedidos' :
                   permissionState === 'denied' ? 'Denegados' : 'Desconocidos'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Intentos:</span>
                <span className="font-semibold text-blue-600">{scanAttempts}</span>
              </div>
              {lastError && (
                <div className="flex justify-between">
                  <span>Último error:</span>
                  <span className="font-mono text-xs text-red-600 truncate max-w-32">{lastError}</span>
                </div>
              )}
            </div>
            
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <SafeIcon icon={FiInfo} className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-semibold mb-1">📱 Para leer etiquetas NFC reales:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Activa NFC en Configuración → Conexiones</li>
                    <li>Permite permisos NFC en Chrome</li>
                    <li>Mantén pantalla desbloqueada</li>
                    <li>Acerca la etiqueta a 1-2 cm del teléfono</li>
                    <li>Mantén la etiqueta estable por 2-3 segundos</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="mb-6">
          <motion.div
            animate={isReading ? { scale: [1, 1.1, 1], rotate: [0, 360] } : {}}
            transition={{ duration: 2, repeat: isReading ? Infinity : 0, ease: "linear" }}
            className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4 relative"
          >
            <SafeIcon icon={FiWifi} className="w-10 h-10 text-blue-600" />
            {isReading && timeLeft > 0 && (
              <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                {timeLeft}
              </div>
            )}
          </motion.div>

          {isReading ? (
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                🏷️ Acerca la etiqueta NFC
              </p>
              <p className="text-gray-600">
                Mantén la etiqueta cerca del dispositivo (1-2 cm) por 2-3 segundos
              </p>
              {timeLeft > 0 && (
                <p className="text-sm text-blue-600 mt-2">
                  ⏱️ Tiempo restante: {timeLeft}s
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Intento #{scanAttempts}
              </p>
            </div>
          ) : error ? (
            <div>
              <p className="text-lg font-medium text-red-600 mb-2">❌ Error</p>
              <p className="text-gray-600 text-sm mb-3">{error}</p>
              {nfcSupported && (
                <button
                  onClick={retryNFCScan}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  🔄 Intentar nuevamente
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">⚡ Preparando lector...</p>
              <p className="text-gray-600">Espera un momento</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 mb-6">
          <SafeIcon icon={FiSmartphone} className="w-4 h-4" />
          <span>
            {nfcSupported 
              ? '📡 NFC listo - acerca una etiqueta'
              : '⚠️ NFC no disponible - usa modo de prueba'
            }
          </span>
        </div>

        <div className="space-y-3">
          {/* Botón para generar tag de prueba */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={generateTestTag}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            🧪 Generar Tag de Prueba
          </motion.button>

          {onTimeout && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleManualSelect}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              📋 Seleccionar Manualmente
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClose}
            className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            ❌ Cancelar
          </motion.button>
        </div>

        {/* Información adicional */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg text-left">
          <p className="text-xs text-blue-800 font-semibold mb-1">💡 Consejos para lectura real:</p>
          <p className="text-xs text-blue-700">
            • 📱 Mantén el teléfono desbloqueado<br/>
            • 🏷️ Usa etiquetas NFC reales (no stickers normales)<br/>
            • 📏 Acerca la etiqueta a 1-2 cm del teléfono<br/>
            • ⏱️ Mantén la etiqueta estable por 2-3 segundos<br/>
            • 🔄 Si no funciona, usa "Generar Tag de Prueba"
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default NFCReader;
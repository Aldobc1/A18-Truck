import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import NFCReader from './common/NFCReader';

const { FiLogOut, FiTruck, FiMapPin, FiClock, FiCheck, FiList, FiPlus, FiChevronDown, FiUser, FiFolder, FiAlertTriangle } = FiIcons;

const CheckerDashboard = () => {
  const { user, logout } = useAuth();
  const { trucks, exitPoints, deliveryPoints, addRecord, records } = useData();
  const [showNFCReader, setShowNFCReader] = useState(false);
  const [step, setStep] = useState('scan');
  const [currentTag, setCurrentTag] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedPoint, setSelectedPoint] = useState('');
  const [currentTruck, setCurrentTruck] = useState(null);
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [activeView, setActiveView] = useState('register');

  const handleNFCRead = (tagId) => {
    const truck = trucks.find(t => t.nfcTag === tagId);
    if (truck) {
      setCurrentTag(tagId);
      setCurrentTruck(truck);
      setShowNFCReader(false);
      setStep('selectType');
    } else {
      alert('Etiqueta NFC no registrada');
      setShowNFCReader(false);
    }
  };

  const handleManualTruckSelect = (truck) => {
    setCurrentTruck(truck);
    setCurrentTag(truck.nfcTag);
    setShowManualSelect(false);
    setStep('selectType');
  };

  const handleNFCTimeout = () => {
    setShowNFCReader(false);
    setShowManualSelect(true);
    setStep('selectTruck');
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setStep('selectPoint');
  };

  const handlePointSelect = (point) => {
    setSelectedPoint(point);
    setStep('confirm');
  };

  const handleConfirm = () => {
    const now = new Date().toISOString();
    const record = {
      nfcTag: currentTag,
      truck: currentTruck.plates,
      capacity: currentTruck.capacity,
      materialM3: currentTruck.capacity
    };

    if (selectedType === 'exit') {
      record.exitTime = now;
      record.exitPoint = selectedPoint;
    } else {
      record.deliveryTime = now;
      record.deliveryPoint = selectedPoint;
    }

    addRecord(record);
    
    setStep('scan');
    setCurrentTag('');
    setSelectedType('');
    setSelectedPoint('');
    setCurrentTruck(null);
    setShowManualSelect(false);
    alert('Registro guardado exitosamente');
  };

  const resetProcess = () => {
    setStep('scan');
    setCurrentTag('');
    setSelectedType('');
    setSelectedPoint('');
    setCurrentTruck(null);
    setShowNFCReader(false);
    setShowManualSelect(false);
  };

  const processedRecords = records.slice(-10).reverse().map(record => {
    const truck = trucks.find(t => t.plates === record.truck);
    const isCompleted = record.exitTime && record.deliveryTime;
    
    let actualTravelTime = 0;
    let hasAnomaly = false;
    
    if (isCompleted) {
      const exitTime = new Date(record.exitTime);
      const deliveryTime = new Date(record.deliveryTime);
      actualTravelTime = Math.round((deliveryTime - exitTime) / (1000 * 60));
      
      if (truck && actualTravelTime > truck.estimatedTravelTime) {
        hasAnomaly = true;
      }
    }
    
    return {
      ...record,
      truck: truck,
      isCompleted,
      actualTravelTime,
      hasAnomaly
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SafeIcon icon={FiTruck} className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Control de Camiones</h1>
              <p className="text-sm text-gray-600">Checador: {user.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView('register')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeView === 'register' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <SafeIcon icon={FiPlus} className="w-4 h-4 mr-2 inline" />
                Registrar
              </button>
              <button
                onClick={() => setActiveView('history')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeView === 'history' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <SafeIcon icon={FiList} className="w-4 h-4 mr-2 inline" />
                Historial
              </button>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <SafeIcon icon={FiLogOut} className="w-5 h-5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-md mx-auto">
          {activeView === 'register' && (
            <>
              {step === 'scan' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg p-8 text-center"
                >
                  <div className="mb-6">
                    <SafeIcon icon={FiTruck} className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Registrar Camión</h2>
                    <p className="text-gray-600">Toca el botón para escanear la etiqueta NFC</p>
                  </div>
                  <div className="space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowNFCReader(true)}
                      className="w-full bg-blue-600 text-white py-4 rounded-xl font-medium text-lg hover:bg-blue-700 transition-colors"
                    >
                      Escanear NFC
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setShowManualSelect(true);
                        setStep('selectTruck');
                      }}
                      className="w-full bg-gray-600 text-white py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
                    >
                      Seleccionar Manualmente
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {step === 'selectTruck' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Seleccionar Camión</h2>
                    <p className="text-gray-600">Elige el camión a registrar</p>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {trucks.map((truck) => (
                      <button
                        key={truck.id}
                        onClick={() => handleManualTruckSelect(truck)}
                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <SafeIcon icon={FiTruck} className="w-6 h-6 text-blue-600" />
                            <div>
                              <p className="font-medium text-gray-900">{truck.plates}</p>
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <SafeIcon icon={FiUser} className="w-3 h-3" />
                                <span>{truck.driverName}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <SafeIcon icon={FiFolder} className="w-3 h-3" />
                                <span>{truck.projectName}</span>
                              </div>
                            </div>
                          </div>
                          <SafeIcon icon={FiChevronDown} className="w-4 h-4 text-gray-400 rotate-270" />
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={resetProcess}
                    className="w-full mt-4 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                </motion.div>
              )}

              {step === 'selectType' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Seleccionar Tipo</h2>
                    <div className="text-gray-600 space-y-1">
                      <p>Camión: {currentTruck?.plates}</p>
                      <div className="flex items-center justify-center space-x-2 text-sm">
                        <SafeIcon icon={FiUser} className="w-4 h-4" />
                        <span>{currentTruck?.driverName}</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2 text-sm">
                        <SafeIcon icon={FiFolder} className="w-4 h-4" />
                        <span>{currentTruck?.projectName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <button
                      onClick={() => handleTypeSelect('exit')}
                      className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                    >
                      Salida
                    </button>
                    <button
                      onClick={() => handleTypeSelect('delivery')}
                      className="w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
                    >
                      Entrega
                    </button>
                  </div>
                  <button
                    onClick={resetProcess}
                    className="w-full mt-4 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                </motion.div>
              )}

              {step === 'selectPoint' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      Seleccionar {selectedType === 'exit' ? 'Punto de Salida' : 'Punto de Entrega'}
                    </h2>
                    <p className="text-gray-600">Camión: {currentTruck?.plates}</p>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {(selectedType === 'exit' ? exitPoints : deliveryPoints).map((point) => (
                      <button
                        key={point.id}
                        onClick={() => handlePointSelect(point.name)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <SafeIcon icon={FiMapPin} className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{point.name}</p>
                            <p className="text-sm text-gray-600">{point.address}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={resetProcess}
                    className="w-full mt-4 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                </motion.div>
              )}

              {step === 'confirm' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <div className="text-center mb-6">
                    <SafeIcon icon={FiCheck} className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Confirmar Registro</h2>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Camión:</span>
                      <span className="font-medium">{currentTruck?.plates}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Chofer:</span>
                      <span className="font-medium">{currentTruck?.driverName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Proyecto:</span>
                      <span className="font-medium">{currentTruck?.projectName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <span className="font-medium">{selectedType === 'exit' ? 'Salida' : 'Entrega'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Punto:</span>
                      <span className="font-medium">{selectedPoint}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hora:</span>
                      <span className="font-medium">{new Date().toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={handleConfirm}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      Confirmar Registro
                    </button>
                    <button
                      onClick={resetProcess}
                      className="w-full text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          )}

          {activeView === 'history' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="text-center mb-6">
                <SafeIcon icon={FiList} className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Historial de Registros</h2>
                <p className="text-gray-600">Últimos 10 registros realizados</p>
              </div>
              
              {processedRecords.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay registros disponibles</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {processedRecords.map((record, index) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <SafeIcon icon={FiTruck} className="w-6 h-6 text-blue-600" />
                          <div>
                            <span className="font-medium text-gray-900">{record.truck?.plates || 'N/A'}</span>
                            <div className="flex items-center space-x-2 text-xs text-gray-600">
                              <SafeIcon icon={FiUser} className="w-3 h-3" />
                              <span>{record.truck?.driverName || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.isCompleted
                              ? 'bg-green-100 text-green-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {record.isCompleted ? 'Completado' : 'Pendiente'}
                          </span>
                          {record.hasAnomaly && (
                            <SafeIcon icon={FiAlertTriangle} className="w-4 h-4 text-yellow-600" title="Anomalía detectada" />
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center space-x-2">
                          <SafeIcon icon={FiFolder} className="w-4 h-4 text-purple-600" />
                          <span>{record.truck?.projectName || 'Sin proyecto'}</span>
                        </div>
                        
                        {record.exitTime && (
                          <div className="flex items-center space-x-2">
                            <SafeIcon icon={FiMapPin} className="w-4 h-4 text-orange-600" />
                            <span>Salida: {record.exitPoint} - {new Date(record.exitTime).toLocaleString()}</span>
                          </div>
                        )}
                        
                        {record.deliveryTime && (
                          <div className="flex items-center space-x-2">
                            <SafeIcon icon={FiMapPin} className="w-4 h-4 text-green-600" />
                            <span>Entrega: {record.deliveryPoint} - {new Date(record.deliveryTime).toLocaleString()}</span>
                          </div>
                        )}
                        
                        {record.isCompleted && (
                          <div className="flex items-center space-x-2">
                            <SafeIcon icon={FiClock} className="w-4 h-4 text-blue-600" />
                            <span>Tiempo: {record.actualTravelTime} min (Est: {record.truck?.estimatedTravelTime || 'N/A'} min)</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>

      {showNFCReader && (
        <NFCReader
          onRead={handleNFCRead}
          onClose={() => setShowNFCReader(false)}
          onTimeout={handleNFCTimeout}
        />
      )}
    </div>
  );
};

export default CheckerDashboard;
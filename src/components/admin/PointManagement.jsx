import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useData } from '../../context/DataContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiMapPin, FiPlus, FiEdit, FiTrash2 } = FiIcons;

const PointManagement = () => {
  const { exitPoints, deliveryPoints, addExitPoint, addDeliveryPoint } = useData();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('exit');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: 'exit'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.type === 'exit') {
      addExitPoint(formData);
    } else {
      addDeliveryPoint(formData);
    }
    setFormData({ name: '', address: '', type: 'exit' });
    setShowForm(false);
  };

  const openForm = (type) => {
    setFormData({ name: '', address: '', type });
    setShowForm(true);
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Gestión de Puntos</h1>
          <p className="text-gray-600 text-sm lg:text-base">Administra los puntos de salida y entrega</p>
        </div>
        <div className="flex flex-col space-y-2 lg:flex-row lg:space-y-0 lg:space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openForm('exit')}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2 text-sm lg:text-base"
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4 lg:w-5 lg:h-5" />
            <span>Punto de Salida</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openForm('delivery')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 text-sm lg:text-base"
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4 lg:w-5 lg:h-5" />
            <span>Punto de Entrega</span>
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('exit')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors text-sm lg:text-base ${
            activeTab === 'exit'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Puntos de Salida ({exitPoints.length})
        </button>
        <button
          onClick={() => setActiveTab('delivery')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors text-sm lg:text-base ${
            activeTab === 'delivery'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Puntos de Entrega ({deliveryPoints.length})
        </button>
      </div>

      {/* Points List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 lg:p-6">
          {(activeTab === 'exit' ? exitPoints : deliveryPoints).length === 0 ? (
            <div className="text-center py-8 lg:py-12">
              <SafeIcon icon={FiMapPin} className="w-12 h-12 lg:w-16 lg:h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm lg:text-base">
                No hay puntos de {activeTab === 'exit' ? 'salida' : 'entrega'} registrados
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {(activeTab === 'exit' ? exitPoints : deliveryPoints).map((point, index) => (
                <motion.div
                  key={point.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4 lg:p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3 lg:mb-4">
                    <SafeIcon 
                      icon={FiMapPin} 
                      className={`w-8 h-8 lg:w-10 lg:h-10 ${
                        activeTab === 'exit' ? 'text-orange-600' : 'text-green-600'
                      }`} 
                    />
                  </div>
                  <div className="space-y-2 lg:space-y-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm lg:text-base">{point.name}</p>
                    </div>
                    <div>
                      <p className="text-xs lg:text-sm text-gray-600 line-clamp-3">{point.address}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Point Modal */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl p-4 lg:p-6 w-full max-w-md"
          >
            <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4">
              Agregar Punto de {formData.type === 'exit' ? 'Salida' : 'Entrega'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                  placeholder="Nombre del punto"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                  placeholder="Dirección del punto"
                  rows="3"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm lg:text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 text-white py-2 rounded-lg transition-colors text-sm lg:text-base ${
                    formData.type === 'exit'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  Guardar
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default PointManagement;
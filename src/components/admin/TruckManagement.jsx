import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useData } from '../../context/DataContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import NFCReader from '../common/NFCReader';

const { FiTruck, FiPlus, FiEdit, FiTrash2, FiTag, FiCopy, FiCheck, FiUser, FiFolder, FiClock } = FiIcons;

const TruckManagement = () => {
  const { trucks, projects, addTruck } = useData();
  const [showForm, setShowForm] = useState(false);
  const [showNFCReader, setShowNFCReader] = useState(false);
  const [formData, setFormData] = useState({
    plates: '',
    capacity: '',
    driverName: '',
    projectId: '',
    estimatedTravelTime: '',
    nfcTag: ''
  });
  const [copiedTag, setCopiedTag] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nfcTag) {
      alert('Por favor registra una etiqueta NFC');
      return;
    }
    if (!formData.projectId) {
      alert('Por favor selecciona un proyecto');
      return;
    }
    
    const selectedProject = projects.find(p => p.id === formData.projectId);
    const truckData = {
      ...formData,
      projectName: selectedProject?.name || '',
      estimatedTravelTime: parseInt(formData.estimatedTravelTime)
    };
    
    addTruck(truckData);
    setFormData({
      plates: '',
      capacity: '',
      driverName: '',
      projectId: '',
      estimatedTravelTime: '',
      nfcTag: ''
    });
    setShowForm(false);
  };

  const handleNFCRead = (tagId) => {
    setFormData(prev => ({ ...prev, nfcTag: tagId }));
    setShowNFCReader(false);
  };

  const openNFCReader = () => {
    setShowNFCReader(true);
  };

  const copyNFCTag = async (nfcTag) => {
    try {
      await navigator.clipboard.writeText(nfcTag);
      setCopiedTag(nfcTag);
      setTimeout(() => setCopiedTag(''), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = nfcTag;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedTag(nfcTag);
      setTimeout(() => setCopiedTag(''), 2000);
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Gestión de Camiones</h1>
          <p className="text-gray-600 text-sm lg:text-base">Administra los camiones del sistema</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-sm lg:text-base"
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4 lg:w-5 lg:h-5" />
          <span>Agregar Camión</span>
        </motion.button>
      </div>

      {/* Truck List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 lg:p-6">
          {trucks.length === 0 ? (
            <div className="text-center py-8 lg:py-12">
              <SafeIcon icon={FiTruck} className="w-12 h-12 lg:w-16 lg:h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm lg:text-base">No hay camiones registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {trucks.map((truck, index) => (
                <motion.div
                  key={truck.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4 lg:p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3 lg:mb-4">
                    <SafeIcon icon={FiTruck} className="w-8 h-8 lg:w-10 lg:h-10 text-blue-600" />
                    <div className="flex items-center space-x-2">
                      <SafeIcon icon={FiTag} className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">NFC</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 lg:space-y-3">
                    <div>
                      <p className="text-xs lg:text-sm text-gray-600">Placas</p>
                      <p className="font-semibold text-gray-900 text-sm lg:text-base">{truck.plates}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs lg:text-sm text-gray-600">Chofer</p>
                      <div className="flex items-center space-x-2">
                        <SafeIcon icon={FiUser} className="w-4 h-4 text-gray-400" />
                        <p className="font-medium text-gray-900 text-sm lg:text-base truncate">{truck.driverName}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs lg:text-sm text-gray-600">Proyecto</p>
                      <div className="flex items-center space-x-2">
                        <SafeIcon icon={FiFolder} className="w-4 h-4 text-purple-600" />
                        <p className="font-medium text-gray-900 text-sm lg:text-base truncate">{truck.projectName}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 lg:gap-3">
                      <div>
                        <p className="text-xs lg:text-sm text-gray-600">Capacidad</p>
                        <p className="font-semibold text-gray-900 text-sm lg:text-base">{truck.capacity} m³</p>
                      </div>
                      <div>
                        <p className="text-xs lg:text-sm text-gray-600">Tiempo Est.</p>
                        <div className="flex items-center space-x-1">
                          <SafeIcon icon={FiClock} className="w-3 h-3 lg:w-4 lg:h-4 text-orange-600" />
                          <p className="font-medium text-gray-900 text-sm lg:text-base">{truck.estimatedTravelTime} min</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs lg:text-sm text-gray-600">Etiqueta NFC</p>
                      <div className="flex items-center space-x-2">
                        <p className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                          {truck.nfcTag.slice(0, 12)}...
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => copyNFCTag(truck.nfcTag)}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                          title="Copiar etiqueta NFC"
                        >
                          <SafeIcon 
                            icon={copiedTag === truck.nfcTag ? FiCheck : FiCopy} 
                            className={`w-4 h-4 ${copiedTag === truck.nfcTag ? 'text-green-600' : ''}`} 
                          />
                        </motion.button>
                      </div>
                      {copiedTag === truck.nfcTag && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-green-600 mt-1"
                        >
                          ¡Copiado!
                        </motion.p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Truck Modal */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4">Agregar Camión</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placas
                </label>
                <input
                  type="text"
                  value={formData.plates}
                  onChange={(e) => setFormData(prev => ({ ...prev, plates: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                  placeholder="Ej: ABC-123"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Chofer
                </label>
                <input
                  type="text"
                  value={formData.driverName}
                  onChange={(e) => setFormData(prev => ({ ...prev, driverName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                  placeholder="Nombre completo del chofer"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proyecto Asignado
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                  required
                >
                  <option value="">Seleccionar proyecto</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacidad (m³)
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                    placeholder="Ej: 10"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiempo Est. (min)
                  </label>
                  <input
                    type="number"
                    value={formData.estimatedTravelTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedTravelTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                    placeholder="Ej: 45"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etiqueta NFC
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.nfcTag}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm lg:text-base"
                    placeholder="Toca 'Leer NFC' para registrar"
                  />
                  <button
                    type="button"
                    onClick={openNFCReader}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm lg:text-base whitespace-nowrap"
                  >
                    Leer NFC
                  </button>
                </div>
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
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base"
                >
                  Guardar
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* NFC Reader Modal */}
      {showNFCReader && (
        <NFCReader
          onRead={handleNFCRead}
          onClose={() => setShowNFCReader(false)}
        />
      )}
    </div>
  );
};

export default TruckManagement;
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useData } from '../../context/DataContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiFolder, FiPlus, FiBriefcase, FiAlertCircle, FiRefreshCw } = FiIcons;

const ProjectManagement = () => {
  const { projects, addProject, loading, error } = useData();
  const { currentWorkspace } = useWorkspace();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      if (!currentWorkspace) {
        throw new Error('No hay un workspace seleccionado. Por favor crea o selecciona un workspace primero.');
      }
      await addProject(formData);
      setFormData({ name: '', description: '', location: '' });
      setShowForm(false);
    } catch (err) {
      console.error('Error al agregar proyecto:', err);
      setFormError(err.message || 'Error al agregar el proyecto');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRefresh = () => {
    // Force a refresh by toggling state
    setRefreshing(true);
    // Use localStorage to temporarily store the current state
    try {
      const currentProjects = JSON.parse(localStorage.getItem('truckApp_projects')) || [];
      // Reload page after a brief delay
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('Error during refresh:', err);
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Gestión de Proyectos</h1>
          <p className="text-gray-600 text-sm lg:text-base">Administra los proyectos del sistema</p>
        </div>
        <div className="flex space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 text-sm lg:text-base"
          >
            <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 lg:w-5 lg:h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-sm lg:text-base"
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4 lg:w-5 lg:h-5" />
            <span>Agregar Proyecto</span>
          </motion.button>
        </div>
      </div>

      {/* Workspace Info */}
      {currentWorkspace ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center space-x-2">
          <SafeIcon icon={FiBriefcase} className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-blue-800 text-sm font-medium">
              Workspace actual: <span className="font-semibold">{currentWorkspace.name}</span>
            </p>
            <p className="text-blue-600 text-xs">Los proyectos se crearán en este workspace</p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center space-x-2">
          <SafeIcon icon={FiAlertCircle} className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="text-yellow-800 text-sm font-medium">No hay un workspace seleccionado</p>
            <p className="text-yellow-600 text-xs">
              Por favor crea o selecciona un workspace en la sección de Workspaces
            </p>
          </div>
        </div>
      )}

      {/* Error message if data loading failed */}
      {error && error.projects && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
          <SafeIcon icon={FiAlertCircle} className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-red-800 text-sm font-medium">Error al cargar proyectos</p>
            <p className="text-red-600 text-xs">
              {error.projects}. Usando datos almacenados localmente.
            </p>
          </div>
        </div>
      )}

      {/* Project List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 lg:p-6">
          {loading && loading.projects ? (
            <div className="text-center py-8 lg:py-12">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 text-sm lg:text-base">Cargando proyectos...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 lg:py-12">
              <SafeIcon icon={FiFolder} className="w-12 h-12 lg:w-16 lg:h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm lg:text-base">No hay proyectos registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4 lg:p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3 lg:mb-4">
                    <SafeIcon icon={FiFolder} className="w-8 h-8 lg:w-10 lg:h-10 text-green-600" />
                  </div>
                  <div className="space-y-2 lg:space-y-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm lg:text-base">{project.name}</p>
                    </div>
                    <div>
                      <p className="text-xs lg:text-sm text-gray-600 line-clamp-2">{project.description}</p>
                    </div>
                    <div>
                      <p className="text-xs lg:text-sm text-gray-500 truncate">{project.location}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Project Modal */}
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
            <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4">Agregar Proyecto</h2>
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {formError}
              </div>
            )}
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
                  placeholder="Nombre del proyecto"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                  placeholder="Descripción del proyecto"
                  rows="3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                  placeholder="Ubicación del proyecto"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm lg:text-base"
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base flex justify-center items-center"
                  disabled={formLoading || !currentWorkspace}
                >
                  {formLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ProjectManagement;
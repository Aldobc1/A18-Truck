import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkspace } from '../../context/WorkspaceContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiUsers, FiPlus, FiX, FiCheck, FiAlertCircle, FiUserPlus, FiBriefcase } = FiIcons;

const WorkspaceManagement = () => {
  const { workspaces, currentWorkspace, loading, error, createWorkspace, switchWorkspace, addUserToWorkspace } = useWorkspace();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setProcessing(true);
    
    try {
      if (!formData.name.trim()) {
        throw new Error('El nombre del workspace es obligatorio');
      }
      
      await createWorkspace(formData.name, formData.description);
      setFormSuccess('Workspace creado exitosamente');
      setFormData({ name: '', description: '' });
      setTimeout(() => {
        setShowCreateForm(false);
        setFormSuccess('');
      }, 2000);
    } catch (err) {
      setFormError(err.message || 'Error al crear el workspace');
    } finally {
      setProcessing(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setProcessing(true);
    
    try {
      if (!inviteEmail.trim()) {
        throw new Error('El correo electrónico es obligatorio');
      }
      
      if (!currentWorkspace) {
        throw new Error('No hay un workspace seleccionado');
      }
      
      await addUserToWorkspace(inviteEmail, currentWorkspace.id);
      setFormSuccess('Usuario invitado exitosamente');
      setInviteEmail('');
      setTimeout(() => {
        setShowInviteForm(false);
        setFormSuccess('');
      }, 2000);
    } catch (err) {
      setFormError(err.message || 'Error al invitar al usuario');
    } finally {
      setProcessing(false);
    }
  };

  const handleSwitchWorkspace = (workspaceId) => {
    try {
      switchWorkspace(workspaceId);
    } catch (err) {
      setFormError(err.message || 'Error al cambiar de workspace');
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
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Workspaces</h1>
          <p className="text-gray-600 text-sm lg:text-base">
            Gestiona tus espacios de trabajo y equipos
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateForm(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2 text-sm lg:text-base"
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4 lg:w-5 lg:h-5" />
          <span>Crear Workspace</span>
        </motion.button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertCircle} className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Current Workspace */}
      {currentWorkspace && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-3 rounded-lg">
                <SafeIcon icon={FiBriefcase} className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentWorkspace.name}
                </h2>
                <p className="text-gray-500 text-sm">{currentWorkspace.description || 'Sin descripción'}</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowInviteForm(true)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm"
            >
              <SafeIcon icon={FiUserPlus} className="w-4 h-4" />
              <span>Invitar</span>
            </motion.button>
          </div>
        </div>
      )}

      {/* Workspace List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Mis Workspaces</h2>
        </div>
        <div className="p-4">
          {workspaces.length === 0 ? (
            <div className="text-center py-8">
              <SafeIcon icon={FiUsers} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tienes workspaces aún</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Crear tu primer workspace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((workspace) => (
                <motion.div
                  key={workspace.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    currentWorkspace && currentWorkspace.id === workspace.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleSwitchWorkspace(workspace.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      currentWorkspace && currentWorkspace.id === workspace.id
                        ? 'bg-purple-200'
                        : 'bg-gray-100'
                    }`}>
                      <SafeIcon 
                        icon={FiBriefcase} 
                        className={`w-5 h-5 ${
                          currentWorkspace && currentWorkspace.id === workspace.id
                            ? 'text-purple-600'
                            : 'text-gray-600'
                        }`} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {workspace.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {workspace.description || 'Sin descripción'}
                      </p>
                    </div>
                    {currentWorkspace && currentWorkspace.id === workspace.id && (
                      <div className="flex-shrink-0">
                        <SafeIcon icon={FiCheck} className="w-5 h-5 text-purple-600" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Workspace Modal */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Crear Workspace</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <SafeIcon icon={FiX} className="w-6 h-6" />
              </button>
            </div>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <div className="flex items-center">
                  <SafeIcon icon={FiAlertCircle} className="w-4 h-4 mr-2 flex-shrink-0" />
                  <p>{formError}</p>
                </div>
              </div>
            )}
            
            {formSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <div className="flex items-center">
                  <SafeIcon icon={FiCheck} className="w-4 h-4 mr-2 flex-shrink-0" />
                  <p>{formSuccess}</p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Workspace
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ej: Mi Empresa"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Descripción breve del workspace"
                  rows="3"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={processing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                  disabled={processing}
                >
                  {processing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Crear Workspace'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Invite User Modal */}
      {showInviteForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Invitar Usuario</h2>
              <button
                onClick={() => setShowInviteForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <SafeIcon icon={FiX} className="w-6 h-6" />
              </button>
            </div>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <div className="flex items-center">
                  <SafeIcon icon={FiAlertCircle} className="w-4 h-4 mr-2 flex-shrink-0" />
                  <p>{formError}</p>
                </div>
              </div>
            )}
            
            {formSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <div className="flex items-center">
                  <SafeIcon icon={FiCheck} className="w-4 h-4 mr-2 flex-shrink-0" />
                  <p>{formSuccess}</p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={processing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  disabled={processing}
                >
                  {processing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Invitar'
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

export default WorkspaceManagement;
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWorkspace } from '../../context/WorkspaceContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import supabase from '../../lib/supabase';

const { 
  FiUsers, FiPlus, FiX, FiCheck, FiAlertCircle, 
  FiUserPlus, FiBriefcase, FiEdit2, FiTrash2, 
  FiSearch, FiRefreshCw, FiFilter, FiMail,
  FiPhone, FiUser
} = FiIcons;

const WorkspaceManagement = () => {
  const { 
    workspaces, 
    currentWorkspace, 
    loading, 
    error, 
    createWorkspace, 
    switchWorkspace, 
    addUserToWorkspace 
  } = useWorkspace();
  
  // Estados para gestión de workspaces
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  // Estados para gestión de usuarios
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userFormMode, setUserFormMode] = useState('create'); // 'create' o 'edit'
  const [userFormData, setUserFormData] = useState({
    id: '',
    email: '',
    name: '',
    phone: '',
    role: 'checker',
    workspace_id: ''
  });
  const [inviteEmail, setInviteEmail] = useState('');
  
  // Estados para mensajes y procesamiento
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Estado para pestaña activa
  const [activeTab, setActiveTab] = useState('workspaces'); // 'workspaces' o 'users'
  
  // Estado para filtros de usuarios
  const [userFilter, setUserFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  
  // Estado para la contraseña temporal
  const [tempPassword, setTempPassword] = useState('');

  // Cargar usuarios al inicio
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  // Función para obtener usuarios
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Obtener usuarios con sus relaciones de workspaces
      const { data: usersData, error: usersError } = await supabase
        .from('users_a18')
        .select('*');
      
      if (usersError) throw usersError;
      
      // Obtener relaciones usuario-workspace
      const { data: userWorkspaces, error: relationsError } = await supabase
        .from('user_workspaces_a18')
        .select('*');
      
      if (relationsError) throw relationsError;
      
      // Combinar datos
      const enhancedUsers = usersData.map(user => {
        const userWorkspaceRelations = userWorkspaces.filter(
          relation => relation.user_id === user.id
        );
        
        const workspaceIds = userWorkspaceRelations.map(
          relation => relation.workspace_id
        );
        
        const userWorkspaceNames = workspaces
          .filter(workspace => workspaceIds.includes(workspace.id))
          .map(workspace => workspace.name);
        
        return {
          ...user,
          workspaceIds,
          workspaceNames: userWorkspaceNames
        };
      });
      
      setUsers(enhancedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setFormError('Error al cargar usuarios: ' + err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Función para crear workspace
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

  // Función para invitar usuario
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
        // Actualizar la lista de usuarios
        if (activeTab === 'users') {
          fetchUsers();
        }
      }, 2000);
    } catch (err) {
      setFormError(err.message || 'Error al invitar al usuario');
    } finally {
      setProcessing(false);
    }
  };

  // Función para cambiar workspace
  const handleSwitchWorkspace = (workspaceId) => {
    try {
      switchWorkspace(workspaceId);
    } catch (err) {
      setFormError(err.message || 'Error al cambiar de workspace');
    }
  };

  // Función para abrir formulario de usuario
  const openUserForm = (mode, userData = null) => {
    setUserFormMode(mode);
    setTempPassword(''); // Resetear contraseña temporal
    
    if (mode === 'edit' && userData) {
      setUserFormData({
        id: userData.id,
        email: userData.email,
        name: userData.name || '',
        phone: userData.phone || '',
        role: userData.role || 'checker',
        workspace_id: userData.workspaceIds && userData.workspaceIds.length > 0 
          ? userData.workspaceIds[0] 
          : (workspaces.length > 0 ? workspaces[0].id : '')
      });
    } else {
      // Modo crear
      setUserFormData({
        id: '',
        email: '',
        name: '',
        phone: '',
        role: 'checker',
        workspace_id: workspaces.length > 0 ? workspaces[0].id : ''
      });
    }
    
    setShowUserForm(true);
  };

  // Función para manejar el formulario de usuario
  const handleUserForm = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setProcessing(true);
    
    try {
      if (!userFormData.email.trim()) {
        throw new Error('El correo electrónico es obligatorio');
      }
      
      if (!userFormData.role) {
        throw new Error('El rol es obligatorio');
      }
      
      if (userFormMode === 'create') {
        // Crear nuevo usuario con contraseña temporal
        const password = 'temp' + Math.floor(100000 + Math.random() * 900000);
        
        // Registrar en auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userFormData.email,
          password: password
        });
        
        if (authError) throw authError;
        
        // Crear perfil de usuario
        const { error: profileError } = await supabase
          .from('users_a18')
          .insert([
            {
              id: authData.user.id,
              email: userFormData.email,
              name: userFormData.name,
              phone: userFormData.phone,
              role: userFormData.role
            }
          ]);
          
        if (profileError) throw profileError;
        
        // Asociar al workspace seleccionado
        if (userFormData.workspace_id) {
          const { error: workspaceError } = await supabase
            .from('user_workspaces_a18')
            .insert([
              {
                user_id: authData.user.id,
                workspace_id: userFormData.workspace_id
              }
            ]);
            
          if (workspaceError) throw workspaceError;
        }
        
        // Guardar contraseña temporal para mostrarla
        setTempPassword(password);
        setFormSuccess(`Usuario creado exitosamente. Contraseña temporal: ${password}`);
      } else {
        // Actualizar usuario existente
        const { error: updateError } = await supabase
          .from('users_a18')
          .update({ 
            role: userFormData.role,
            name: userFormData.name,
            phone: userFormData.phone
          })
          .eq('id', userFormData.id);
          
        if (updateError) throw updateError;
        
        // Actualizar relación con workspace si es necesario
        if (userFormData.workspace_id) {
          // Primero eliminamos las relaciones existentes
          const { error: deleteError } = await supabase
            .from('user_workspaces_a18')
            .delete()
            .eq('user_id', userFormData.id);
            
          if (deleteError) throw deleteError;
          
          // Luego creamos la nueva relación
          const { error: insertError } = await supabase
            .from('user_workspaces_a18')
            .insert([
              {
                user_id: userFormData.id,
                workspace_id: userFormData.workspace_id
              }
            ]);
            
          if (insertError) throw insertError;
        }
        
        setFormSuccess('Usuario actualizado exitosamente');
      }
      
      // Limpiar formulario y actualizar lista después de un tiempo
      if (userFormMode === 'edit' || tempPassword === '') {
        setTimeout(() => {
          setShowUserForm(false);
          setFormSuccess('');
          fetchUsers();
        }, 2000);
      }
    } catch (err) {
      console.error('Error en formulario de usuario:', err);
      setFormError(err.message || 'Error al procesar el usuario');
    } finally {
      setProcessing(false);
    }
  };

  // Función para eliminar usuario
  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }
    
    setProcessing(true);
    
    try {
      // Eliminar relaciones de workspace primero
      const { error: relationsError } = await supabase
        .from('user_workspaces_a18')
        .delete()
        .eq('user_id', userId);
        
      if (relationsError) throw relationsError;
      
      // Eliminar perfil de usuario
      const { error: profileError } = await supabase
        .from('users_a18')
        .delete()
        .eq('id', userId);
        
      if (profileError) throw profileError;
      
      // Nota: No podemos eliminar el usuario de auth directamente desde el cliente
      // En una implementación completa, esto requeriría una función en el backend
      
      setFormSuccess('Usuario eliminado exitosamente');
      fetchUsers();
      
      setTimeout(() => {
        setFormSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Error eliminando usuario:', err);
      setFormError('Error al eliminar usuario: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    // Filtro de búsqueda - busca en email y nombre
    const searchMatch = 
      user.email.toLowerCase().includes(userFilter.toLowerCase()) || 
      (user.name && user.name.toLowerCase().includes(userFilter.toLowerCase()));
    
    // Filtro de rol
    const roleMatch = roleFilter === 'all' || user.role === roleFilter;
    
    // Filtro de workspace
    const workspaceMatch = 
      workspaceFilter === 'all' || 
      (user.workspaceIds && user.workspaceIds.includes(workspaceFilter));
      
    return searchMatch && roleMatch && workspaceMatch;
  });

  // Cerrar el modal de contraseña temporal
  const closeTempPasswordModal = () => {
    setTempPassword('');
    setShowUserForm(false);
    fetchUsers();
  };

  // Renderizado condicional para estado de carga
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y Pestañas */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Gestión de Workspaces</h1>
          <p className="text-gray-600 text-sm lg:text-base">
            Administra tus workspaces y usuarios
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'workspaces'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <SafeIcon icon={FiBriefcase} className="w-4 h-4 lg:w-5 lg:h-5 mr-2 inline-block" />
            Workspaces
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <SafeIcon icon={FiUsers} className="w-4 h-4 lg:w-5 lg:h-5 mr-2 inline-block" />
            Usuarios
          </button>
        </div>
      </div>

      {/* Mensajes de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertCircle} className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertCircle} className="w-5 h-5 mr-2" />
            <p>{formError}</p>
          </div>
        </div>
      )}
      
      {formSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <SafeIcon icon={FiCheck} className="w-5 h-5 mr-2" />
            <p>{formSuccess}</p>
          </div>
        </div>
      )}

      {/* Vista de Workspaces */}
      {activeTab === 'workspaces' && (
        <div className="space-y-6">
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

          {/* Workspace Actions */}
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center space-x-2 text-sm lg:text-base"
            >
              <SafeIcon icon={FiPlus} className="w-4 h-4 lg:w-5 lg:h-5" />
              <span>Crear Workspace</span>
            </motion.button>
          </div>

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
                        <div
                          className={`p-2 rounded-lg ${
                            currentWorkspace && currentWorkspace.id === workspace.id
                              ? 'bg-purple-200'
                              : 'bg-gray-100'
                          }`}
                        >
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
        </div>
      )}

      {/* Vista de Usuarios */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Filtros y Acciones */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div className="flex items-center space-x-2">
                <SafeIcon icon={FiFilter} className="w-5 h-5 text-gray-400" />
                <h3 className="font-medium text-gray-700">Filtros</h3>
              </div>
              
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchUsers}
                  className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center space-x-1 text-sm"
                >
                  <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
                  <span>Actualizar</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openUserForm('create')}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm"
                >
                  <SafeIcon icon={FiUserPlus} className="w-4 h-4" />
                  <span>Agregar Usuario</span>
                </motion.button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="relative">
                <SafeIcon
                  icon={FiSearch}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Buscar por email o nombre..."
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos los roles</option>
                  <option value="admin">Administradores</option>
                  <option value="checker">Checadores</option>
                </select>
              </div>
              
              <div>
                <select
                  value={workspaceFilter}
                  onChange={(e) => setWorkspaceFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos los workspaces</option>
                  {workspaces.map(workspace => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Lista de Usuarios */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Usuarios ({filteredUsers.length})
              </h2>
            </div>
            
            <div className="p-4">
              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <SafeIcon icon={FiUsers} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No se encontraron usuarios</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuario
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contacto
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rol
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Workspaces
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <SafeIcon icon={FiUser} className="w-4 h-4 text-gray-400 mr-2" />
                              <div>
                                <span className="text-sm font-medium text-gray-900">{user.name || 'Sin nombre'}</span>
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <SafeIcon icon={FiMail} className="w-3 h-3" />
                                  <span>{user.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <SafeIcon icon={FiPhone} className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">{user.phone || 'No registrado'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role === 'admin' ? 'Administrador' : 'Checador'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {user.workspaceNames && user.workspaceNames.length > 0 
                                ? user.workspaceNames.join(', ') 
                                : 'Sin workspace'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openUserForm('edit', user)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              <SafeIcon icon={FiEdit2} className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                            </button>
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
      )}

      {/* Modales */}
      {/* Modal Crear Workspace */}
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

      {/* Modal Invitar Usuario */}
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

      {/* Modal Formulario de Usuario */}
      {showUserForm && (
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
              <h2 className="text-xl font-bold text-gray-900">
                {userFormMode === 'create' ? 'Agregar Usuario' : 'Editar Usuario'}
              </h2>
              <button
                onClick={() => setShowUserForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <SafeIcon icon={FiX} className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUserForm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="usuario@ejemplo.com"
                  required
                  disabled={userFormMode === 'edit'} // No permitir cambiar email en modo edición
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={userFormData.phone}
                  onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Número de teléfono"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="checker">Checador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workspace
                </label>
                <select
                  value={userFormData.workspace_id}
                  onChange={(e) => setUserFormData({ ...userFormData, workspace_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sin workspace asignado</option>
                  {workspaces.map(workspace => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {userFormMode === 'create' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                  <p className="flex items-center">
                    <SafeIcon icon={FiAlertCircle} className="w-4 h-4 mr-2 flex-shrink-0" />
                    Se generará una contraseña temporal que deberás compartir con el usuario.
                  </p>
                </div>
              )}
              
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
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
                    userFormMode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de Contraseña Temporal */}
      {tempPassword && (
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
              <h2 className="text-xl font-bold text-gray-900">
                ¡Usuario Creado Exitosamente!
              </h2>
              <button
                onClick={closeTempPasswordModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <SafeIcon icon={FiX} className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Credenciales de acceso</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{userFormData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contraseña temporal:</span>
                    <span className="font-medium font-mono bg-gray-100 px-2 py-1 rounded">{tempPassword}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                <div className="flex items-start space-x-2">
                  <SafeIcon icon={FiAlertCircle} className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-800 font-medium mb-1">Importante:</p>
                    <ul className="text-yellow-700 space-y-1">
                      <li>• Comparte esta contraseña con el usuario de forma segura.</li>
                      <li>• El usuario deberá cambiar esta contraseña en su primer inicio de sesión.</li>
                      <li>• Esta contraseña no se mostrará nuevamente.</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <button
                onClick={closeTempPasswordModal}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default WorkspaceManagement;
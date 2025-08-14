import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWorkspace } from '../../context/WorkspaceContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import supabase from '../../lib/supabase';

const { 
  FiUsers, FiPlus, FiX, FiCheck, FiAlertCircle, 
  FiBriefcase, FiEdit2, FiTrash2, 
  FiSearch, FiRefreshCw, FiFilter, FiMail,
  FiPhone, FiUser, FiUserPlus
} = FiIcons;

const WorkspaceManagement = () => {
  const { 
    workspaces, 
    currentWorkspace, 
    loading, 
    error, 
    createWorkspace, 
    switchWorkspace 
  } = useWorkspace();
  
  // Estados para gestión de workspaces
  const [showCreateForm, setShowCreateForm] = useState(false);
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
    workspaceIds: []
  });
  
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
      // Modificado para solo obtener usuarios activos (inactivo = false o NULL)
      const { data: usersData, error: usersError } = await supabase
        .from('users_a18')
        .select('*')
        .or('inactivo.is.null,inactivo.eq.false');
      
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
        workspaceIds: userData.workspaceIds || []
      });
    } else {
      // Modo crear
      setUserFormData({
        id: '',
        email: '',
        name: '',
        phone: '',
        role: 'checker',
        workspaceIds: workspaces.length > 0 ? [workspaces[0].id] : []
      });
    }
    
    setShowUserForm(true);
  };

  // Función para manejar cambios en los checkboxes de workspaces
  const handleWorkspaceCheckboxChange = (workspaceId, checked) => {
    if (checked) {
      // Añadir el workspace si no está ya en la lista
      setUserFormData(prev => ({
        ...prev,
        workspaceIds: [...prev.workspaceIds, workspaceId]
      }));
    } else {
      // Eliminar el workspace de la lista
      setUserFormData(prev => ({
        ...prev,
        workspaceIds: prev.workspaceIds.filter(id => id !== workspaceId)
      }));
    }
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

      if (userFormData.workspaceIds.length === 0) {
        throw new Error('Debe seleccionar al menos un workspace');
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
              role: userFormData.role,
              inactivo: false
            }
          ]);
          
        if (profileError) throw profileError;
        
        // Asociar a los workspaces seleccionados
        const workspaceRelations = userFormData.workspaceIds.map(workspaceId => ({
          user_id: authData.user.id,
          workspace_id: workspaceId
        }));
        
        const { error: workspaceError } = await supabase
          .from('user_workspaces_a18')
          .insert(workspaceRelations);
          
        if (workspaceError) throw workspaceError;
        
        // Guardar contraseña temporal para mostrarla
        setTempPassword(password);
        setFormSuccess(`Usuario creado exitosamente. Contraseña temporal: ${password}`);
      } else {
        // Actualizar usuario existente
        console.log('Actualizando usuario:', userFormData);
        
        // Actualizar datos básicos del usuario, incluyendo el rol
        const { error: updateError } = await supabase
          .from('users_a18')
          .update({ 
            role: userFormData.role,
            name: userFormData.name,
            phone: userFormData.phone
          })
          .eq('id', userFormData.id);
          
        if (updateError) {
          console.error('Error al actualizar usuario:', updateError);
          throw updateError;
        }
        
        // Actualizar relaciones con workspaces
        // 1. Obtener las relaciones actuales del usuario
        const { data: currentRelations, error: fetchError } = await supabase
          .from('user_workspaces_a18')
          .select('*')
          .eq('user_id', userFormData.id);
          
        if (fetchError) {
          console.error('Error al obtener relaciones actuales:', fetchError);
          throw fetchError;
        }
        
        console.log('Relaciones actuales:', currentRelations);
        console.log('Nuevas relaciones (IDs):', userFormData.workspaceIds);
        
        // 2. Identificar relaciones a eliminar y a crear
        const currentWorkspaceIds = currentRelations.map(rel => rel.workspace_id);
        const workspacesToRemove = currentWorkspaceIds.filter(id => !userFormData.workspaceIds.includes(id));
        const workspacesToAdd = userFormData.workspaceIds.filter(id => !currentWorkspaceIds.includes(id));
        
        console.log('Workspaces a eliminar:', workspacesToRemove);
        console.log('Workspaces a añadir:', workspacesToAdd);
        
        // 3. Eliminar relaciones que ya no se necesitan
        if (workspacesToRemove.length > 0) {
          for (const workspaceId of workspacesToRemove) {
            const { error: deleteError } = await supabase
              .from('user_workspaces_a18')
              .delete()
              .eq('user_id', userFormData.id)
              .eq('workspace_id', workspaceId);
              
            if (deleteError) {
              console.error('Error al eliminar relación con workspace:', deleteError);
              throw deleteError;
            }
          }
        }
        
        // 4. Crear nuevas relaciones
        if (workspacesToAdd.length > 0) {
          const newRelations = workspacesToAdd.map(workspaceId => ({
            user_id: userFormData.id,
            workspace_id: workspaceId
          }));
          
          const { error: insertError } = await supabase
            .from('user_workspaces_a18')
            .insert(newRelations);
            
          if (insertError) {
            console.error('Error al insertar nuevas relaciones:', insertError);
            throw insertError;
          }
        }
        
        setFormSuccess('Usuario actualizado exitosamente');
      }
      
      // Limpiar formulario y actualizar lista después de un tiempo
      if (userFormMode === 'edit' || tempPassword === '') {
        setTimeout(() => {
          setShowUserForm(false);
          setFormSuccess('');
          fetchUsers(); // Actualizar la lista de usuarios
        }, 2000);
      }
    } catch (err) {
      console.error('Error en formulario de usuario:', err);
      setFormError(err.message || 'Error al procesar el usuario');
    } finally {
      setProcessing(false);
    }
  };

  // Función para marcar usuario como inactivo (en lugar de eliminarlo)
  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Estás seguro de marcar este usuario como inactivo? Esta acción puede revertirse más tarde desde la base de datos.')) {
      return;
    }
    
    setProcessing(true);
    setFormError('');
    setFormSuccess('');
    
    try {
      console.log('Marcando usuario como inactivo, ID:', userId);
      
      // Método 1: Usar RPC para marcar usuario como inactivo
      const { data: rpcResult, error: rpcError } = await supabase.rpc('mark_user_inactive', {
        user_id: userId
      });
      
      if (rpcError) {
        console.error('Error en RPC al marcar usuario como inactivo:', rpcError);
        // No lanzar error aquí, intentamos el método alternativo
      } else {
        console.log('Respuesta de RPC:', rpcResult);
      }
      
      // Método 2: Actualización directa como alternativa
      const { error: directError } = await supabase
        .from('users_a18')
        .update({ inactivo: true })
        .eq('id', userId);
      
      if (directError) {
        console.error('Error en actualización directa:', directError);
        throw directError;
      }
      
      setFormSuccess('Usuario marcado como inactivo exitosamente');
      
      // Actualizar la lista de usuarios para que ya no muestre al usuario inactivo
      setTimeout(() => {
        fetchUsers();
      }, 1000);
    } catch (err) {
      console.error('Error marcando usuario como inactivo:', err);
      setFormError('Error al marcar usuario como inactivo: ' + err.message);
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
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 text-sm">
            Administra tus workspaces y usuarios
          </p>
        </div>
        
        <div className="flex w-full rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center ${
              activeTab === 'workspaces'
                ? 'bg-purple-600 text-white'
                : 'bg-transparent text-gray-700 hover:bg-gray-200'
            }`}
          >
            <SafeIcon icon={FiBriefcase} className="w-4 h-4 mr-2" />
            <span>Workspaces</span>
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-transparent text-gray-700 hover:bg-gray-200'
            }`}
          >
            <SafeIcon icon={FiUsers} className="w-4 h-4 mr-2" />
            <span>Usuarios</span>
          </button>
        </div>
      </div>

      {/* Mensajes de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertCircle} className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertCircle} className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{formError}</p>
          </div>
        </div>
      )}
      
      {formSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <SafeIcon icon={FiCheck} className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{formSuccess}</p>
          </div>
        </div>
      )}

      {/* Vista de Workspaces */}
      {activeTab === 'workspaces' && (
        <div className="space-y-4">
          {/* Current Workspace */}
          {currentWorkspace && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-2.5 rounded-lg">
                    <SafeIcon icon={FiBriefcase} className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {currentWorkspace.name}
                    </h2>
                    <p className="text-xs text-gray-500">{currentWorkspace.description || 'Sin descripción'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Workspace Actions */}
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center space-x-2 text-sm"
            >
              <SafeIcon icon={FiPlus} className="w-4 h-4" />
              <span>Crear Workspace</span>
            </motion.button>
          </div>

          {/* Workspace List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Mis Workspaces</h2>
            </div>
            
            <div className="p-3">
              {workspaces.length === 0 ? (
                <div className="text-center py-6">
                  <SafeIcon icon={FiUsers} className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No tienes workspaces aún</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm"
                  >
                    Crear tu primer workspace
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {workspaces.map((workspace) => (
                    <motion.div
                      key={workspace.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
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
                            className={`w-4 h-4 ${
                              currentWorkspace && currentWorkspace.id === workspace.id
                                ? 'text-purple-600'
                                : 'text-gray-600'
                            }`}
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate text-sm">
                            {workspace.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {workspace.description || 'Sin descripción'}
                          </p>
                        </div>
                        
                        {currentWorkspace && currentWorkspace.id === workspace.id && (
                          <div className="flex-shrink-0">
                            <SafeIcon icon={FiCheck} className="w-4 h-4 text-purple-600" />
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
        <div className="space-y-4">
          {/* Filtros y Acciones */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-2">
                <SafeIcon icon={FiFilter} className="w-4 h-4 text-gray-400" />
                <h3 className="font-medium text-gray-700 text-sm">Filtros</h3>
              </div>
              
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchUsers}
                  className="bg-gray-200 text-gray-700 p-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
                  aria-label="Refrescar"
                >
                  <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openUserForm('create')}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  aria-label="Añadir usuario"
                >
                  <SafeIcon icon={FiUserPlus} className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
            
            <div className="space-y-3">
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
          </div>

          {/* Lista de Usuarios */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  Usuarios
                </h2>
                <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded">
                  {filteredUsers.length}
                </span>
              </div>
            </div>
            
            <div className="p-3">
              {loadingUsers ? (
                <div className="flex justify-center py-6">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-6">
                  <SafeIcon icon={FiUsers} className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No se encontraron usuarios</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="bg-blue-100 p-1.5 rounded-full">
                            <SafeIcon icon={FiUser} className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900">{user.name || 'Sin nombre'}</span>
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <SafeIcon icon={FiMail} className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">{user.email}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => openUserForm('edit', user)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            aria-label="Editar"
                          >
                            <SafeIcon icon={FiEdit2} className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            aria-label="Eliminar"
                          >
                            <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div className="flex items-start">
                          <SafeIcon icon={FiPhone} className="w-3 h-3 text-gray-400 mr-1 mt-0.5" />
                          <span className="text-gray-600 truncate">{user.phone || 'No registrado'}</span>
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'admin' ? 'Administrador' : 'Checador'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-600 border-t border-gray-100 pt-1">
                        <span className="font-medium">Workspaces:</span> {user.workspaceNames && user.workspaceNames.length > 0 
                          ? user.workspaceNames.join(', ') 
                          : 'Sin workspace'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Botón flotante para añadir usuario en móvil */}
              <div className="fixed bottom-6 right-6 md:hidden">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => openUserForm('create')}
                  className="w-12 h-12 bg-blue-600 rounded-full shadow-lg flex items-center justify-center"
                >
                  <SafeIcon icon={FiUserPlus} className="w-6 h-6 text-white" />
                </motion.button>
              </div>
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl p-4 w-full max-w-sm mx-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Crear Workspace</h2>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="Descripción breve del workspace"
                  rows="3"
                />
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  disabled={processing}
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center text-sm"
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

      {/* Modal Formulario de Usuario */}
      {showUserForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl p-4 w-full max-w-sm mx-auto max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                >
                  <option value="checker">Checador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspaces
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {workspaces.length > 0 ? (
                    <div className="space-y-2">
                      {workspaces.map(workspace => (
                        <div key={workspace.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`workspace-${workspace.id}`}
                            checked={userFormData.workspaceIds.includes(workspace.id)}
                            onChange={(e) => handleWorkspaceCheckboxChange(workspace.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label
                            htmlFor={`workspace-${workspace.id}`}
                            className="ml-2 block text-sm text-gray-900"
                          >
                            {workspace.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay workspaces disponibles</p>
                  )}
                </div>
                {userFormData.workspaceIds.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Selecciona al menos un workspace</p>
                )}
              </div>
              
              {userFormMode === 'create' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
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
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  disabled={processing}
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm"
                  disabled={processing || userFormData.workspaceIds.length === 0}
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-xl p-4 w-full max-w-sm mx-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">
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
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">Credenciales de acceso</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{userFormData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contraseña temporal:</span>
                    <span className="font-medium font-mono bg-gray-100 px-2 py-1 rounded text-xs break-all">{tempPassword}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
                <div className="flex items-start space-x-2">
                  <SafeIcon icon={FiAlertCircle} className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
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
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
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
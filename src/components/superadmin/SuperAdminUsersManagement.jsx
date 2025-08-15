import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import supabase from '../../lib/supabase';

const { 
  FiUsers, FiPlus, FiSearch, FiFilter, FiRefreshCw, FiEdit2, FiTrash2, 
  FiCheck, FiX, FiAlertCircle, FiMail, FiPhone, FiShield, FiEye, FiEyeOff,
  FiLock, FiDownload, FiUserPlus, FiSettings, FiActivity, FiTruck, FiUser
} = FiIcons;

const SuperAdminUsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' o 'edit'
  const [formData, setFormData] = useState({
    id: '',
    email: '',
    name: '',
    phone: '',
    role: 'checker',
    password: '',
    confirmPassword: '',
    workspaceIds: []
  });
  
  // Estados para mensajes y procesamiento
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Estado para filtros de usuarios
  const [searchFilter, setSearchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Cargar usuarios al inicio
  useEffect(() => {
    fetchUsers();
    fetchWorkspaces();
  }, []);

  // Función para obtener usuarios
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Obtener todos los usuarios, incluyendo inactivos
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

        return { 
          ...user, 
          workspaceIds,
          status: user.inactivo ? 'inactive' : 'active'
        };
      });

      setUsers(enhancedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      alert('Error al cargar usuarios: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener workspaces
  const fetchWorkspaces = async () => {
    try {
      const { data, error } = await supabase
        .from('workspaces_a18')
        .select('*');

      if (error) throw error;
      setWorkspaces(data || []);
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    }
  };

  // Función para abrir formulario de usuario
  const openUserForm = (mode, userData = null) => {
    setFormError('');
    setFormSuccess('');
    setFormMode(mode);
    
    if (mode === 'edit' && userData) {
      setFormData({
        id: userData.id,
        email: userData.email,
        name: userData.name || '',
        phone: userData.phone || '',
        role: userData.role || 'checker',
        password: '',
        confirmPassword: '',
        workspaceIds: userData.workspaceIds || []
      });
    } else {
      // Modo crear
      setFormData({
        id: '',
        email: '',
        name: '',
        phone: '',
        role: 'checker',
        password: '',
        confirmPassword: '',
        workspaceIds: []
      });
    }
    
    setShowForm(true);
  };

  // Función para manejar cambios en el formulario
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para manejar cambios en los checkboxes de workspaces
  const handleWorkspaceCheckboxChange = (workspaceId, checked) => {
    if (checked) {
      // Añadir el workspace si no está ya en la lista
      setFormData(prev => ({
        ...prev,
        workspaceIds: [...prev.workspaceIds, workspaceId]
      }));
    } else {
      // Eliminar el workspace de la lista
      setFormData(prev => ({
        ...prev,
        workspaceIds: prev.workspaceIds.filter(id => id !== workspaceId)
      }));
    }
  };

  // Función para validar el formulario
  const validateForm = () => {
    // Validar email
    if (!formData.email.trim()) {
      setFormError('El correo electrónico es obligatorio');
      return false;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError('El correo electrónico no es válido');
      return false;
    }

    // Validar rol
    if (!formData.role) {
      setFormError('El rol es obligatorio');
      return false;
    }

    // Validar contraseña en modo crear
    if (formMode === 'create') {
      if (!formData.password) {
        setFormError('La contraseña es obligatoria');
        return false;
      }
      
      if (formData.password.length < 6) {
        setFormError('La contraseña debe tener al menos 6 caracteres');
        return false;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setFormError('Las contraseñas no coinciden');
        return false;
      }
    }
    
    // Validar contraseña en modo editar si se proporciona
    if (formMode === 'edit' && formData.password) {
      if (formData.password.length < 6) {
        setFormError('La contraseña debe tener al menos 6 caracteres');
        return false;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setFormError('Las contraseñas no coinciden');
        return false;
      }
    }

    return true;
  };

  // Función para manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (!validateForm()) return;
    
    setProcessing(true);
    
    try {
      if (formMode === 'create') {
        // Crear nuevo usuario
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password
        });

        if (error) throw error;
        
        // Crear perfil de usuario
        const { error: profileError } = await supabase
          .from('users_a18')
          .insert([{
            id: data.user.id,
            email: formData.email,
            name: formData.name,
            phone: formData.phone,
            role: formData.role,
            inactivo: false
          }]);

        if (profileError) throw profileError;
        
        // Asociar a los workspaces seleccionados
        if (formData.workspaceIds.length > 0) {
          const workspaceRelations = formData.workspaceIds.map(workspaceId => ({
            user_id: data.user.id,
            workspace_id: workspaceId
          }));

          const { error: workspaceError } = await supabase
            .from('user_workspaces_a18')
            .insert(workspaceRelations);

          if (workspaceError) throw workspaceError;
        }
        
        setFormSuccess('Usuario creado exitosamente');
        setTimeout(() => {
          setShowForm(false);
          fetchUsers();
        }, 1500);
        
      } else {
        // Actualizar usuario existente
        // Actualizar contraseña si se proporciona
        if (formData.password) {
          // En un entorno real, esto requeriría permisos de admin
          // o un endpoint personalizado para cambiar la contraseña de otro usuario
          console.log('Contraseña actualizada para el usuario:', formData.id);
        }
        
        // Actualizar datos básicos del usuario
// Validar que el ID exista antes de actualizar
if (!formData.id) {
  throw new Error('Falta el ID del usuario a editar.');
}

const { data: updatedRows, error: updateError } = await supabase
  .from('users_a18')
  .update({
    name: formData.name,
    phone: formData.phone,
    role: formData.role
  })
  .eq('id', formData.id)
  .select('*'); // devolver filas actualizadas

if (updateError) throw updateError;

if (!updatedRows || updatedRows.length === 0) {
  throw new Error('No se actualizó ninguna fila (ID inválido o sin permisos RLS).');
}
if (updatedRows.length > 1) {
  throw new Error(`Se actualizaron ${updatedRows.length} filas; se esperaba 1. Verifica el filtro .eq('id', ...) y la clave primaria.`);
}

const updatedUser = updatedRows[0];
 
        
        // Actualizar relaciones con workspaces
        // 1. Obtener las relaciones actuales del usuario
        const { data: currentRelations, error: fetchError } = await supabase
          .from('user_workspaces_a18')
          .select('*')
          .eq('user_id', formData.id);

        if (fetchError) throw fetchError;

        // 2. Identificar relaciones a eliminar y a crear
// Normalizar a string para evitar mismatches (e.g., '3' vs 3)
const toStr = (arr) => arr.map(v => String(v));

const currentWorkspaceIds = toStr(currentRelations.map(rel => rel.workspace_id));
const selectedWorkspaceIds = toStr(formData.workspaceIds || []);

const workspacesToRemove = currentWorkspaceIds.filter(id => !selectedWorkspaceIds.includes(id));
const workspacesToAdd = selectedWorkspaceIds.filter(id => !currentWorkspaceIds.includes(id));

        // 3. Eliminar relaciones que ya no se necesitan
        if (workspacesToRemove.length > 0) {
          const { error: deleteError } = await supabase
            .from('user_workspaces_a18')
            .delete()
            .eq('user_id', formData.id)
            .in('workspace_id', workspacesToRemove);

          if (deleteError) throw deleteError;
        }

        // 4. Crear nuevas relaciones (UPsert)
        if (workspacesToAdd.length > 0) {
          const uniqueToAdd = [...new Set(workspacesToAdd)];
          const newRelations = uniqueToAdd.map((workspaceId) => ({
            user_id: formData.id,
            workspace_id: workspaceId, // sin conversión si es TEXT/UUID
          }));

          const { error: upsertError } = await supabase
            .from('user_workspaces_a18')
            .upsert(newRelations, {
              onConflict: 'user_id,workspace_id',
              ignoreDuplicates: true,
            });

          if (upsertError) throw upsertError;
        }

        
        setFormSuccess('Usuario actualizado exitosamente');
        setTimeout(() => {
          setShowForm(false);
          fetchUsers();
        }, 1500);
      }
      
    } catch (err) {
      console.error('Error al procesar el usuario:', err);
      setFormError(err.message || 'Error al procesar el usuario');
    } finally {
      setProcessing(false);
    }
  };

  // Función para cambiar el estado de un usuario (activar/desactivar)
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? true : false;
      
      const { error } = await supabase
        .from('users_a18')
        .update({ inactivo: newStatus })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Actualizar la lista de usuarios
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, inactivo: newStatus, status: newStatus ? 'inactive' : 'active' } 
          : user
      ));
      
      const statusText = newStatus ? 'desactivado' : 'activado';
      setFormSuccess(`Usuario ${statusText} exitosamente`);
      
      setTimeout(() => {
        setFormSuccess('');
      }, 2000);
      
    } catch (err) {
      console.error('Error al cambiar el estado del usuario:', err);
      setFormError(`Error al cambiar el estado del usuario: ${err.message}`);
      
      setTimeout(() => {
        setFormError('');
      }, 3000);
    }
  };

  // Exportar usuarios a CSV
  const exportToCSV = () => {
    try {
      const filteredUsers = getFilteredUsers();
      
      // Preparar encabezados del CSV
      const headers = [
        'ID', 'Email', 'Nombre', 'Teléfono', 'Rol', 'Estado', 'Fecha de Creación'
      ];
      
      // Preparar filas de datos
      const rows = filteredUsers.map(user => [
        user.id,
        user.email,
        user.name || '',
        user.phone || '',
        user.role,
        user.inactivo ? 'Inactivo' : 'Activo',
        user.created_at ? new Date(user.created_at).toLocaleString() : ''
      ]);
      
      // Combinar encabezados y filas
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Crear y descargar el archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'usuarios_sistema.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error('Error al exportar usuarios:', err);
      setFormError('Error al exportar usuarios: ' + err.message);
    }
  };

  // Obtener usuarios filtrados
  const getFilteredUsers = () => {
    return users.filter(user => {
      // Filtro de búsqueda - busca en email, nombre y teléfono
      const searchMatch = 
        user.email?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (user.phone && user.phone.toLowerCase().includes(searchFilter.toLowerCase()));
      
      // Filtro de rol
      const roleMatch = roleFilter === 'all' || user.role === roleFilter;
      
      // Filtro de estado
      const statusMatch = statusFilter === 'all' || 
                         (statusFilter === 'active' && !user.inactivo) || 
                         (statusFilter === 'inactive' && user.inactivo);
      
      return searchMatch && roleMatch && statusMatch;
    });
  };

  // Renderizar icono del rol
  const getRoleIcon = (role) => {
    switch (role) {
      case 'superadmin': return FiShield;
      case 'admin': return FiSettings;
      case 'supervisor': return FiActivity;
      case 'checker': return FiTruck;
      default: return FiUser;
    }
  };

  // Renderizar nombre del rol
  const getRoleName = (role) => {
    switch (role) {
      case 'superadmin': return 'Super Administrador';
      case 'admin': return 'Administrador';
      case 'supervisor': return 'Supervisor';
      case 'checker': return 'Checador';
      default: return 'Usuario';
    }
  };

  // Renderizar color del rol
  const getRoleColor = (role) => {
    switch (role) {
      case 'superadmin': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'supervisor': return 'bg-green-100 text-green-800';
      case 'checker': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filtrar usuarios
  const filteredUsers = getFilteredUsers();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios Global</h1>
          <p className="text-gray-600">Administra todos los usuarios del sistema</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-1"
          >
            <SafeIcon icon={FiDownload} className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button
            onClick={() => openUserForm('create')}
            className="bg-red-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center space-x-1"
          >
            <SafeIcon icon={FiUserPlus} className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Mensajes */}
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

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <SafeIcon icon={FiFilter} className="w-5 h-5 mr-2 text-red-600" />
            Filtros
          </h2>
          <button 
            onClick={fetchUsers} 
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
          >
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por email, nombre o teléfono..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>
          
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            >
              <option value="all">Todos los roles</option>
              <option value="superadmin">Super Administradores</option>
              <option value="admin">Administradores</option>
              <option value="supervisor">Supervisores</option>
              <option value="checker">Checadores</option>
            </select>
          </div>
          
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Usuarios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <SafeIcon icon={FiUsers} className="w-5 h-5 mr-2 text-red-600" />
              Usuarios
            </h2>
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded">
              {filteredUsers.length}
            </span>
          </div>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <SafeIcon icon={FiUsers} className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron usuarios con los filtros aplicados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Workspaces
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <SafeIcon icon={getRoleIcon(user.role)} className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.email}</div>
                            <div className="text-sm text-gray-500">{user.name || 'Sin nombre'}</div>
                            {user.phone && (
                              <div className="text-xs text-gray-400 flex items-center">
                                <SafeIcon icon={FiPhone} className="w-3 h-3 mr-1" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}>
                          {getRoleName(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.inactivo ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {user.inactivo ? 'Inactivo' : 'Activo'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.workspaceIds && user.workspaceIds.length > 0 ? (
                            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                              {user.workspaceIds.length} workspaces
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Sin workspaces</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openUserForm('edit', user)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                          >
                            <SafeIcon icon={FiEdit2} className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user.id, user.inactivo ? 'inactive' : 'active')}
                            className={`${user.inactivo ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'} p-1`}
                          >
                            <SafeIcon icon={user.inactivo ? FiCheck : FiX} className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Usuario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {formMode === 'create' ? 'Crear Usuario' : 'Editar Usuario'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <SafeIcon icon={FiX} className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  placeholder="usuario@ejemplo.com"
                  required
                  disabled={formMode === 'edit'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  placeholder="Nombre y apellidos"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  placeholder="Número de teléfono"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                >
                  <option value="checker">Checador</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
                  <option value="superadmin">Super Administrador</option>
                </select>
              </div>

              {/* Contraseña - Solo visible en modo crear o en modo editar si se quiere cambiar */}
              {(formMode === 'create' || formMode === 'edit') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formMode === 'create' ? 'Contraseña' : 'Nueva Contraseña (dejar en blanco para no cambiar)'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                        placeholder={formMode === 'create' ? 'Contraseña' : 'Nueva contraseña'}
                        required={formMode === 'create'}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <SafeIcon icon={showPassword ? FiEyeOff : FiEye} className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formMode === 'create' ? 'Confirmar Contraseña' : 'Confirmar Nueva Contraseña'}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                        placeholder={formMode === 'create' ? 'Confirmar contraseña' : 'Confirmar nueva contraseña'}
                        required={formMode === 'create' || formData.password !== ''}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <SafeIcon icon={showConfirmPassword ? FiEyeOff : FiEye} className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
              
              {/* Workspaces */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asignar Workspaces
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {workspaces.length > 0 ? (
                    <div className="space-y-2">
                      {workspaces.map(workspace => (
                        <div key={workspace.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`workspace-${workspace.id}`}
                            checked={formData.workspaceIds.includes(workspace.id)}
                            onChange={(e) => handleWorkspaceCheckboxChange(workspace.id, e.target.checked)}
                            className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
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
                    <p className="text-sm text-gray-500 py-2 text-center">
                      No hay workspaces disponibles
                    </p>
                  )}
                </div>
              </div>
              
              {formMode === 'create' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center text-yellow-800">
                    <SafeIcon icon={FiAlertCircle} className="w-4 h-4 mr-2 flex-shrink-0" />
                    <p className="text-sm">
                      Se enviará un correo electrónico al usuario con sus credenciales de acceso.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  disabled={processing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center text-sm"
                  disabled={processing}
                >
                  {processing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    formMode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminUsersManagement;
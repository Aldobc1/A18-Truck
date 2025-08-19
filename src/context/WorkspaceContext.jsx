import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext();

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar workspaces del usuario actual
  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!user) {
        setWorkspaces([]);
        setCurrentWorkspace(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Obtener los workspaces a los que pertenece el usuario
        const { data: userWorkspaces, error: userWorkspacesError } = await supabase
          .from('user_workspaces_a18')
          .select('workspace_id')
          .eq('user_id', user.id);

        if (userWorkspacesError) {
          throw new Error(userWorkspacesError.message);
        }

        if (userWorkspaces.length === 0) {
          setWorkspaces([]);
          setCurrentWorkspace(null);
          setLoading(false);
          return;
        }

        const workspaceIds = userWorkspaces.map(uw => uw.workspace_id);

        // Obtener los detalles de los workspaces
        const { data: workspacesData, error: workspacesError } = await supabase
          .from('workspaces_a18')
          .select('*')
          .in('id', workspaceIds);

        if (workspacesError) {
          throw new Error(workspacesError.message);
        }

        setWorkspaces(workspacesData || []);
        
        // Establecer el workspace actual (el primero por defecto)
        if (workspacesData && workspacesData.length > 0) {
          // Verificar si hay un workspace guardado en localStorage
          const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
          const savedWorkspace = workspacesData.find(w => w.id === savedWorkspaceId);
          
          if (savedWorkspace) {
            setCurrentWorkspace(savedWorkspace);
          } else {
            setCurrentWorkspace(workspacesData[0]);
            localStorage.setItem('currentWorkspaceId', workspacesData[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching workspaces:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [user]);

  // Función para crear un nuevo workspace
  const createWorkspace = async (name, description = '') => {
    try {
      if (!user) throw new Error('Usuario no autenticado');
      
      // Insertar nuevo workspace
const { data: newWorkspace, error: workspaceError } = await supabase
  .from('workspaces_a18')
  .insert([{
    name,
    description,
    creator_id: user.id,
    creator_email: user.email
  }])
  .select()
  .single();

      if (workspaceError) {
        throw new Error(workspaceError.message);
      }

      // Asociar el usuario con el workspace
      const { error: relationError } = await supabase
        .from('user_workspaces_a18')
        .insert([{
          user_id: user.id,
          workspace_id: newWorkspace.id
        }]);

      if (relationError) {
        // Intentar eliminar el workspace creado si falla la relación
        await supabase
          .from('workspaces_a18')
          .delete()
          .eq('id', newWorkspace.id);
          
        throw new Error(relationError.message);
      }

      // Actualizar el estado
      setWorkspaces(prev => [...prev, newWorkspace]);
      setCurrentWorkspace(newWorkspace);
      localStorage.setItem('currentWorkspaceId', newWorkspace.id);
      
      return newWorkspace;
    } catch (err) {
      console.error('Error creating workspace:', err);
      setError(err.message);
      throw err;
    }
  };

  // Función para cambiar el workspace actual
  const switchWorkspace = (workspaceId) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      localStorage.setItem('currentWorkspaceId', workspace.id);
    } else {
      throw new Error('Workspace no encontrado');
    }
  };

  // Función para añadir un usuario a un workspace
  const addUserToWorkspace = async (email, workspaceId) => {
    try {
      // Obtener el ID del usuario por su email
      const { data: userData, error: userError } = await supabase
        .from('users_a18')
        .select('id')
        .eq('email', email)
        .single();

      if (userError) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar si el usuario ya está en el workspace
      const { data: existingRelation, error: checkError } = await supabase
        .from('user_workspaces_a18')
        .select('*')
        .eq('user_id', userData.id)
        .eq('workspace_id', workspaceId);

      if (checkError) {
        throw new Error(checkError.message);
      }

      if (existingRelation && existingRelation.length > 0) {
        throw new Error('El usuario ya pertenece a este workspace');
      }

      // Añadir el usuario al workspace
      const { error: relationError } = await supabase
        .from('user_workspaces_a18')
        .insert([{
          user_id: userData.id,
          workspace_id: workspaceId
        }]);

      if (relationError) {
        throw new Error(relationError.message);
      }

      return { success: true };
    } catch (err) {
      console.error('Error adding user to workspace:', err);
      setError(err.message);
      throw err;
    }
  };

  const value = {
    workspaces,
    currentWorkspace,
    loading,
    error,
    createWorkspace,
    switchWorkspace,
    addUserToWorkspace
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
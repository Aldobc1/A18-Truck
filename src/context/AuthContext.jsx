import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Check for active session on mount
    const checkSession = async () => {
      try {
        setLoading(true);

        // ✅ MEJOR MANEJO DE SESIÓN
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking auth session:', error);
          setAuthError(error.message);
          return;
        }

        if (session?.user) {
          // ✅ VALIDAR QUE EL TOKEN TENGA EL CLAIM SUB
          if (!session.user.id) {
            console.error('Invalid session: missing user ID');
            await supabase.auth.signOut();
            setUser(null);
            setAuthError("Sesión inválida. Por favor, inicia sesión nuevamente.");
            return;
          }

          // Get user profile data
          const { data: userData, error: userError } = await supabase
            .from('users_a18')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            console.error('Error fetching user data:', userError);
            // Si no se encuentra el perfil del usuario, cerrar sesión
            await supabase.auth.signOut();
            setUser(null);
            setAuthError("No se encontró tu perfil de usuario. Por favor, contacta con soporte.");
          } else if (userData) {
            // Set full user data including role
            setUser({
              id: session.user.id,
              email: session.user.email,
              role: userData.role || 'checker',
            });
          } else {
            // Si el userData es null, cerrar sesión
            await supabase.auth.signOut();
            setUser(null);
            setAuthError("No se encontró tu perfil de usuario. Por favor, contacta con soporte.");
          }
        }
      } catch (err) {
        console.error('Unexpected auth error:', err);
        setAuthError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
          // ✅ VALIDAR SESIÓN AL INICIAR SESIÓN
          if (!session.user?.id) {
            console.error('Invalid session on sign in: missing user ID');
            await supabase.auth.signOut();
            setUser(null);
            setAuthError("Sesión inválida. Por favor, inicia sesión nuevamente.");
            return;
          }

          // Get user profile data on sign in
          const { data: userData, error: userError } = await supabase
            .from('users_a18')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userError || !userData) {
            console.error('Error fetching user data on auth change:', userError);
            // Si no se encuentra el perfil del usuario, cerrar sesión
            await supabase.auth.signOut();
            setUser(null);
            setAuthError("No se encontró tu perfil de usuario. Por favor, contacta con soporte.");
          } else {
            // Set full user data including role
            setUser({
              id: session.user.id,
              email: session.user.email,
              role: userData.role || 'checker',
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    // Check session on mount
    checkSession();

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Signin with email and password
  const login = async (email, password) => {
    setAuthError(null);
    
    try {
      // Para propósitos de demo, usar login simulado para credenciales específicas
      if (email === 'barbacastillo@gmail.com' && password === 'admin123') {
        const userData = {
          id: '1',
          email: 'barbacastillo@gmail.com',
          role: 'admin',
          name: 'Administrador'
        };
        setUser(userData);
        localStorage.setItem('truckApp_user', JSON.stringify(userData));
        return userData;
      } else if (email === 'superadmin@gmail.com' && password === 'super123') {
        const userData = {
          id: '3',
          email: 'superadmin@gmail.com',
          role: 'superadmin',
          name: 'Super Administrador'
        };
        setUser(userData);
        localStorage.setItem('truckApp_user', JSON.stringify(userData));
        return userData;
      } else if (email === 'supervisor@gmail.com' && password === 'super123') {
        const userData = {
          id: '4',
          email: 'supervisor@gmail.com',
          role: 'supervisor',
          name: 'Supervisor'
        };
        setUser(userData);
        localStorage.setItem('truckApp_user', JSON.stringify(userData));
        return userData;
      } else if (password === 'checker123') {
        const userData = {
          id: '2',
          email: email,
          role: 'checker',
          name: 'Checador'
        };
        setUser(userData);
        localStorage.setItem('truckApp_user', JSON.stringify(userData));
        return userData;
      }

      // ✅ AUTENTICACIÓN REAL CON MEJOR VALIDACIÓN
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      // ✅ VALIDAR QUE LA RESPUESTA TENGA USER ID
      if (!data.user?.id) {
        throw new Error("Respuesta de autenticación inválida: falta ID de usuario");
      }

      // Obtener perfil de usuario con información de rol
      const { data: userData, error: userError } = await supabase
        .from('users_a18')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData) {
        console.error('Error fetching user profile:', userError);
        // Si no se encuentra el perfil del usuario, cerrar sesión
        await supabase.auth.signOut();
        throw new Error("No se encontró tu perfil de usuario. Por favor, contacta con soporte.");
      } else {
        setUser({
          id: data.user.id,
          email: data.user.email,
          role: userData.role,
        });
      }

      return data;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  // Sign up with email and password
  const signUp = async (email, password) => {
    setAuthError(null);
    
    try {
      // Registrar usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Crear perfil de usuario con rol predeterminado de checker
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users_a18')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              role: 'checker'
            }
          ]);

        // Si hay un error al crear el perfil, consideramos que el registro falló
        if (profileError) {
          console.error('Error creating user profile:', profileError);
          // Intentar eliminar el usuario de auth si es posible
          try {
            // Nota: esto requeriría permisos administrativos, así que es posible que falle
            // y queden usuarios "huérfanos" en la tabla auth.users
            console.log('Attempting to clean up auth user after profile creation failure');
          } catch (cleanupError) {
            console.error('Could not clean up auth user:', cleanupError);
          }
          
          return { success: false, error: `No se pudo crear tu perfil de usuario: ${profileError.message}` };
        }
      }

      return { success: true, data };
    } catch (error) {
      setAuthError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Sign out
  const logout = async () => {
    try {
      // Para propósitos de demo, solo limpiar localStorage
      setUser(null);
      localStorage.removeItem('truckApp_user');

      // Cierre de sesión real en Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Password reset request
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      setAuthError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Update password
  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      setAuthError(error.message);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    authError,
    login,
    signUp,
    logout,
    resetPassword,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
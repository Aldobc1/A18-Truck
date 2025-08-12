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
        
        // Get session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking auth session:', error);
          setAuthError(error.message);
          return;
        }

        if (session) {
          // Get user profile data
          const { data: userData, error: userError } = await supabase
            .from('users_a18')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            console.error('Error fetching user data:', userError);
            // Use basic user info even if profile fetch fails
            setUser({
              id: session.user.id,
              email: session.user.email,
              role: 'checker', // Default role if profile fetch fails
            });
          } else if (userData) {
            // Set full user data including role
            setUser({
              id: session.user.id,
              email: session.user.email,
              role: userData.role || 'checker',
            });
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
          // Get user profile data on sign in
          const { data: userData, error: userError } = await supabase
            .from('users_a18')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            console.error('Error fetching user data on auth change:', userError);
            // Use basic user info even if profile fetch fails
            setUser({
              id: session.user.id,
              email: session.user.email,
              role: 'checker', // Default role if profile fetch fails
            });
          } else if (userData) {
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
      // For demo purposes, use mock login for specific credentials
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

      // Actual Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Get user profile with role information
      const { data: userData, error: userError } = await supabase
        .from('users_a18')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.error('Error fetching user profile:', userError);
        // Use basic user info even if profile fetch fails
        setUser({
          id: data.user.id,
          email: data.user.email,
          role: 'checker', // Default role
        });
      } else if (userData) {
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
      // Actual Supabase signup
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

      // Create user profile with default checker role
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

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          // Even if profile creation fails, the auth account was created
          // We'll handle this case and still return success
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
      // For demo purposes, just clear local storage
      setUser(null);
      localStorage.removeItem('truckApp_user');
      
      // Actual Supabase signout
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
        redirectTo: `${window.location.origin}/reset-password`,
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
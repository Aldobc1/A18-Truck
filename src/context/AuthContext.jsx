import React, { createContext, useContext, useState, useEffect } from 'react';

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

  useEffect(() => {
    const storedUser = localStorage.getItem('truckApp_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email === 'barbacastillo@gmail.com' && password === 'admin123') {
          const userData = {
            id: '1',
            email: 'barbacastillo@gmail.com',
            role: 'admin',
            name: 'Administrador'
          };
          setUser(userData);
          localStorage.setItem('truckApp_user', JSON.stringify(userData));
          resolve(userData);
        } else if (password === 'checker123') {
          const userData = {
            id: '2',
            email: email,
            role: 'checker',
            name: 'Checador'
          };
          setUser(userData);
          localStorage.setItem('truckApp_user', JSON.stringify(userData));
          resolve(userData);
        } else {
          reject(new Error('Credenciales inválidas'));
        }
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('truckApp_user');
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
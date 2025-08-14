import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import CheckerDashboard from './components/CheckerDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { DataProvider } from './context/DataContext';
import LoadingSpinner from './components/common/LoadingSpinner';

// Componente que maneja el contenido de la app basado en la autenticación
function AppContent() {
  const { user, loading } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Agregamos un pequeño retraso para evitar parpadeos en la carga inicial
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Mostrar spinner mientras se carga la autenticación
  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Función para determinar la redirección basada en el rol del usuario
  const getRedirectPath = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'superadmin':
        return '/admin'; // Por ahora redirigimos a admin, podríamos tener un dashboard específico
      case 'admin':
        return '/admin';
      case 'supervisor':
        return '/admin'; // Por ahora redirigimos a admin, podríamos tener un dashboard específico
      case 'checker':
        return '/checker';
      default:
        return '/login';
    }
  };

  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/login" element={user ? <Navigate to={getRedirectPath()} replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={getRedirectPath()} replace /> : <Register />} />
        <Route path="/admin/*" element={user ? <AdminDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/checker/*" element={user ? <CheckerDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/*" element={<Navigate to={getRedirectPath()} replace />} />
      </Routes>
    </AnimatePresence>
  );
}

// Componente principal de la aplicación
function App() {
  return (
    <Router>
      <AuthProvider>
        <WorkspaceProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
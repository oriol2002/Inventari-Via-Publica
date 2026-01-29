import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginForm } from './components/LoginForm';
import { useAuth } from './hooks/useAuth';
import AppMain from './AppMain';

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Carregant...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<LoginForm />} />

      {/* Dashboard Protegit */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppMain />
          </ProtectedRoute>
        }
      />

      {/* Redirigeix rutes desconegudes al dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
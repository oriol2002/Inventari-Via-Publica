import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export const LoginForm: React.FC = () => {
  const { loginWithGoogle, isLoading, error } = useAuth();
  const offlineMode = (import.meta as any).env?.VITE_OFFLINE_MODE === 'true';
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
            Mobilitat<span className="text-blue-600">Tortosa</span>
          </h1>
          <p className="text-sm text-slate-500 mt-2">Inventari de Via Pública</p>
        </div>

        <div className="space-y-4">

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={offlineMode || isLoading}
            className={`w-full py-3 rounded-xl font-black uppercase text-sm tracking-widest border transition-colors flex items-center justify-center gap-2 ${
              offlineMode
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
            } ${isLoading ? 'opacity-50' : ''}`}
            title={offlineMode ? 'Mode offline actiu' : 'Login amb Google'}
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Login amb Google
          </button>
        </div>
      </div>
    </div>
  );
};
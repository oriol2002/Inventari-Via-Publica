import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { EnvelopeIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const { login, signup, loginWithGoogle, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignup) {
      if (password !== passwordConfirm) {
        alert('Les contrasenyes no coincideixen');
        return;
      }
      const result = await signup(email, password, fullName);
      if (result.success) {
        navigate('/');
      }
    } else {
      const result = await login(email, password);
      if (result.success) {
        navigate('/');
      }
    }
  };

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom (solo signup) */}
          {isSignup && (
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">Nom Complet</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <UserIcon className="w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Joan Casanovas"
                  required={isSignup}
                  className="bg-transparent w-full outline-none text-sm"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-black text-slate-700 mb-2">Email</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <EnvelopeIcon className="w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="bg-transparent w-full outline-none text-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-black text-slate-700 mb-2">Contrasenya</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <LockClosedIcon className="w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-transparent w-full outline-none text-sm"
              />
            </div>
          </div>

          {/* Confirmar Contrasenya (solo signup) */}
          {isSignup && (
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">Confirmar Contrasenya</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <LockClosedIcon className="w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  required={isSignup}
                  className="bg-transparent w-full outline-none text-sm"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase text-sm tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {isLoading ? 'Processant...' : (isSignup ? 'Crear Compte' : 'Accedir')}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-xs text-slate-500 uppercase font-bold">O</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white border border-slate-200 text-slate-900 py-3 rounded-xl font-black uppercase text-sm tracking-widest hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            🔐 Login amb Google
          </button>
        </form>

        {/* Toggle signup/login */}
        <p className="text-center text-sm text-slate-600 mt-6">
          {isSignup ? '¿Ja tens compte? ' : '¿No tens compte? '}
          <button
            onClick={() => {
              setIsSignup(!isSignup);
              setEmail('');
              setPassword('');
              setFullName('');
              setPasswordConfirm('');
            }}
            className="text-blue-600 font-black hover:underline"
          >
            {isSignup ? "Accedir aquí" : "Registra-t"}
          </button>
        </p>
      </div>
    </div>
  );
};
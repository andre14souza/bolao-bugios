import React, { useState } from 'react';
import { User, Lock, Trophy, LogIn, UserPlus } from 'lucide-react';
import { loginUser, registerUser } from '../services/api';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!username.trim() || !password) {
      setError("Por favor, preencha todos os campos.");
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        const loggedUser = await loginUser(username, password);
        onLogin(loggedUser);
      } else {
        const registeredUser = await registerUser(username, password);
        // Login automático após cadastro
        const loggedUser = await loginUser(registeredUser, password);
        onLogin(loggedUser);
      }
    } catch (err) {
      setError(err.message || "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-8 relative bg-field-pattern">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl text-center border-t-4 border-football-gold relative overflow-hidden shadow-2xl">
        {/* Decorative corner elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-football-vibrantGreen/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-football-royalBlue/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none"></div>
        
        <div className="flex justify-center mb-4">
          <div className="bg-football-gold p-4 rounded-full shadow-lg shadow-amber-500/20 text-football-darkGreen transform transition hover:scale-110">
            <Trophy size={48} className="stroke-[2.5]" />
          </div>
        </div>
        
        <h1 className="text-4xl font-extrabold uppercase tracking-tight text-white mb-2">
          Bolão dos <span className="text-football-gold text-glow-gold">Bugios</span>
        </h1>
        <p className="text-football-brightYellow font-bold tracking-widest text-xs uppercase mb-8 flex justify-center items-center gap-2">
          <span>⚽</span> Copa do Mundo 2026 <span>⚽</span>
        </p>

        <h2 className="text-xl font-bold text-white mb-6">
          {mode === 'login' ? 'Entre na sua Conta' : 'Criar Nova Conta'}
        </h2>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold text-left animate-shake">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Username Input */}
          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1.5 ml-1">
              Usuário
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <User size={18} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-white text-sm focus:scale-[1.01] transition-transform"
                placeholder="Ex: André, Maicon, Brenno..."
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1.5 ml-1">
              Senha
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <Lock size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-white text-sm focus:scale-[1.01] transition-transform"
                placeholder="Insira sua senha"
                disabled={loading}
              />
            </div>
          </div>

          {mode === 'register' && (
            <p className="text-[10px] text-football-brightYellow/70 italic leading-relaxed ml-1">
              * Dica: Use uma senha simples (ex: 123). O bolão é apenas entre amigos!
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-football-vibrantGreen to-emerald-600 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : mode === 'login' ? (
              <>
                <LogIn size={16} />
                <span>Entrar no Bolão</span>
              </>
            ) : (
              <>
                <UserPlus size={16} />
                <span>Criar Conta & Entrar</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode Link */}
        <div className="mt-8 pt-5 border-t border-white/5">
          {mode === 'login' ? (
            <p className="text-xs text-slate-400">
              Não tem uma conta?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className="text-football-gold font-bold hover:underline cursor-pointer"
              >
                Cadastre-se aqui
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Já possui uma conta?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-football-gold font-bold hover:underline cursor-pointer"
              >
                Faça login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

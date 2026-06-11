import React from 'react';
import { User, Trophy } from 'lucide-react';

const FRIENDS = [
  'André',
  'Maicon',
  'Charles',
  'Paulo',
  'Brenno',
  'Eduardo',
  'Victor'
];

export default function Login({ onLogin }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-8 relative bg-field-pattern">
      <div className="w-full max-w-2xl glass-panel p-8 rounded-3xl text-center border-t-4 border-football-gold relative overflow-hidden">
        {/* Decorative corner elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-football-vibrantGreen/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-football-royalBlue/10 rounded-full blur-2xl -ml-16 -mb-16"></div>
        
        <div className="flex justify-center mb-4">
          <div className="bg-football-gold p-4 rounded-full shadow-lg shadow-amber-500/20 text-football-darkGreen transform transition hover:scale-110">
            <Trophy size={48} className="stroke-[2.5]" />
          </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight text-white mb-2">
          Bolão dos <span className="text-football-gold text-glow-gold">Bugios</span>
        </h1>
        <p className="text-football-brightYellow font-bold tracking-widest text-sm uppercase mb-8 flex justify-center items-center gap-2">
          <span>⚽</span> Copa do Mundo 2026 <span>⚽</span>
        </p>

        <h2 className="text-lg md:text-xl font-medium text-slate-300 mb-6">
          Quem está acessando o bolão agora?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-xl mx-auto">
          {FRIENDS.map((name) => (
            <button
              key={name}
              onClick={() => onLogin(name)}
              className="flex items-center justify-between p-4 rounded-2xl glass-panel-hover glass-input text-left group transition-all duration-300 font-semibold text-lg hover:text-football-gold"
            >
              <div className="flex items-center gap-3">
                <div className="bg-football-grassGreen/20 group-hover:bg-football-gold/20 p-2.5 rounded-xl transition-colors">
                  <User className="text-football-vibrantGreen group-hover:text-football-gold" size={22} />
                </div>
                <span>{name}</span>
              </div>
              <span className="text-football-vibrantGreen group-hover:text-football-gold opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">
                Entrar &rarr;
              </span>
            </button>
          ))}
        </div>
        
        <p className="text-xs text-slate-400 mt-8 italic">
          *Nenhuma senha é necessária. Selecione o seu nome para gerenciar seus palpites.
        </p>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Calendar, Layers, ShieldAlert, Award, LogOut, Menu, X, Trophy, HelpCircle, GitCommit, CheckSquare, Lock } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentUser, isAdmin, knockoutEnabled, onLogout, onOpenSettings }) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'daily', label: 'Jogos do Dia', icon: Calendar },
    { id: 'groups', label: 'Jogos Grupos', icon: Layers },
    { id: 'knockout', label: 'Jogos Mata-mata', icon: Trophy },
    { id: 'group-stage-predictions', label: 'Classificação Grupos', icon: CheckSquare },
    { id: 'bracket-predictions', label: 'Chaveamento', icon: GitCommit },
    { id: 'oracle', label: 'Oráculo', icon: HelpCircle },
    { id: 'ranking', label: 'Ranking', icon: Award },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin ⚙️', icon: ShieldAlert });
  }

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setIsOpen(false);
  };

  return (
    <nav className="glass-panel sticky top-0 z-50 px-4 py-3 md:px-6 border-b border-football-glassBorder">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setActiveTab('daily')}>
          <div className="text-football-gold">
            <Trophy size={28} className="stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white uppercase">
            Bugios<span className="text-football-gold font-bold">2026</span>
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[70%]">
          {navItems.map((item) => {
            const isLocked = !knockoutEnabled && !isAdmin && (item.id === 'knockout' || item.id === 'bracket-predictions');
            const Icon = isLocked ? Lock : item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white text-zinc-950 border border-white'
                    : isLocked
                    ? 'text-slate-500 hover:text-slate-400 hover:bg-white/5 opacity-80'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} className={isLocked ? 'text-amber-500' : ''} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* User Profile & Logout */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 select-none">Palpitando como</span>
            <button
              onClick={onOpenSettings}
              title="Configurações da Conta"
              className="bg-football-gold/10 hover:bg-football-gold/20 text-football-gold px-2.5 py-1 rounded-full text-xs font-bold border border-football-gold/30 cursor-pointer flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            >
              <span>⚽ {currentUser}</span>
              <span className="text-[10px] opacity-75">⚙️</span>
            </button>
          </div>
          <button
            onClick={onLogout}
            title="Sair da Sessão"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="lg:hidden flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            title="Configurações da Conta"
            className="bg-football-gold/10 hover:bg-football-gold/20 text-football-gold px-2.5 py-1 rounded-full text-xs font-bold border border-football-gold/25 cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
          >
            <span>⚽ {currentUser}</span>
            <span className="text-[10px] opacity-75">⚙️</span>
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden glass-panel mt-3 p-4 rounded-2xl border border-football-glassBorder flex flex-col gap-2 animate-fadeIn max-h-[80vh] overflow-y-auto">
          {navItems.map((item) => {
            const isLocked = !knockoutEnabled && !isAdmin && (item.id === 'knockout' || item.id === 'bracket-predictions');
            const Icon = isLocked ? Lock : item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-zinc-950 border border-white'
                    : isLocked
                    ? 'text-slate-500 hover:text-slate-400 hover:bg-white/5 opacity-85'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} className={isLocked ? 'text-amber-500' : ''} />
                {item.label}
              </button>
            );
          })}
          <hr className="border-white/10 my-1" />
          <button
            onClick={() => {
              onOpenSettings();
              setIsOpen(false);
            }}
            className="flex items-center gap-3 p-3 rounded-xl text-sm font-bold text-football-gold hover:bg-football-gold/10 transition-colors cursor-pointer"
          >
            <span className="text-base">⚙️</span>
            Configurações da Conta
          </button>
          <hr className="border-white/10 my-1" />
          <button
            onClick={onLogout}
            className="flex items-center gap-3 p-3 rounded-xl text-sm font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            Sair da Sessão
          </button>
        </div>
      )}
    </nav>
  );
}

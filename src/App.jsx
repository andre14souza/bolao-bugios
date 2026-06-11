import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './views/Login';
import DailyMatches from './views/DailyMatches';
import Groups from './views/Groups';
import Knockout from './views/Knockout';
import GroupStagePredictions from './views/GroupStagePredictions';
import BracketPredictions from './views/BracketPredictions';
import Oracle from './views/Oracle';
import Ranking from './views/Ranking';
import Admin from './views/Admin';
import { fetchMatches, fetchGuesses, fetchGroupQualifiers, fetchBracket, fetchOracle } from './services/api';
import { Trophy } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  
  // Estados para dados integrados
  const [matches, setMatches] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [groupQualifiers, setGroupQualifiers] = useState({ guesses: [], results: {} });
  const [bracketGuesses, setBracketGuesses] = useState({ guesses: [], results: { quartas: [], semis: [], finalists: [], champion: null } });
  const [oracle, setOracle] = useState({ guesses: [], results: {} });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carrega sessão de login local
  useEffect(() => {
    const savedUser = localStorage.getItem('bugios_user');
    if (savedUser) {
      setCurrentUser(savedUser);
    }
  }, []);

  // Orquestração de carregamento assíncrono paralelo
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        matchesData,
        guessesData,
        groupQualifiersData,
        bracketData,
        oracleData
      ] = await Promise.all([
        fetchMatches(),
        fetchGuesses(),
        fetchGroupQualifiers(),
        fetchBracket(),
        fetchOracle()
      ]);
      setMatches(matchesData);
      setGuesses(guessesData);
      setGroupQualifiers(groupQualifiersData);
      setBracketGuesses(bracketData);
      setOracle(oracleData);
    } catch (err) {
      console.error("Erro ao carregar dados do bolão:", err);
      setError("Não foi possível conectar ao servidor. Certifique-se de que o backend Express está ativo!");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogin = (username) => {
    localStorage.setItem('bugios_user', username);
    setCurrentUser(username);
    setActiveTab('daily');
  };

  const handleLogout = () => {
    localStorage.removeItem('bugios_user');
    setCurrentUser(null);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'daily':
        return (
          <DailyMatches
            matches={matches}
            guesses={guesses}
            currentUser={currentUser}
            onReload={loadData}
          />
        );
      case 'groups':
        return (
          <Groups
            matches={matches}
            guesses={guesses}
            currentUser={currentUser}
            onReload={loadData}
          />
        );
      case 'knockout':
        return (
          <Knockout
            matches={matches}
            guesses={guesses}
            currentUser={currentUser}
            onReload={loadData}
          />
        );
      case 'group-stage-predictions':
        return (
          <GroupStagePredictions
            matches={matches}
            groupQualifiers={groupQualifiers}
            currentUser={currentUser}
            onReload={loadData}
          />
        );
      case 'bracket-predictions':
        return (
          <BracketPredictions
            matches={matches}
            bracketGuesses={bracketGuesses}
            currentUser={currentUser}
            onReload={loadData}
          />
        );
      case 'oracle':
        return (
          <Oracle
            oracle={oracle}
            currentUser={currentUser}
            onReload={loadData}
          />
        );
      case 'ranking':
        return (
          <Ranking
            matches={matches}
            guesses={guesses}
            groupQualifiers={groupQualifiers}
            bracketGuesses={bracketGuesses}
            oracle={oracle}
          />
        );
      case 'admin':
        if (currentUser !== 'André') {
          setActiveTab('daily');
          return null;
        }
        return (
          <Admin
            matches={matches}
            groupQualifiers={groupQualifiers}
            bracketGuesses={bracketGuesses}
            oracle={oracle}
            onReload={loadData}
          />
        );
      default:
        return <div className="text-center p-8 text-slate-400">Página não encontrada.</div>;
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-field-pattern">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-grow pb-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] select-none">
            <div className="text-6xl animate-spin duration-1000 mb-4">⚽</div>
            <p className="text-sm font-semibold text-slate-300">Carregando dados da Copa 2026...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-12 p-6 glass-panel rounded-2xl border border-rose-500/30 text-center select-none animate-fadeIn">
            <p className="text-rose-400 font-bold mb-2">Erro de Conectividade</p>
            <p className="text-slate-300 text-sm mb-4">{error}</p>
            <button
              onClick={loadData}
              className="bg-football-gold text-football-darkGreen font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-amber-400 active:scale-95 transition-all uppercase cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          renderTabContent()
        )}
      </main>

      <footer className="py-6 border-t border-football-glassBorder text-center text-xs text-slate-500 select-none">
        <div className="flex justify-center items-center gap-1.5 mb-1">
          <Trophy size={14} className="text-football-gold" />
          <span className="font-extrabold uppercase text-slate-400 tracking-wider">Bolão dos Bugios 2026</span>
        </div>
        <p>Desenvolvido com orgulho 💚, 💛, 💙 e 🤍 para o melhor grupo de amigos.</p>
      </footer>
    </div>
  );
}

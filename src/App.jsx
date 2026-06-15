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
import { fetchMatches, fetchGuesses, fetchGroupQualifiers, fetchBracket, fetchOracle, fetchUsers, updateUser } from './services/api';
import { Trophy } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  
  // Estados para dados integrados
  const [matches, setMatches] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [groupQualifiers, setGroupQualifiers] = useState({ guesses: [], results: {} });
  const [bracketGuesses, setBracketGuesses] = useState({ guesses: [], results: { oitavas: [], quartas: [], semis: [], finalists: [], champion: null } });
  const [oracle, setOracle] = useState({ guesses: [], results: {} });
  const [users, setUsers] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para as Configurações da Conta
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsUsername, setSettingsUsername] = useState('');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsError, setSettingsError] = useState(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Carrega sessão de login local
  useEffect(() => {
    const savedUser = localStorage.getItem('bugios_user');
    const savedUserId = localStorage.getItem('bugios_user_id');
    if (savedUser) {
      setCurrentUser(savedUser);
    }
    if (savedUserId) {
      setCurrentUserId(Number(savedUserId));
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
        oracleData,
        usersData
      ] = await Promise.all([
        fetchMatches(),
        fetchGuesses(),
        fetchGroupQualifiers(),
        fetchBracket(),
        fetchOracle(),
        fetchUsers()
      ]);
      setMatches(matchesData);
      setGuesses(guessesData);
      setGroupQualifiers(groupQualifiersData);
      setBracketGuesses(bracketData);
      setOracle(oracleData);
      setUsers(usersData);
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

  const handleLogin = (userObj) => {
    const { username, id } = userObj;
    localStorage.setItem('bugios_user', username);
    localStorage.setItem('bugios_user_id', id);
    setCurrentUser(username);
    setCurrentUserId(id);
    setActiveTab('daily');
  };

  const handleLogout = () => {
    localStorage.removeItem('bugios_user');
    localStorage.removeItem('bugios_user_id');
    setCurrentUser(null);
    setCurrentUserId(null);
  };

  const handleOpenSettings = () => {
    setSettingsUsername(currentUser);
    setSettingsPassword('');
    setSettingsError(null);
    setSettingsSuccess(false);
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(false);
    setSettingsLoading(true);

    if (!settingsUsername.trim()) {
      setSettingsError("O nome de usuário não pode ser vazio.");
      setSettingsLoading(false);
      return;
    }

    try {
      const result = await updateUser(currentUser, settingsUsername, settingsPassword || null);
      if (result.success) {
        if (settingsUsername.trim() !== currentUser) {
          localStorage.setItem('bugios_user', settingsUsername.trim());
          setCurrentUser(settingsUsername.trim());
        }
        setSettingsSuccess(true);
        setSettingsPassword('');
        loadData();
        setTimeout(() => {
          setShowSettingsModal(false);
          setSettingsSuccess(false);
        }, 1500);
      }
    } catch (err) {
      setSettingsError(err.message || "Erro ao atualizar conta.");
    } finally {
      setSettingsLoading(false);
    }
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
            groupQualifiers={groupQualifiers}
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
            users={users}
            matches={matches}
            guesses={guesses}
            groupQualifiers={groupQualifiers}
            bracketGuesses={bracketGuesses}
            oracle={oracle}
          />
        );
      case 'admin':
        if (currentUserId !== 1) {
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
        currentUserId={currentUserId}
        onLogout={handleLogout}
        onOpenSettings={handleOpenSettings}
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

      {/* Modal de Configurações da Conta */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-football-glassBorder relative shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              ⚙️ Configurações da Conta
            </h2>

            {settingsError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold text-left">
                ⚠️ {settingsError}
              </div>
            )}

            {settingsSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-left">
                ✅ Alterações salvas com sucesso!
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 text-left">
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1.5 ml-1">
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  value={settingsUsername}
                  onChange={(e) => setSettingsUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-sm focus:border-football-gold transition-all"
                  placeholder="Nome de usuário"
                  disabled={settingsLoading || settingsSuccess}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1.5 ml-1">
                  Nova Senha (deixe em branco para manter a atual)
                </label>
                <input
                  type="password"
                  value={settingsPassword}
                  onChange={(e) => setSettingsPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-white text-sm focus:border-football-gold transition-all"
                  placeholder="Nova senha"
                  disabled={settingsLoading || settingsSuccess}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={settingsLoading || settingsSuccess}
                  className="flex-1 py-3 rounded-xl bg-football-gold text-football-darkGreen font-bold text-sm shadow-lg hover:bg-amber-400 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {settingsLoading ? (
                    <div className="w-4 h-4 border-2 border-football-darkGreen border-t-transparent rounded-full animate-spin"></div>
                  ) : "Salvar"}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    setSettingsError(null);
                    setSettingsSuccess(false);
                  }}
                  disabled={settingsLoading || settingsSuccess}
                  className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold text-sm transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

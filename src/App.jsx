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
import { fetchMatches, fetchGuesses, fetchGroupQualifiers, fetchBracket, fetchOracle, fetchUsers, updateUser, fetchSettings, fetchPointsAdjustments } from './services/api';
import { Trophy, X } from 'lucide-react';
import { calculateMatchScore, isMatchTimeOver } from './services/points';
import { TEAM_FLAGS } from './services/flags';

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
  const [selectedMatchForStats, setSelectedMatchForStats] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ knockoutEnabled: false });
  const [pointsAdjustments, setPointsAdjustments] = useState([]);

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
    let savedUserId = localStorage.getItem('bugios_user_id');
    
    // Limpar string 'null' ou 'undefined' vinda de sessões anteriores
    if (savedUserId === 'null' || savedUserId === 'undefined') {
      savedUserId = null;
      localStorage.removeItem('bugios_user_id');
    }

    if (savedUser) {
      setCurrentUser(savedUser);
      // Fallback para sessões ativas existentes sem ID salvo localmente
      if (!savedUserId && (savedUser.toLowerCase().trim() === 'andre' || savedUser === 'André')) {
        savedUserId = '1';
        localStorage.setItem('bugios_user_id', '1');
      }
    }
    if (savedUserId) {
      setCurrentUserId(Number(savedUserId));
    }
  }, []);

  // Definição de Admin com fallback de username caso o ID ainda não tenha carregado do local storage
  const isAdmin = currentUserId === 1 || (!currentUserId && currentUser && (currentUser.toLowerCase().trim() === 'andre' || currentUser === 'André'));

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
        usersData,
        settingsData,
        adjustmentsData
      ] = await Promise.all([
        fetchMatches(),
        fetchGuesses(),
        fetchGroupQualifiers(),
        fetchBracket(),
        fetchOracle(),
        fetchUsers(),
        fetchSettings(),
        fetchPointsAdjustments()
      ]);
      setMatches(matchesData);
      setGuesses(guessesData);
      setGroupQualifiers(groupQualifiersData);
      setBracketGuesses(bracketData);
      setOracle(oracleData);
      setUsers(usersData);
      setGlobalSettings(settingsData);
      setPointsAdjustments(adjustmentsData);
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
            onSelectMatchForStats={setSelectedMatchForStats}
          />
        );
      case 'groups':
        return (
          <Groups
            matches={matches}
            guesses={guesses}
            currentUser={currentUser}
            onReload={loadData}
            onSelectMatchForStats={setSelectedMatchForStats}
          />
        );
      case 'knockout':
        return (
          <Knockout
            matches={matches}
            guesses={guesses}
            currentUser={currentUser}
            onReload={loadData}
            onSelectMatchForStats={setSelectedMatchForStats}
            isKnockoutDisabled={!globalSettings.knockoutEnabled && !isAdmin}
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
            isKnockoutDisabled={!globalSettings.knockoutEnabled && !isAdmin}
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
            pointsAdjustments={pointsAdjustments}
            onSelectMatchForStats={setSelectedMatchForStats}
          />
        );
      case 'admin':
        if (!isAdmin) {
          setActiveTab('daily');
          return null;
        }
        return (
          <Admin
            matches={matches}
            groupQualifiers={groupQualifiers}
            bracketGuesses={bracketGuesses}
            oracle={oracle}
            globalSettings={globalSettings}
            onReload={loadData}
          />
        );
      default:
        return <div className="text-center p-8 text-slate-400">Página não encontrada.</div>;
    }
  };

  const renderMatchStatsModal = () => {
    if (!selectedMatchForStats) return null;

    const match = selectedMatchForStats;
    const matchGuesses = guesses.filter(g => String(g.matchId) === String(match.id));
    const hasResult = match.homeScore !== null && match.awayScore !== null;
    const isLocked = match.locked || isMatchTimeOver(match.date) || hasResult;

    const homeFlag = TEAM_FLAGS[match.homeTeam] || "🏳️";
    const awayFlag = TEAM_FLAGS[match.awayTeam] || "🏳️";

    const userGuesses = users.map(username => {
      const g = matchGuesses.find(guess => guess.user === username);
      let points = 0;
      let scoreCategory = 'none';

      if (g) {
        if (hasResult) {
          const scoreResult = calculateMatchScore(g.homeScore, g.awayScore, match.homeScore, match.awayScore, match.stage, match.group);
          points = scoreResult.points;
          if (scoreResult.isExact) scoreCategory = 'exact';
          else if (scoreResult.isWinner && scoreResult.isDiff) scoreCategory = 'winner_diff';
          else if (scoreResult.isWinner) scoreCategory = 'winner';
          else scoreCategory = 'none';
        }
      } else {
        scoreCategory = 'no_guess';
      }

      return {
        user: username,
        guess: g,
        points,
        category: scoreCategory
      };
    });

    const totalGuesses = matchGuesses.length;
    const totalParticipants = users.length;

    let exactCount = 0;
    let winnerDiffCount = 0;
    let winnerCount = 0;
    let noneCount = 0;

    userGuesses.forEach(ug => {
      if (ug.category === 'exact') exactCount++;
      else if (ug.category === 'winner_diff') winnerDiffCount++;
      else if (ug.category === 'winner') winnerCount++;
      else if (ug.category === 'none') noneCount++;
    });

    const totalPoints = userGuesses.reduce((sum, ug) => sum + ug.points, 0);
    const avgPoints = totalGuesses > 0 ? (totalPoints / totalGuesses).toFixed(1) : '0.0';

    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;

    matchGuesses.forEach(g => {
      const h = parseInt(g.homeScore, 10);
      const a = parseInt(g.awayScore, 10);
      if (!isNaN(h) && !isNaN(a)) {
        if (h > a) homeWins++;
        else if (h < a) awayWins++;
        else draws++;
      }
    });

    const percentHome = totalGuesses > 0 ? Math.round((homeWins / totalGuesses) * 100) : 0;
    const percentDraw = totalGuesses > 0 ? Math.round((draws / totalGuesses) * 100) : 0;
    const percentAway = totalGuesses > 0 ? Math.round((awayWins / totalGuesses) * 100) : 0;

    const sortedUserGuesses = [...userGuesses].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (a.guess && !b.guess) return -1;
      if (!a.guess && b.guess) return 1;
      return a.user.localeCompare(b.user);
    });

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-2xl glass-panel p-6 rounded-3xl border border-football-glassBorder relative shadow-2xl flex flex-col max-h-[85vh] text-left">
          <button 
            onClick={() => setSelectedMatchForStats(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="border-b border-white/5 pb-4 mb-4 select-none">
            <span className="text-[10px] bg-football-vibrantGreen/10 text-football-vibrantGreen border border-football-vibrantGreen/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider mb-2 inline-block">
              {match.stage === 'group' ? `Grupo ${match.group}` : match.group}
            </span>
            
            <div className="flex items-center justify-between gap-4 mt-2">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-3xl filter drop-shadow select-none">{homeFlag}</span>
                <span className="text-base font-bold text-white truncate">{match.homeTeam}</span>
              </div>

              <div className="flex items-center gap-3 bg-black/20 px-4 py-2 rounded-2xl border border-white/5 font-mono">
                <span className="text-lg font-black text-white">
                  {match.homeScore !== null ? match.homeScore : '-'}
                </span>
                <span className="text-slate-500 text-xs font-bold">x</span>
                <span className="text-lg font-black text-white">
                  {match.awayScore !== null ? match.awayScore : '-'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-1 justify-end">
                <span className="text-base font-bold text-white truncate text-right">{match.awayTeam}</span>
                <span className="text-3xl filter drop-shadow select-none">{awayFlag}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-center mt-2 flex justify-center items-center gap-1.5">
              <span>📅 {new Date(match.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              <span>•</span>
              <span className={`font-semibold ${hasResult ? 'text-football-vibrantGreen' : isLocked ? 'text-rose-400' : 'text-football-brightYellow'}`}>
                {hasResult ? 'Finalizado' : isLocked ? 'Em Andamento / Fechado' : 'Aberto para Palpites'}
              </span>
            </div>
          </div>

          <div className="overflow-y-auto pr-1 flex-1 space-y-5 py-1 no-scrollbar">
            {isLocked ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    📊 Tendência de Palpites ({totalGuesses} palpites)
                  </h4>
                  
                  {totalGuesses > 0 ? (
                    <div className="space-y-3">
                      <div className="w-full h-3 rounded-full bg-slate-800 flex overflow-hidden">
                        <div style={{ width: `${percentHome}%` }} className="bg-football-royalBlue" title="Vitória Home"></div>
                        <div style={{ width: `${percentDraw}%` }} className="bg-slate-500" title="Empate"></div>
                        <div style={{ width: `${percentAway}%` }} className="bg-football-gold" title="Vitória Away"></div>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-football-royalBlue"></span>
                          <span className="text-slate-300">{match.homeTeam}: {percentHome}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                          <span className="text-slate-300">Empate: {percentDraw}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-football-gold"></span>
                          <span className="text-slate-300">{match.awayTeam}: {percentAway}%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Nenhum palpite computado.</p>
                  )}
                </div>

                {hasResult ? (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      📈 Desempenho Geral
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 bg-black/20 rounded-xl border border-white/5">
                        <span className="block text-slate-400 text-[10px] uppercase font-bold">Média de Pontos</span>
                        <span className="text-lg font-black text-white">{avgPoints} pts</span>
                      </div>
                      <div className="p-2 bg-black/20 rounded-xl border border-white/5">
                        <span className="block text-slate-400 text-[10px] uppercase font-bold">Placar Exato 🎯</span>
                        <span className="text-lg font-black text-football-gold">{exactCount}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-center items-center text-center">
                    <span className="text-2xl mb-1">⏳</span>
                    <h5 className="text-xs font-bold text-slate-300">Aguardando Resultado</h5>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                      As médias de pontos e placares corretos serão exibidas assim que o resultado oficial for inserido.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-football-gold/10 border border-football-gold/20 text-football-brightYellow text-center select-none">
                <span className="text-2xl mb-1 block">🔒 Palpites Ocultos</span>
                <p className="text-xs font-semibold">
                  Os palpites dos outros participantes ficarão ocultos até o início do jogo para manter a competição justa!
                </p>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  ({totalGuesses} de {totalParticipants} participantes já enviaram seus palpites)
                </p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 select-none">
                👥 Palpites por Participante
              </h4>
              
              <div className="space-y-2">
                {sortedUserGuesses.map(ug => {
                  const isSelf = ug.user === currentUser;
                  const canSeeGuess = isLocked || isSelf;

                  let badgeStyle = 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
                  let badgeText = 'Sem palpite';

                  if (ug.guess) {
                    if (!canSeeGuess) {
                      badgeStyle = 'bg-slate-800 text-slate-400 border border-white/5';
                      badgeText = '🔒 Enviado';
                    } else {
                      badgeText = `${ug.guess.homeScore} x ${ug.guess.awayScore}`;
                      if (hasResult) {
                        if (ug.category === 'exact') {
                          badgeStyle = 'bg-football-gold/20 text-football-gold border border-football-gold/30 text-glow-gold';
                        } else if (ug.category === 'winner_diff') {
                          badgeStyle = 'bg-football-royalBlue/20 text-football-lightBlue border border-football-royalBlue/30';
                        } else if (ug.category === 'winner') {
                          badgeStyle = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25';
                        } else {
                          badgeStyle = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                        }
                      } else {
                        badgeStyle = 'bg-white/5 text-white border border-white/10';
                      }
                    }
                  }

                  return (
                    <div 
                      key={ug.user} 
                      className={`px-4 py-3 rounded-xl border flex justify-between items-center transition-colors ${
                        isSelf 
                          ? 'bg-football-gold/5 border-football-gold/30 font-bold' 
                          : 'bg-white/5 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">
                          {ug.user} {isSelf && <span className="text-[10px] text-football-gold font-normal">(Você)</span>}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {hasResult && canSeeGuess && ug.guess && (
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            {ug.points > 0 ? `+${ug.points} pts ${ug.category === 'exact' ? '🎯' : ug.category === 'winner_diff' ? '⚖️' : '👍'}` : '0 pts ❌'}
                          </span>
                        )}
                        <span className={`text-xs font-black px-3 py-1 rounded-lg ${badgeStyle} font-mono`}>
                          {badgeText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 mt-4 flex justify-end">
            <button 
              onClick={() => setSelectedMatchForStats(null)}
              className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
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
        isAdmin={isAdmin}
        knockoutEnabled={globalSettings.knockoutEnabled}
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

      {/* Modal de Estatísticas Globais do Jogo */}
      {renderMatchStatsModal()}
    </div>
  );
}

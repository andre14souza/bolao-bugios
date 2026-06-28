import React, { useState, useEffect } from 'react';
import { updateMatch, saveGroupQualifierResults, saveBracketResults, saveOracleResults, fetchUsersList, updateUser, deleteUser, toggleMatchLock, saveSettings, fetchPointsAdjustments, savePointsAdjustment, parseOracleResult } from '../services/api';
import { Save, RefreshCw, Check, AlertCircle, Calendar, Layers, Trophy, HelpCircle, Users, Trash2, Eye, EyeOff, Lock, Unlock, ArrowRight, Award, X, Zap } from 'lucide-react';
import { TEAM_FLAGS } from './DailyMatches';
import { checkIsPlaceholder } from './Knockout';

const QUESTIONS = [
  { key: 'champion', label: '🏆 Quem será o Grande Campeão?', desc: 'Preveja a seleção que vai levantar a taça da Copa.', placeholder: 'Ex: Brasil' },
  { key: 'topScorer', label: '👟 Quem será o Artilheiro da Copa (Chuteira de Ouro)?', desc: 'Nome do jogador que marcará mais gols.', placeholder: 'Ex: Vinicius Jr' },
  { key: 'bestAttack', label: '💥 Qual seleção terá o Melhor Ataque na fase de grupos?', desc: 'A equipe que marcará mais gols nos 3 primeiros jogos de grupo.', placeholder: 'Ex: França' },
  { key: 'zebra', label: '🦓 Quem será a grande \'Zebra\' da Copa?', desc: 'A seleção menor que chegará mais longe ou surpreenderá gigantes.', placeholder: 'Ex: Marrocos' },
  { key: 'firstRedCard', label: '🟥 Qual jogador vai tomar o primeiro cartão vermelho?', desc: 'O primeiro jogador a ser expulso na Copa (IA Pick).', placeholder: 'Ex: Casemiro' },
  { key: 'deception', label: '📉 Qual seleção vai ser a maior decepção (sair cedo)?', desc: 'O país favorito que cairá ainda na primeira fase ou oitavas (IA Pick).', placeholder: 'Ex: Alemanha' },
  { key: 'mostGoalsMatch', label: '⚽ Qual jogo da primeira fase terá mais gols?', desc: 'Diga o confronto. Exemplo: Brasil x Croácia (IA Pick).', placeholder: 'Ex: Brasil x Croácia' }
];

export default function Admin({ matches, groupQualifiers, bracketGuesses, oracle, globalSettings, onReload }) {
  const [isKnockoutReleased, setIsKnockoutReleased] = useState(globalSettings?.knockoutEnabled || false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  useEffect(() => {
    if (globalSettings) {
      setIsKnockoutReleased(globalSettings.knockoutEnabled);
    }
  }, [globalSettings]);

  const handleToggleKnockoutRelease = async () => {
    setIsUpdatingSettings(true);
    try {
      const nextState = !isKnockoutReleased;
      const res = await saveSettings(nextState);
      if (res.success) {
        setIsKnockoutReleased(nextState);
        onReload();
      }
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      alert("Erro ao alterar liberação do mata-mata.");
    } finally {
      setIsUpdatingSettings(false);
    }
  };
  const [subTab, setSubTab] = useState('matches'); // matches, groups, bracket, oracle, users

  const formatAdminDate = (dateString) => {
    if (!dateString) return '';
    let cleanDate = dateString;
    const tIndex = dateString.indexOf('T');
    if (tIndex !== -1) {
      cleanDate = dateString.substring(0, tIndex + 9);
    }
    const formattedString = cleanDate.includes('T') ? `${cleanDate}-03:00` : `${cleanDate}T00:00:00-03:00`;
    const date = new Date(formattedString);
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo'
    });
  };
  
  // Status de carregamento e sucesso locais
  const [loadingId, setLoadingId] = useState(null);
  const [successId, setSuccessId] = useState(null);
  const [errorId, setErrorId] = useState(null);

  // Estados para gerenciamento de usuários (Admin)
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editFields, setEditFields] = useState({}); // { [username]: { username, password } }
  const [visiblePasswords, setVisiblePasswords] = useState({}); // { [username]: boolean }

  // Estados para gerenciamento de ajustes de pontos (Admin)
  const [adjustmentsList, setAdjustmentsList] = useState([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);
  const [adjFields, setAdjFields] = useState({}); // { [username]: { points, description } }

  const loadUsersList = async () => {
    setLoadingUsers(true);
    try {
      const data = await fetchUsersList();
      setUsersList(data);
      const fields = {};
      data.forEach(u => {
        fields[u.username] = { username: u.username, password: u.password };
      });
      setEditFields(fields);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAdjustmentsList = async () => {
    setLoadingAdjustments(true);
    try {
      const data = await fetchPointsAdjustments();
      setAdjustmentsList(data);
      setAdjFields(prev => {
        const updated = { ...prev };
        data.forEach(a => {
          updated[a.user] = { points: String(a.points), description: a.description || '' };
        });
        return updated;
      });
    } catch (err) {
      console.error("Erro ao carregar ajustes:", err);
    } finally {
      setLoadingAdjustments(false);
    }
  };

  useEffect(() => {
    if (subTab === 'users' || subTab === 'oracle') {
      loadUsersList();
    } else if (subTab === 'adjustments') {
      loadUsersList();
      loadAdjustmentsList();
    }
  }, [subTab]);

  const handleAdjChange = (username, field, val) => {
    setAdjFields(prev => ({
      ...prev,
      [username]: {
        ...prev[username],
        [field]: val
      }
    }));
  };

  const handleSaveAdjustment = async (username) => {
    setLoadingId(`adj-${username}`);
    setSuccessId(null);
    setErrorId(null);
    const { points, description } = adjFields[username] || { points: '', description: '' };
    const pts = parseInt(points, 10) || 0;

    try {
      await savePointsAdjustment(username, pts, description);
      setSuccessId(`adj-${username}`);
      onReload(); // Recarrega os dados globais no App.jsx
      loadAdjustmentsList();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId(`adj-${username}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleUserChange = (originalUsername, field, val) => {
    setEditFields(prev => ({
      ...prev,
      [originalUsername]: {
        ...prev[originalUsername],
        [field]: val
      }
    }));
  };

  const handleSaveUser = async (originalUsername) => {
    setLoadingId(`user-${originalUsername}`);
    setSuccessId(null);
    setErrorId(null);
    const { username: newUsername, password: newPassword } = editFields[originalUsername];

    if (!newUsername.trim() || !newPassword.trim()) {
      setErrorId(`user-${originalUsername}`);
      setLoadingId(null);
      return;
    }

    try {
      await updateUser(originalUsername, newUsername, newPassword);
      setSuccessId(`user-${originalUsername}`);
      onReload(); // Recarrega os dados do app geral
      loadUsersList(); // Recarrega a lista local de usuários
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId(`user-${originalUsername}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleResetUserPassword = async (username) => {
    setLoadingId(`reset-${username}`);
    setSuccessId(null);
    setErrorId(null);
    try {
      await updateUser(username, username, "123");
      setSuccessId(`reset-${username}`);
      loadUsersList();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId(`reset-${username}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente a conta de ${username} e todos os seus palpites?`)) {
      return;
    }
    setLoadingId(`delete-${username}`);
    try {
      await deleteUser(username);
      onReload();
      loadUsersList();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir usuário.");
    } finally {
      setLoadingId(null);
    }
  };

  const togglePasswordVisibility = (username) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  // Estados locais para inputs
  const [matchScores, setMatchScores] = useState({});
  const [groupResults, setGroupResults] = useState({});
  const [groupTeams, setGroupTeams] = useState({});
  const [allTeams, setAllTeams] = useState([]);
  const [bracketResults, setBracketResults] = useState({
    oitavas: Array(16).fill(''),
    quartas: Array(8).fill(''),
    semis: Array(4).fill(''),
    finalists: Array(2).fill(''),
    champion: '',
    thirdPlace: ''
  });
  const [oracleResults, setOracleResults] = useState({
    champion: { text: '', correct: [] },
    topScorer: { text: '', correct: [] },
    bestAttack: { text: '', correct: [] },
    zebra: { text: '', correct: [] },
    firstRedCard: { text: '', correct: [] },
    deception: { text: '', correct: [] },
    mostGoalsMatch: { text: '', correct: [] }
  });

  useEffect(() => {
    // 1. Partidas
    const mScores = {};
    matches.forEach(m => {
      mScores[m.id] = {
        homeScore: m.homeScore ?? '',
        awayScore: m.awayScore ?? '',
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam
      };
    });
    setMatchScores(mScores);

    // 2. Extração de times por grupo e geral
    const teamsByGroup = {};
    const tSet = new Set();
    matches.forEach(m => {
      if (m.stage === 'group') {
        if (!teamsByGroup[m.group]) {
          teamsByGroup[m.group] = new Set();
        }
        teamsByGroup[m.group].add(m.homeTeam);
        teamsByGroup[m.group].add(m.awayTeam);
      }
      if (m.homeTeam && !checkIsPlaceholder(m.homeTeam)) {
        tSet.add(m.homeTeam);
      }
      if (m.awayTeam && !checkIsPlaceholder(m.awayTeam)) {
        tSet.add(m.awayTeam);
      }
    });

    const parsedGroupTeams = {};
    Object.keys(teamsByGroup).forEach(g => {
      parsedGroupTeams[g] = Array.from(teamsByGroup[g]).sort();
    });
    setGroupTeams(parsedGroupTeams);
    setAllTeams(Array.from(tSet).sort());

    // 3. Resultados dos Grupos
    const gResults = {};
    Object.keys(parsedGroupTeams).forEach(g => {
      const act = groupQualifiers.results[g] || { first: '', second: '', third: '' };
      gResults[g] = {
        first: act.first || '',
        second: act.second || '',
        third: act.third || ''
      };
    });
    setGroupResults(gResults);

    // 4. Resultados do Mata-mata
    const bAct = bracketGuesses.results || { oitavas: [], quartas: [], semis: [], finalists: [], champion: null, thirdPlace: null };
    setBracketResults({
      oitavas: bAct.oitavas || Array(16).fill(''),
      quartas: bAct.quartas || Array(8).fill(''),
      semis: bAct.semis || Array(4).fill(''),
      finalists: bAct.finalists || Array(2).fill(''),
      champion: bAct.champion || '',
      thirdPlace: bAct.thirdPlace || ''
    });

    // 5. Resultados do Oráculo
    const oAct = oracle.results || {};
    setOracleResults({
      champion: parseOracleResult(oAct.champion),
      topScorer: parseOracleResult(oAct.topScorer),
      bestAttack: parseOracleResult(oAct.bestAttack),
      zebra: parseOracleResult(oAct.zebra),
      firstRedCard: parseOracleResult(oAct.firstRedCard),
      deception: parseOracleResult(oAct.deception),
      mostGoalsMatch: parseOracleResult(oAct.mostGoalsMatch)
    });
  }, [matches, groupQualifiers, bracketGuesses, oracle]);

  const winnersOrder = ['Grupo E', 'Grupo I', 'Grupo A', 'Grupo L', 'Grupo G', 'Grupo D', 'Grupo B', 'Grupo K'];

  const pairThirds = (thirds) => {
    const paired = Array(8).fill(null);
    const used = Array(8).fill(false);

    const backtrack = (idx) => {
      if (idx === 8) return true;
      const currentWinnerGroup = winnersOrder[idx];
      for (let i = 0; i < thirds.length; i++) {
        if (!used[i]) {
          const t = thirds[i];
          if (t.groupName !== currentWinnerGroup) {
            paired[idx] = t.teamName;
            used[i] = true;
            if (backtrack(idx + 1)) return true;
            used[i] = false;
            paired[idx] = null;
          }
        }
      }
      return false;
    };

    if (backtrack(0)) return paired;
    return thirds.map(t => t.teamName);
  };

  const AdminMatchCard = ({ matchId, teamA, teamB, winner, onSelect, stageName }) => {
    const isA_Placeholder = checkIsPlaceholder(teamA);
    const isB_Placeholder = checkIsPlaceholder(teamB);

    return (
      <div className="glass-panel p-2.5 rounded-2xl border border-football-glassBorder hover:border-football-vibrantGreen/30 transition-all duration-300 w-[170px] md:w-[190px] relative flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 border-b border-white/5 pb-1 select-none">
          <span className="uppercase tracking-wider">{stageName}</span>
          <span>Jogo {matchId}</span>
        </div>

        <div className="flex flex-col gap-1">
          {/* Time A */}
          <button
            disabled={isA_Placeholder}
            onClick={() => onSelect(teamA)}
            className={`flex items-center justify-between p-1.5 rounded-xl text-[10px] w-full text-left transition-all ${
              winner === teamA && teamA
                ? 'bg-football-vibrantGreen/20 border border-football-vibrantGreen/50 text-white font-extrabold shadow shadow-emerald-500/25 scale-[1.02]'
                : winner && teamA
                ? 'opacity-45 text-slate-400 hover:opacity-75 cursor-pointer border border-transparent'
                : isA_Placeholder
                ? 'opacity-35 text-slate-500 italic cursor-not-allowed border border-transparent'
                : 'hover:bg-white/5 text-slate-350 cursor-pointer border border-transparent'
            }`}
          >
            <span className="truncate flex items-center gap-1.5">
              <span className="text-sm filter drop-shadow select-none">{TEAM_FLAGS[teamA] || '🏳️'}</span>
              <span className="truncate">{teamA || 'A definir'}</span>
            </span>
            {winner === teamA && teamA && <span className="text-football-vibrantGreen font-black text-[10px]">✓</span>}
          </button>

          {/* Time B */}
          <button
            disabled={isB_Placeholder}
            onClick={() => onSelect(teamB)}
            className={`flex items-center justify-between p-1.5 rounded-xl text-[10px] w-full text-left transition-all ${
              winner === teamB && teamB
                ? 'bg-football-vibrantGreen/20 border border-football-vibrantGreen/50 text-white font-extrabold shadow shadow-emerald-500/25 scale-[1.02]'
                : winner && teamB
                ? 'opacity-45 text-slate-400 hover:opacity-75 cursor-pointer border border-transparent'
                : isB_Placeholder
                ? 'opacity-35 text-slate-500 italic cursor-not-allowed border border-transparent'
                : 'hover:bg-white/5 text-slate-350 cursor-pointer border border-transparent'
            }`}
          >
            <span className="truncate flex items-center gap-1.5">
              <span className="text-sm filter drop-shadow select-none">{TEAM_FLAGS[teamB] || '🏳️'}</span>
              <span className="truncate">{teamB || 'A definir'}</span>
            </span>
            {winner === teamB && teamB && <span className="text-football-vibrantGreen font-black text-[10px]">✓</span>}
          </button>
        </div>
      </div>
    );
  };

  // Ações de Partida
  const handleScoreChange = (matchId, team, value) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setMatchScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [team]: value }
    }));
  };

  const handleTeamChange = (matchId, teamField, value) => {
    setMatchScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [teamField]: value }
    }));
  };

  const handleSaveMatch = async (matchId) => {
    setLoadingId(matchId);
    setSuccessId(null);
    setErrorId(null);
    try {
      const { homeScore, awayScore, homeTeam, awayTeam } = matchScores[matchId];
      await updateMatch({
        id: matchId,
        homeScore: homeScore === '' ? null : parseInt(homeScore, 10),
        awayScore: awayScore === '' ? null : parseInt(awayScore, 10),
        homeTeam,
        awayTeam
      });
      setSuccessId(matchId);
      onReload();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId(matchId);
    } finally {
      setLoadingId(null);
    }
  };

  const handleClearMatch = async (matchId) => {
    setLoadingId(matchId);
    try {
      setMatchScores(prev => ({
        ...prev,
        [matchId]: { ...prev[matchId], homeScore: '', awayScore: '' }
      }));
      await updateMatch({
        id: matchId,
        homeScore: null,
        awayScore: null
      });
      setSuccessId(matchId);
      onReload();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId(matchId);
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleLock = async (matchId, currentlyLocked) => {
    const action = currentlyLocked ? 'desbloquear' : 'bloquear';
    if (!window.confirm(`Tem certeza que deseja ${action} os palpites desta partida?`)) return;
    setLoadingId(`lock-${matchId}`);
    try {
      await toggleMatchLock(matchId, !currentlyLocked);
      onReload();
    } catch (err) {
      console.error(err);
      alert('Erro ao alterar o bloqueio da partida.');
    } finally {
      setLoadingId(null);
    }
  };

  // Ações de Grupos
  const handleGroupSelect = (group, spot, value) => {
    setGroupResults(prev => ({
      ...prev,
      [group]: { ...prev[group], [spot]: value }
    }));
  };

  const handleSaveGroup = async (group) => {
    setLoadingId(`group-${group}`);
    setSuccessId(null);
    setErrorId(null);
    try {
      const { first, second, third } = groupResults[group];
      await saveGroupQualifierResults(
        group,
        first === '' ? null : first,
        second === '' ? null : second,
        third === '' ? null : third
      );
      setSuccessId(`group-${group}`);
      onReload();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId(`group-${group}`);
    } finally {
      setLoadingId(null);
    }
  };

  // Ações de Chaveamento
  const removeTeamFromFutureStages = (updated, oldTeam) => {
    if (!oldTeam) return;
    updated.oitavas = updated.oitavas.map(t => t === oldTeam ? '' : t);
    updated.quartas = updated.quartas.map(t => t === oldTeam ? '' : t);
    updated.semis = updated.semis.map(t => t === oldTeam ? '' : t);
    updated.finalists = updated.finalists.map(t => t === oldTeam ? '' : t);
    if (updated.champion === oldTeam) updated.champion = '';
    if (updated.thirdPlace === oldTeam) updated.thirdPlace = '';
  };

  const handleBracketSelect = (stage, index, selectedTeam) => {
    if (checkIsPlaceholder(selectedTeam)) return;

    setBracketResults(prev => {
      const updated = { ...prev };
      
      if (stage === 'r32') {
        const oldTeam = prev.oitavas[index];
        updated.oitavas = [...prev.oitavas];
        updated.oitavas[index] = selectedTeam;
        if (oldTeam && oldTeam !== selectedTeam) {
          removeTeamFromFutureStages(updated, oldTeam);
        }
      } else if (stage === 'oitavas') {
        const oldTeam = prev.quartas[index];
        updated.quartas = [...prev.quartas];
        updated.quartas[index] = selectedTeam;
        if (oldTeam && oldTeam !== selectedTeam) {
          removeTeamFromFutureStages(updated, oldTeam);
        }
      } else if (stage === 'quartas') {
        const oldTeam = prev.semis[index];
        updated.semis = [...prev.semis];
        updated.semis[index] = selectedTeam;
        if (oldTeam && oldTeam !== selectedTeam) {
          removeTeamFromFutureStages(updated, oldTeam);
        }
      } else if (stage === 'semis') {
        const oldTeam = prev.finalists[index];
        updated.finalists = [...prev.finalists];
        updated.finalists[index] = selectedTeam;
        if (oldTeam && oldTeam !== selectedTeam) {
          removeTeamFromFutureStages(updated, oldTeam);
        }
      } else if (stage === 'final') {
        const oldTeam = prev.champion;
        updated.champion = selectedTeam;
        if (oldTeam && oldTeam !== selectedTeam) {
          removeTeamFromFutureStages(updated, oldTeam);
        }
      } else if (stage === 'thirdPlace') {
        updated.thirdPlace = selectedTeam;
      }

      return updated;
    });
  };

  const handleSaveBracket = async () => {
    setLoadingId('bracket');
    setSuccessId(null);
    setErrorId(null);
    try {
      await saveBracketResults(
        bracketResults.oitavas,
        bracketResults.quartas,
        bracketResults.semis,
        bracketResults.finalists,
        bracketResults.champion,
        bracketResults.thirdPlace
      );
      setSuccessId('bracket');
      onReload();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId('bracket');
    } finally {
      setLoadingId(null);
    }
  };

  // Ações de Oráculo
  const handleOracleTextChange = (key, textVal) => {
    setOracleResults(prev => {
      const current = prev[key] || { text: '', correct: [] };
      return {
        ...prev,
        [key]: {
          ...current,
          text: textVal
        }
      };
    });
  };

  const handleOracleToggleCorrect = (key, username) => {
    setOracleResults(prev => {
      const current = prev[key] || { text: '', correct: [] };
      const alreadyCorrect = current.correct.map(u => u.toLowerCase()).includes(username.toLowerCase());
      let newCorrect;
      if (alreadyCorrect) {
        newCorrect = current.correct.filter(u => u.toLowerCase() !== username.toLowerCase());
      } else {
        newCorrect = [...current.correct, username];
      }
      return {
        ...prev,
        [key]: {
          ...current,
          correct: newCorrect
        }
      };
    });
  };

  const handleOracleAutoGrade = (key) => {
    const current = oracleResults[key] || { text: '', correct: [] };
    const officialText = current.text.trim().toLowerCase();
    if (!officialText) return;
    
    // Encontra todos os usuários cujos palpites correspondem ao gabarito
    const correctUsers = [];
    (oracle.guesses || []).forEach(g => {
      const userGuess = g[key] ? String(g[key]).trim().toLowerCase() : '';
      if (userGuess && userGuess === officialText) {
        correctUsers.push(g.user);
      }
    });

    setOracleResults(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        correct: correctUsers
      }
    }));
  };

  const handleSaveOracle = async (key = 'oracle') => {
    setLoadingId(`oracle-${key}`);
    setSuccessId(null);
    setErrorId(null);
    try {
      await saveOracleResults(oracleResults);
      setSuccessId(`oracle-${key}`);
      onReload();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId(`oracle-${key}`);
    } finally {
      setLoadingId(null);
    }
  };

  const groups = Object.keys(groupTeams).sort();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative bg-field-pattern">
      <div className="mb-8 border-b border-white/5 pb-4 select-none">
        <h1 className="text-3xl md:text-4xl font-extrabold text-football-gold flex items-center gap-2 animate-fadeIn">
          ⚙️ Painel do Administrador
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          Espaço para inserção dos dados reais oficiais. Ao salvar qualquer item, os pontos e o ranking geral serão atualizados automaticamente!
        </p>
      </div>

      {/* Configurações Globais / Liberações */}
      <div className="mb-6 p-5 glass-panel rounded-3xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${isKnockoutReleased ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            <Trophy size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Liberação do Mata-mata</h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-md">
              Controla se os palpites de "Jogos Mata-mata" e "Chaveamento" estão abertos e visíveis para os participantes.
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleKnockoutRelease}
          disabled={isUpdatingSettings}
          className={`flex items-center justify-center gap-2 font-bold px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-95 border ${
            isKnockoutReleased
              ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border-rose-500/30'
          }`}
        >
          {isUpdatingSettings ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : isKnockoutReleased ? (
            <Unlock size={14} />
          ) : (
            <Lock size={14} />
          )}
          <span>{isKnockoutReleased ? 'Palpites Liberados' : 'Palpites Bloqueados'}</span>
        </button>
      </div>

      {/* Menu de Sub-abas */}
      <div className="flex gap-2 border-b border-white/5 pb-4 mb-8 overflow-x-auto no-scrollbar select-none">
        <button
          onClick={() => setSubTab('matches')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer ${
            subTab === 'matches' ? 'bg-football-gold text-football-darkGreen font-extrabold scale-105 shadow-md shadow-amber-500/10' : 'glass-panel text-slate-300 hover:text-white border-football-glassBorder'
          }`}
        >
          <Calendar size={14} />
          <span>Partidas</span>
        </button>
        <button
          onClick={() => setSubTab('groups')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer ${
            subTab === 'groups' ? 'bg-football-gold text-football-darkGreen font-extrabold scale-105 shadow-md shadow-amber-500/10' : 'glass-panel text-slate-300 hover:text-white border-football-glassBorder'
          }`}
        >
          <Layers size={14} />
          <span>Grupos (Fases)</span>
        </button>
        <button
          onClick={() => setSubTab('bracket')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer ${
            subTab === 'bracket' ? 'bg-football-gold text-football-darkGreen font-extrabold scale-105 shadow-md shadow-amber-500/10' : 'glass-panel text-slate-300 hover:text-white border-football-glassBorder'
          }`}
        >
          <Trophy size={14} />
          <span>Mata-mata (Chaves)</span>
        </button>
        <button
          onClick={() => setSubTab('oracle')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer ${
            subTab === 'oracle' ? 'bg-football-gold text-football-darkGreen font-extrabold scale-105 shadow-md shadow-amber-500/10' : 'glass-panel text-slate-300 hover:text-white border-football-glassBorder'
          }`}
        >
          <HelpCircle size={14} />
          <span>Oráculo (Bônus)</span>
        </button>
        <button
          onClick={() => setSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer ${
            subTab === 'users' ? 'bg-football-gold text-football-darkGreen font-extrabold scale-105 shadow-md shadow-amber-500/10' : 'glass-panel text-slate-300 hover:text-white border-football-glassBorder'
          }`}
        >
          <Users size={14} />
          <span>Contas</span>
        </button>
        <button
          onClick={() => setSubTab('adjustments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer ${
            subTab === 'adjustments' ? 'bg-football-gold text-football-darkGreen font-extrabold scale-105 shadow-md shadow-amber-500/10' : 'glass-panel text-slate-300 hover:text-white border-football-glassBorder'
          }`}
        >
          <Award size={14} />
          <span>Ajustar Pontos</span>
        </button>
      </div>

      {/* ==========================================
          SUBTAB: MATCHES
         ========================================== */}
      {subTab === 'matches' && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          {matches.map((match) => {
            const score = matchScores[match.id] || { homeScore: '', awayScore: '', homeTeam: match.homeTeam, awayTeam: match.awayTeam };
            const isLoading = loadingId === match.id;
            const isSuccess = successId === match.id;
            const isError = errorId === match.id;
            const isKnockout = match.stage === 'knockout';
            const isLocked = !!match.locked;
            const isLockLoading = loadingId === `lock-${match.id}`;

            return (
              <div key={match.id} className={`glass-panel p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-football-gold/20 transition-all ${
                isLocked ? 'border-rose-500/30 bg-rose-950/10' : 'border-football-glassBorder'
              }`}>
                <div className="flex flex-col gap-1 md:w-1/4 select-none">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-football-grassGreen/30 text-football-vibrantGreen">
                      Partida #{match.id}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {match.group}
                    </span>
                    {isLocked && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <Lock size={10} /> Bloqueada
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 mt-1">
                    📅 {formatAdminDate(match.date)}
                  </span>
                </div>

                <div className="flex-1 flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center flex-1 text-center">
                    <span className="text-3xl mb-1 filter drop-shadow">
                      {TEAM_FLAGS[score.homeTeam] || "🏳️"}
                    </span>
                    {isKnockout ? (
                      <input
                        type="text"
                        value={score.homeTeam}
                        onChange={(e) => handleTeamChange(match.id, 'homeTeam', e.target.value)}
                        className="w-full text-center text-xs font-semibold py-1 rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-football-gold"
                      />
                    ) : (
                      <span className="font-bold text-sm text-white select-none">{match.homeTeam}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength="2"
                      value={score.homeScore}
                      onChange={(e) => handleScoreChange(match.id, 'homeScore', e.target.value)}
                      className="w-12 h-12 rounded-xl text-center text-xl font-extrabold bg-football-gold/10 border border-football-gold/30 text-football-gold focus:outline-none focus:border-football-gold focus:scale-105"
                      placeholder="-"
                    />
                    <span className="text-slate-400 font-bold select-none">x</span>
                    <input
                      type="text"
                      maxLength="2"
                      value={score.awayScore}
                      onChange={(e) => handleScoreChange(match.id, 'awayScore', e.target.value)}
                      className="w-12 h-12 rounded-xl text-center text-xl font-extrabold bg-football-gold/10 border border-football-gold/30 text-football-gold focus:outline-none focus:border-football-gold focus:scale-105"
                      placeholder="-"
                    />
                  </div>

                  <div className="flex flex-col items-center flex-1 text-center">
                    <span className="text-3xl mb-1 filter drop-shadow">
                      {TEAM_FLAGS[score.awayTeam] || "🏳️"}
                    </span>
                    {isKnockout ? (
                      <input
                        type="text"
                        value={score.awayTeam}
                        onChange={(e) => handleTeamChange(match.id, 'awayTeam', e.target.value)}
                        className="w-full text-center text-xs font-semibold py-1 rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-football-gold"
                      />
                    ) : (
                      <span className="font-bold text-sm text-white select-none">{match.awayTeam}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col justify-end gap-2 md:w-1/5">
                  <button
                    onClick={() => handleToggleLock(match.id, isLocked)}
                    disabled={isLockLoading}
                    title={isLocked ? 'Desbloquear Palpites' : 'Bloquear Palpites (Partida Começou!)'}
                    className={`flex items-center justify-center gap-1.5 font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-all uppercase w-full cursor-pointer ${
                      isLocked
                        ? 'bg-rose-600/80 text-white hover:bg-rose-500 border border-rose-500/30'
                        : 'bg-emerald-700/70 text-white hover:bg-emerald-600 border border-emerald-500/30'
                    }`}
                  >
                    {isLockLoading ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : isLocked ? (
                      <><Unlock size={14} /><span>Desbloquear</span></>
                    ) : (
                      <><Lock size={14} /><span>Iniciar Partida</span></>
                    )}
                  </button>
                  <button
                    onClick={() => handleSaveMatch(match.id)}
                    disabled={isLoading}
                    className={`flex items-center justify-center gap-1.5 font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-all uppercase w-full cursor-pointer ${
                      isSuccess
                        ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20'
                        : isError
                        ? 'bg-rose-600 text-white'
                        : 'bg-football-gold text-football-darkGreen hover:bg-amber-400 active:scale-95 shadow shadow-amber-500/10'
                    }`}
                  >
                    {isLoading ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : isSuccess ? (
                      <Check size={14} />
                    ) : isError ? (
                      <AlertCircle size={14} />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>{isSuccess ? 'Salvo!' : 'Salvar'}</span>
                  </button>
                  {(match.homeScore !== null || match.awayScore !== null) && (
                    <button
                      onClick={() => handleClearMatch(match.id)}
                      disabled={isLoading}
                      className="text-xs py-2.5 px-3 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors w-full uppercase font-bold cursor-pointer"
                    >
                      Anular
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==========================================
          SUBTAB: GROUPS
         ========================================== */}
      {subTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          {groups.map(groupName => {
            const res = groupResults[groupName] || { first: '', second: '', third: '' };
            const isLoading = loadingId === `group-${groupName}`;
            const isSuccess = successId === `group-${groupName}`;
            const isError = errorId === `group-${groupName}`;

            return (
              <div key={groupName} className="glass-panel p-5 rounded-2xl border border-football-glassBorder flex flex-col gap-4">
                <h3 className="text-lg font-bold text-football-brightYellow border-b border-white/5 pb-2 select-none">
                  {groupName}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-bold select-none">🥇 1º Colocado Oficial</label>
                    <select
                      value={res.first}
                      onChange={(e) => handleGroupSelect(groupName, 'first', e.target.value)}
                      className="p-2.5 rounded-xl glass-input text-xs font-semibold w-full focus:border-football-gold"
                    >
                      <option value="">Selecione...</option>
                      {groupTeams[groupName]?.map(t => (
                        <option key={t} value={t}>{TEAM_FLAGS[t]} {t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-bold select-none">🥈 2º Colocado Oficial</label>
                    <select
                      value={res.second}
                      onChange={(e) => handleGroupSelect(groupName, 'second', e.target.value)}
                      className="p-2.5 rounded-xl glass-input text-xs font-semibold w-full focus:border-football-gold"
                    >
                      <option value="">Selecione...</option>
                      {groupTeams[groupName]?.map(t => (
                        <option key={t} value={t}>{TEAM_FLAGS[t]} {t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-bold select-none">🥉 3º Colocado Oficial</label>
                    <select
                      value={res.third || ''}
                      onChange={(e) => handleGroupSelect(groupName, 'third', e.target.value)}
                      className="p-2.5 rounded-xl glass-input text-xs font-semibold w-full focus:border-football-gold"
                    >
                      <option value="">Selecione...</option>
                      {groupTeams[groupName]?.map(t => (
                        <option key={t} value={t}>{TEAM_FLAGS[t]} {t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <button
                  onClick={() => handleSaveGroup(groupName)}
                  disabled={isLoading}
                  className={`flex items-center justify-center gap-1.5 font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-all uppercase w-full cursor-pointer mt-2 ${
                    isSuccess
                      ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20'
                      : isError
                      ? 'bg-rose-600 text-white'
                      : 'bg-football-gold text-football-darkGreen hover:bg-amber-400 active:scale-95 shadow shadow-amber-500/10'
                  }`}
                >
                  {isLoading ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : isSuccess ? (
                    <Check size={12} />
                  ) : isError ? (
                    <AlertCircle size={12} />
                  ) : (
                    <Save size={12} />
                  )}
                  <span>{isSuccess ? 'Salvo!' : 'Salvar Grupo'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ==========================================
          SUBTAB: BRACKET
         ========================================== */}
      {subTab === 'bracket' && (() => {
        const getOfficialTeamByRank = (groupName, rank) => {
          const group = groupResults[groupName];
          if (!group) return `${rank}º do ${groupName}`;
          if (rank === 1) return group.first || `1º do ${groupName}`;
          if (rank === 2) return group.second || `2º do ${groupName}`;
          return group.third || `3º do ${groupName}`;
        };

        const thirds = [];
        Object.entries(groupResults).forEach(([groupName, picks]) => {
          if (picks.third) {
            thirds.push({
              teamName: picks.third,
              groupName: groupName
            });
          }
        });
        
        const padded = [...thirds];
        while (padded.length < 8) {
          padded.push({
            teamName: `3º Oficial #${padded.length + 1}`,
            groupName: `Placeholder ${padded.length + 1}`
          });
        }
        const pairedOfficialThirds = pairThirds(padded);

        // Helper para buscar time do confronto oficial (banco de dados) se não for placeholder
        const getOfficialMatchTeam = (matchId, side, fallback) => {
          const match = matches.find(m => String(m.id) === String(matchId));
          if (match && match.homeTeam && match.awayTeam && !checkIsPlaceholder(match.homeTeam) && !checkIsPlaceholder(match.awayTeam)) {
            return side === 'home' ? match.homeTeam : match.awayTeam;
          }
          return fallback;
        };

        const r32Matches = [
          { id: 73, home: getOfficialMatchTeam(73, 'home', getOfficialTeamByRank('Grupo A', 2)), away: getOfficialMatchTeam(73, 'away', getOfficialTeamByRank('Grupo B', 2)), label: '16-avos' },
          { id: 74, home: getOfficialMatchTeam(74, 'home', getOfficialTeamByRank('Grupo C', 1)), away: getOfficialMatchTeam(74, 'away', getOfficialTeamByRank('Grupo F', 2)), label: '16-avos' },
          { id: 75, home: getOfficialMatchTeam(75, 'home', getOfficialTeamByRank('Grupo E', 1)), away: getOfficialMatchTeam(75, 'away', pairedOfficialThirds[0]), label: '16-avos' },
          { id: 76, home: getOfficialMatchTeam(76, 'home', getOfficialTeamByRank('Grupo F', 1)), away: getOfficialMatchTeam(76, 'away', getOfficialTeamByRank('Grupo C', 2)), label: '16-avos' },
          { id: 77, home: getOfficialMatchTeam(77, 'home', getOfficialTeamByRank('Grupo E', 2)), away: getOfficialMatchTeam(77, 'away', getOfficialTeamByRank('Grupo I', 2)), label: '16-avos' },
          { id: 78, home: getOfficialMatchTeam(78, 'home', getOfficialTeamByRank('Grupo I', 1)), away: getOfficialMatchTeam(78, 'away', pairedOfficialThirds[1]), label: '16-avos' },
          { id: 79, home: getOfficialMatchTeam(79, 'home', getOfficialTeamByRank('Grupo A', 1)), away: getOfficialMatchTeam(79, 'away', pairedOfficialThirds[2]), label: '16-avos' },
          { id: 80, home: getOfficialMatchTeam(80, 'home', getOfficialTeamByRank('Grupo L', 1)), away: getOfficialMatchTeam(80, 'away', pairedOfficialThirds[3]), label: '16-avos' },
          { id: 81, home: getOfficialMatchTeam(81, 'home', getOfficialTeamByRank('Grupo G', 1)), away: getOfficialMatchTeam(81, 'away', pairedOfficialThirds[4]), label: '16-avos' },
          { id: 82, home: getOfficialMatchTeam(82, 'home', getOfficialTeamByRank('Grupo D', 1)), away: getOfficialMatchTeam(82, 'away', pairedOfficialThirds[5]), label: '16-avos' },
          { id: 83, home: getOfficialMatchTeam(83, 'home', getOfficialTeamByRank('Grupo H', 1)), away: getOfficialMatchTeam(83, 'away', getOfficialTeamByRank('Grupo J', 2)), label: '16-avos' },
          { id: 84, home: getOfficialMatchTeam(84, 'home', getOfficialTeamByRank('Grupo K', 2)), away: getOfficialMatchTeam(84, 'away', getOfficialTeamByRank('Grupo L', 2)), label: '16-avos' },
          { id: 85, home: getOfficialMatchTeam(85, 'home', getOfficialTeamByRank('Grupo B', 1)), away: getOfficialMatchTeam(85, 'away', pairedOfficialThirds[6]), label: '16-avos' },
          { id: 86, home: getOfficialMatchTeam(86, 'home', getOfficialTeamByRank('Grupo D', 2)), away: getOfficialMatchTeam(86, 'away', getOfficialTeamByRank('Grupo G', 2)), label: '16-avos' },
          { id: 87, home: getOfficialMatchTeam(87, 'home', getOfficialTeamByRank('Grupo J', 1)), away: getOfficialMatchTeam(87, 'away', getOfficialTeamByRank('Grupo H', 2)), label: '16-avos' },
          { id: 88, home: getOfficialMatchTeam(88, 'home', getOfficialTeamByRank('Grupo K', 1)), away: getOfficialMatchTeam(88, 'away', pairedOfficialThirds[7]), label: '16-avos' }
        ];

        return (
          <div className="glass-panel p-6 rounded-3xl border border-football-glassBorder flex flex-col gap-6 animate-fadeIn max-w-full overflow-hidden text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 select-none">
              <div>
                <h3 className="text-xl font-bold text-football-gold">
                  Chaveamento Oficial da Copa (Resultados Reais)
                </h3>
                <p className="text-xs text-slate-350 mt-1">
                  Defina os vencedores oficiais de cada confronto do mata-mata clicando nas seleções correspondentes.
                </p>
              </div>

              <button
                onClick={handleSaveBracket}
                disabled={loadingId === 'bracket'}
                className="flex items-center justify-center gap-2 bg-football-gold text-football-darkGreen hover:bg-amber-400 active:scale-95 font-bold px-6 py-3 rounded-xl transition-all cursor-pointer text-xs uppercase"
              >
                {loadingId === 'bracket' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : successId === 'bracket' ? (
                  <Check size={14} />
                ) : (
                  <Save size={14} />
                )}
                <span>{successId === 'bracket' ? 'Salvo com sucesso!' : 'Salvar Chaveamento Oficial'}</span>
              </button>
            </div>

            {/* Scroll Banner */}
            <div className="flex items-center gap-2 text-[10px] font-bold text-football-gold uppercase tracking-wider select-none animate-pulse">
              <span>Role para o lado para ver o chaveamento completo (Lado a Lado)</span>
              <ArrowRight size={12} className="animate-bounce-horizontal" />
            </div>

            <div className="w-full overflow-auto max-h-[85vh] border border-zinc-800/40 rounded-3xl bg-zinc-950 p-6 select-none scroll-smooth">
              <div className="flex gap-2 justify-between items-center min-w-[1300px] h-[950px] px-2 relative">
                
                {/* LADO ESQUERDO */}
                <div className="flex gap-6 items-center h-full">
                  {/* 16-avos Esquerda (8 jogos) */}
                  <div className="flex flex-col justify-between h-full py-6">
                    <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center">16-avos</h4>
                    <AdminMatchCard matchId={73} teamA={r32Matches[0].home} teamB={r32Matches[0].away} winner={bracketResults.oitavas[0]} onSelect={(team) => handleBracketSelect('r32', 0, team)} stageName="16-avos" />
                    <AdminMatchCard matchId={75} teamA={r32Matches[2].home} teamB={r32Matches[2].away} winner={bracketResults.oitavas[2]} onSelect={(team) => handleBracketSelect('r32', 2, team)} stageName="16-avos" />
                    <AdminMatchCard matchId={74} teamA={r32Matches[1].home} teamB={r32Matches[1].away} winner={bracketResults.oitavas[1]} onSelect={(team) => handleBracketSelect('r32', 1, team)} stageName="16-avos" />
                    <AdminMatchCard matchId={77} teamA={r32Matches[4].home} teamB={r32Matches[4].away} winner={bracketResults.oitavas[4]} onSelect={(team) => handleBracketSelect('r32', 4, team)} stageName="16-avos" />
                    <AdminMatchCard matchId={76} teamA={r32Matches[3].home} teamB={r32Matches[3].away} winner={bracketResults.oitavas[3]} onSelect={(team) => handleBracketSelect('r32', 3, team)} stageName="16-avos" />
                    <AdminMatchCard matchId={78} teamA={r32Matches[5].home} teamB={r32Matches[5].away} winner={bracketResults.oitavas[5]} onSelect={(team) => handleBracketSelect('r32', 5, team)} stageName="16-avos" />
                    <AdminMatchCard matchId={79} teamA={r32Matches[6].home} teamB={r32Matches[6].away} winner={bracketResults.oitavas[6]} onSelect={(team) => handleBracketSelect('r32', 6, team)} stageName="16-avos" />
                    <AdminMatchCard matchId={80} teamA={r32Matches[7].home} teamB={r32Matches[7].away} winner={bracketResults.oitavas[7]} onSelect={(team) => handleBracketSelect('r32', 7, team)} stageName="16-avos" />
                  </div>

                  {/* Oitavas Esquerda (4 jogos) */}
                  <div className="flex flex-col justify-between h-full py-16">
                    <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center">Oitavas</h4>
                    <AdminMatchCard matchId={89} teamA={bracketResults.oitavas[0]} teamB={bracketResults.oitavas[2]} winner={bracketResults.quartas[0]} onSelect={(team) => handleBracketSelect('oitavas', 0, team)} stageName="Oitavas" />
                    <AdminMatchCard matchId={90} teamA={bracketResults.oitavas[1]} teamB={bracketResults.oitavas[4]} winner={bracketResults.quartas[1]} onSelect={(team) => handleBracketSelect('oitavas', 1, team)} stageName="Oitavas" />
                    <AdminMatchCard matchId={91} teamA={bracketResults.oitavas[3]} teamB={bracketResults.oitavas[5]} winner={bracketResults.quartas[2]} onSelect={(team) => handleBracketSelect('oitavas', 2, team)} stageName="Oitavas" />
                    <AdminMatchCard matchId={92} teamA={bracketResults.oitavas[6]} teamB={bracketResults.oitavas[7]} winner={bracketResults.quartas[3]} onSelect={(team) => handleBracketSelect('oitavas', 3, team)} stageName="Oitavas" />
                  </div>

                  {/* Quartas Esquerda (2 jogos) */}
                  <div className="flex flex-col justify-between h-full py-36">
                    <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center">Quartas</h4>
                    <AdminMatchCard matchId={97} teamA={bracketResults.quartas[0]} teamB={bracketResults.quartas[1]} winner={bracketResults.semis[0]} onSelect={(team) => handleBracketSelect('quartas', 0, team)} stageName="Quartas" />
                    <AdminMatchCard matchId={98} teamA={bracketResults.quartas[2]} teamB={bracketResults.quartas[3]} winner={bracketResults.semis[1]} onSelect={(team) => handleBracketSelect('quartas', 1, team)} stageName="Quartas" />
                  </div>

                  {/* Semi Esquerda (1 jogo) */}
                  <div className="flex flex-col justify-center h-full gap-4">
                    <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center mb-2">Semi</h4>
                    <AdminMatchCard matchId={101} teamA={bracketResults.semis[0]} teamB={bracketResults.semis[1]} winner={bracketResults.finalists[0]} onSelect={(team) => handleBracketSelect('semis', 0, team)} stageName="Semi" />
                  </div>
                </div>

                {/* CENTRO: Campeão, Final, 3º Lugar e Troféu */}
                <div className="flex flex-col items-center justify-between h-full py-4 w-[280px]">
                  {/* World Champion */}
                  <div className="flex flex-col items-center mt-6">
                    <h3 className="font-extrabold text-[10px] text-zinc-400 uppercase tracking-widest mb-2">
                      WORLD CHAMPION
                    </h3>
                    <div className="glass-panel p-5 rounded-3xl border border-zinc-800 flex flex-col items-center text-center w-[200px] select-none">
                      <Trophy className="text-football-gold mb-2" size={32} />
                      <div className="flex flex-col items-center w-full">
                        {bracketResults.champion ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-4xl filter drop-shadow select-none">
                              {TEAM_FLAGS[bracketResults.champion] || '🏳️'}
                            </span>
                            <span className="font-black text-xs text-white truncate max-w-[160px]">
                              {bracketResults.champion}
                            </span>
                            <span className="text-[8.5px] uppercase font-bold text-white bg-zinc-800 px-2.5 py-0.5 rounded border border-zinc-700 mt-1">
                              🏆 Campeão Oficial
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 p-1">
                            <span className="text-4xl filter drop-shadow opacity-25 select-none">🏳️</span>
                            <span className="text-xs text-zinc-500 italic">A definir</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Final e Bronze Final */}
                  <div className="flex flex-col gap-6 items-center w-full my-auto">
                    <div className="flex flex-col items-center">
                      <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center mb-1">Grande Final</h4>
                      <AdminMatchCard matchId={104} teamA={bracketResults.finalists[0]} teamB={bracketResults.finalists[1]} winner={bracketResults.champion} onSelect={(team) => handleBracketSelect('final', null, team)} stageName="Final" />
                    </div>

                    {/* Bronze Final (3º Lugar) */}
                    <div className="flex flex-col items-center">
                      <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center mb-1">Bronze Final (3º Lugar)</h4>
                      {(() => {
                        const semi1Loser = bracketResults.finalists[0] && bracketResults.semis[0]
                          ? (bracketResults.finalists[0] === bracketResults.semis[0] ? bracketResults.semis[1] : bracketResults.semis[0])
                          : '';
                        const semi2Loser = bracketResults.finalists[1] && bracketResults.semis[2]
                          ? (bracketResults.finalists[1] === bracketResults.semis[2] ? bracketResults.semis[3] : bracketResults.semis[2])
                          : '';
                        return (
                          <AdminMatchCard 
                            matchId={103} 
                            teamA={semi1Loser} 
                            teamB={semi2Loser} 
                            winner={bracketResults.thirdPlace} 
                            onSelect={(team) => handleBracketSelect('thirdPlace', null, team)} 
                            stageName="3º Lugar" 
                          />
                        );
                      })()}
                    </div>
                  </div>

                  {/* Troféu e Marca */}
                  <div className="flex flex-col items-center mt-2 mb-4 select-none opacity-80">
                    <span className="text-zinc-600 text-[10px] font-black tracking-widest">FIFA WORLD CUP</span>
                    <span className="text-white text-lg font-black tracking-tighter">2026</span>
                  </div>
                </div>

                {/* LADO DIREITO (Ordem reversa dos fluxos para espelhar) */}
                <div className="flex gap-6 items-center h-full flex-row-reverse">
                  {/* 16-avos Direita (8 jogos) */}
                  <div className="flex flex-col justify-between h-full py-6">
                    <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center">16-avos</h4>
                    <AdminMatchCard matchId={83} teamA={r32Matches[10].home} teamB={r32Matches[10].away} winner={bracketResults.oitavas[10]} onSelect={(team) => handleBracketSelect('r32', 10, team)} stageName="16-avos" />
                    <AdminMatchCard matchId={84} teamA={r32Matches[11].home} teamB={r32Matches[11].away} winner={bracketResults.oitavas[11]} onSelect={(team) => handleBracketSelect('r32', 11, team)} stageName="16-avos" />
                    <AdminMatchCard matchId={81} teamA={r32Matches[8].home} teamB={r32Matches[8].away} winner={bracketResults.oitavas[8]} onSelect={(team) => handleBracketSelect('r32', 8, team)} stageName="16-avos" />
                    <AdminMatchCard matchId={82} teamA={r32Matches[9].home} teamB={r32Matches[9].away} winner={bracketResults.oitavas[9]} onSelect={(team) => handleBracketSelect('r32', 9, team)} stageName="16-avos" />
                    <AdminMatchCard matchId={86} teamA={r32Matches[13].home} teamB={r32Matches[13].away} winner={bracketResults.oitavas[13]} onSelect={(team) => handleBracketSelect('r32', 13, team)} stageName="16-avos" />
                    <AdminMatchCard matchId={88} teamA={r32Matches[15].home} teamB={r32Matches[15].away} winner={bracketResults.oitavas[15]} onSelect={(team) => handleBracketSelect('r32', 15, team)} stageName="16-avos" />
                    <AdminMatchCard matchId={85} teamA={r32Matches[12].home} teamB={r32Matches[12].away} winner={bracketResults.oitavas[12]} onSelect={(team) => handleBracketSelect('r32', 12, team)} stageName="16-avos" />
                    <AdminMatchCard matchId={87} teamA={r32Matches[14].home} teamB={r32Matches[14].away} winner={bracketResults.oitavas[14]} onSelect={(team) => handleBracketSelect('r32', 14, team)} stageName="16-avos" />
                  </div>

                  {/* Oitavas Direita (4 jogos) */}
                  <div className="flex flex-col justify-between h-full py-16">
                    <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center">Oitavas</h4>
                    <AdminMatchCard matchId={93} teamA={bracketResults.oitavas[10]} teamB={bracketResults.oitavas[11]} winner={bracketResults.quartas[4]} onSelect={(team) => handleBracketSelect('oitavas', 4, team)} stageName="Oitavas" />
                    <AdminMatchCard matchId={94} teamA={bracketResults.oitavas[8]} teamB={bracketResults.oitavas[9]} winner={bracketResults.quartas[5]} onSelect={(team) => handleBracketSelect('oitavas', 5, team)} stageName="Oitavas" />
                    <AdminMatchCard matchId={95} teamA={bracketResults.oitavas[13]} teamB={bracketResults.oitavas[15]} winner={bracketResults.quartas[6]} onSelect={(team) => handleBracketSelect('oitavas', 6, team)} stageName="Oitavas" />
                    <AdminMatchCard matchId={96} teamA={bracketResults.oitavas[12]} teamB={bracketResults.oitavas[14]} winner={bracketResults.quartas[7]} onSelect={(team) => handleBracketSelect('oitavas', 7, team)} stageName="Oitavas" />
                  </div>

                  {/* Quartas Direita (2 jogos) */}
                  <div className="flex flex-col justify-between h-full py-36">
                    <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center">Quartas</h4>
                    <AdminMatchCard matchId={99} teamA={bracketResults.quartas[4]} teamB={bracketResults.quartas[5]} winner={bracketResults.semis[2]} onSelect={(team) => handleBracketSelect('quartas', 2, team)} stageName="Quartas" />
                    <AdminMatchCard matchId={100} teamA={bracketResults.quartas[6]} teamB={bracketResults.quartas[7]} winner={bracketResults.semis[3]} onSelect={(team) => handleBracketSelect('quartas', 3, team)} stageName="Quartas" />
                  </div>

                  {/* Semi Direita (1 jogo) */}
                  <div className="flex flex-col justify-center h-full gap-4">
                    <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center mb-2">Semi</h4>
                    <AdminMatchCard matchId={102} teamA={bracketResults.semis[2]} teamB={bracketResults.semis[3]} winner={bracketResults.finalists[1]} onSelect={(team) => handleBracketSelect('semis', 1, team)} stageName="Semi" />
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* ==========================================
          SUBTAB: ORACLE
         ========================================== */}
      {subTab === 'oracle' && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          <div className="glass-panel p-6 rounded-3xl border border-football-glassBorder select-none">
            <h3 className="text-xl font-bold text-football-gold border-b border-white/5 pb-2">
              🔮 Gabarito e Correção do Oráculo
            </h3>
            <p className="text-xs text-slate-300 mt-2">
              Preencha o Gabarito Oficial de cada questão e marque quais integrantes acertaram a previsão. 
              Você pode usar o botão <strong className="text-football-gold">Auto-marcar por texto</strong> para assinalar de forma automática todos cujos palpites coincidam exatamente com o Gabarito Oficial escrito.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {QUESTIONS.map(q => {
              const currentRes = oracleResults[q.key] || { text: '', correct: [] };
              const correctUsers = currentRes.correct || [];

              return (
                <div key={q.key} className="glass-panel p-6 rounded-2xl border border-football-glassBorder flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <div>
                      <h4 className="text-base font-extrabold text-white">{q.label}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">{q.desc}</p>
                    </div>
                  </div>

                  {/* Gabarito Input */}
                  <div className="flex flex-col md:flex-row gap-3 items-end md:items-center">
                    <div className="flex-grow w-full flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase select-none">Gabarito Oficial</span>
                      <input
                        type="text"
                        value={currentRes.text}
                        onChange={(e) => handleOracleTextChange(q.key, e.target.value)}
                        className="p-3 rounded-xl glass-input text-xs font-semibold focus:border-football-gold w-full"
                        placeholder={q.placeholder}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOracleAutoGrade(q.key)}
                      disabled={!currentRes.text.trim()}
                      className="flex items-center gap-1 bg-football-royalBlue hover:bg-football-lightBlue text-white text-xs font-bold py-3 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 select-none font-sans"
                      title="Auto-marcar como correto todos os palpites correspondentes ao texto escrito acima"
                    >
                      <Zap size={14} className="stroke-[2.5]" />
                      <span>Auto-marcar por texto</span>
                    </button>
                  </div>

                  {/* Respostas dos integrantes */}
                  <div className="mt-2">
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 select-none">
                      Respostas dos Integrantes:
                    </h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {usersList.length === 0 ? (
                        <div className="col-span-full text-xs text-slate-400 italic py-2">
                          Carregando lista de participantes...
                        </div>
                      ) : (
                        usersList.map(user => {
                          const username = user.username;
                          
                          // Encontra o palpite deste usuário
                          const userGuessObj = (oracle.guesses || []).find(g => g.user.toLowerCase() === username.toLowerCase());
                          const userGuess = userGuessObj ? userGuessObj[q.key] : null;
                          const hasGuess = userGuess !== null && userGuess !== undefined && String(userGuess).trim() !== '';

                          const isMarkedCorrect = correctUsers.map(u => u.toLowerCase()).includes(username.toLowerCase());

                          return (
                            <div
                              key={username}
                              className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                                isMarkedCorrect
                                  ? 'bg-emerald-500/10 border-emerald-500/30'
                                  : 'bg-white/5 border-white/5 hover:border-white/10'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                                  👤 {username}
                                </span>
                                <span className="text-[11px] text-slate-300 mt-1">
                                  {hasGuess ? (
                                    <>
                                      Palpite: <strong className="text-football-gold italic">"{userGuess}"</strong>
                                    </>
                                  ) : (
                                    <span className="text-slate-500 italic">Sem palpite</span>
                                  )}
                                </span>
                              </div>

                              <div className="flex gap-2 w-full select-none">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isMarkedCorrect) handleOracleToggleCorrect(q.key, username);
                                  }}
                                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border font-sans ${
                                    isMarkedCorrect
                                      ? 'bg-emerald-600 border-emerald-500 text-white font-extrabold shadow shadow-emerald-500/20'
                                      : 'bg-transparent border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <Check size={10} className="stroke-[2.5]" />
                                  <span>Certo</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isMarkedCorrect) handleOracleToggleCorrect(q.key, username);
                                  }}
                                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border font-sans ${
                                    !isMarkedCorrect
                                      ? 'bg-rose-600 border-rose-500 text-white font-extrabold shadow shadow-rose-500/20'
                                      : 'bg-transparent border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <X size={10} className="stroke-[2.5]" />
                                  <span>Errado</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  
                  {/* Botão de salvar esta questão */}
                  <div className="mt-2 pt-4 border-t border-white/5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveOracle(q.key)}
                      disabled={loadingId === `oracle-${q.key}`}
                      className={`flex items-center justify-center gap-1.5 font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-all uppercase cursor-pointer ${
                        successId === `oracle-${q.key}`
                          ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20'
                          : errorId === `oracle-${q.key}`
                          ? 'bg-rose-600 text-white'
                          : 'bg-football-gold text-football-darkGreen hover:bg-amber-400 active:scale-95 shadow shadow-amber-500/10'
                      }`}
                    >
                      {loadingId === `oracle-${q.key}` ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : successId === `oracle-${q.key}` ? (
                        <Check size={12} />
                      ) : (
                        <Save size={12} />
                      )}
                      <span>{successId === `oracle-${q.key}` ? 'Salvo!' : 'Salvar esta questão'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão de Salvar tudo */}
          <button
            onClick={handleSaveOracle}
            disabled={loadingId === 'oracle'}
            className={`flex items-center justify-center gap-1.5 font-bold py-4 px-6 rounded-2xl text-sm tracking-wider transition-all uppercase w-full cursor-pointer mt-4 select-none font-sans ${
              successId === 'oracle'
                ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20'
                : errorId === 'oracle'
                ? 'bg-rose-600 text-white'
                : 'bg-football-gold text-football-darkGreen hover:bg-amber-400 hover:scale-[1.01] active:scale-95 shadow shadow-amber-500/10'
            }`}
          >
            {loadingId === 'oracle' ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : successId === 'oracle' ? (
              <Check size={16} className="stroke-[3]" />
            ) : errorId === 'oracle' ? (
              <AlertCircle size={16} />
            ) : (
              <Save size={16} />
            )}
            <span>{successId === 'oracle' ? 'Respostas salvas!' : 'Salvar Respostas do Oráculo'}</span>
          </button>
        </div>
      )}

      {/* ==========================================
          SUBTAB: USERS (CONTAS)
         ========================================== */}
      {subTab === 'users' && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          {loadingUsers ? (
            <div className="text-center py-8 text-slate-400">Carregando contas...</div>
          ) : usersList.length === 0 ? (
            <div className="text-center py-8 text-slate-400">Nenhum usuário encontrado.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {usersList.map((user) => {
                const originalUsername = user.username;
                const fields = editFields[originalUsername] || { username: originalUsername, password: user.password };
                const isLoading = loadingId === `user-${originalUsername}`;
                const isResetLoading = loadingId === `reset-${originalUsername}`;
                const isDeleteLoading = loadingId === `delete-${originalUsername}`;
                const isSuccess = successId === `user-${originalUsername}` || successId === `reset-${originalUsername}`;
                const isError = errorId === `user-${originalUsername}`;
                const isPassVisible = !!visiblePasswords[originalUsername];

                return (
                  <div key={originalUsername} className="glass-panel p-5 rounded-2xl border border-football-glassBorder flex flex-col gap-4 hover:border-football-gold/20 transition-all">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="font-extrabold text-white text-base flex items-center gap-1.5">
                        👤 {originalUsername}
                      </span>
                      {user.id !== 1 && originalUsername !== 'André' && originalUsername !== 'andre' && (
                        <button
                          onClick={() => handleDeleteUser(originalUsername)}
                          disabled={isDeleteLoading || isLoading}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Excluir Conta"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold select-none">Nome de Usuário</label>
                        <input
                          type="text"
                          value={fields.username}
                          onChange={(e) => handleUserChange(originalUsername, 'username', e.target.value)}
                          className="w-full mt-1 px-3 py-2 rounded-xl glass-input text-sm focus:border-football-gold transition-all"
                          disabled={isLoading}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold select-none">Senha</label>
                        <div className="relative mt-1">
                          <input
                            type={isPassVisible ? "text" : "password"}
                            value={fields.password}
                            onChange={(e) => handleUserChange(originalUsername, 'password', e.target.value)}
                            className="w-full pl-3 pr-10 py-2 rounded-xl glass-input text-sm focus:border-football-gold transition-all"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(originalUsername)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                          >
                            {isPassVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSaveUser(originalUsername)}
                        disabled={isLoading || isResetLoading || isDeleteLoading}
                        className={`flex-1 flex items-center justify-center gap-1.5 font-bold py-2 rounded-xl text-xs uppercase transition-all cursor-pointer ${
                          isSuccess && successId === `user-${originalUsername}`
                            ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20'
                            : isError
                            ? 'bg-rose-600 text-white'
                            : 'bg-football-gold text-football-darkGreen hover:bg-amber-400 active:scale-95 shadow shadow-amber-500/10'
                        }`}
                      >
                        {isLoading ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <Save size={12} />
                        )}
                        <span>{isSuccess && successId === `user-${originalUsername}` ? 'Salvo!' : 'Salvar'}</span>
                      </button>

                      <button
                        onClick={() => handleResetUserPassword(originalUsername)}
                        disabled={isLoading || isResetLoading || isDeleteLoading}
                        className={`flex-1 text-xs py-2 rounded-xl border border-football-gold/30 text-football-gold hover:bg-football-gold/10 hover:text-football-brightYellow transition-colors uppercase font-bold cursor-pointer ${
                          isSuccess && successId === `reset-${originalUsername}` ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : ''
                        }`}
                      >
                        {isResetLoading ? "Resetando..." : isSuccess && successId === `reset-${originalUsername}` ? "Resetado!" : "Resetar p/ 123"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          SUBTAB: ADJUSTMENTS (AJUSTAR PONTOS)
         ========================================== */}
      {subTab === 'adjustments' && (
        <div className="glass-panel p-6 rounded-3xl border border-football-glassBorder flex flex-col gap-6 animate-fadeIn text-left">
          <div className="border-b border-white/5 pb-4 select-none">
            <h3 className="text-xl font-bold text-football-gold">
              Ajuste de Pontos (Bônus e Penalidades)
            </h3>
            <p className="text-xs text-slate-350 mt-1">
              Adicione bônus (pontos positivos) ou penalidades (pontos negativos) aos participantes do bolão. Use 0 para remover qualquer ajuste.
            </p>
          </div>

          {loadingUsers || loadingAdjustments ? (
            <div className="text-center py-8 text-slate-400">Carregando dados...</div>
          ) : usersList.length === 0 ? (
            <div className="text-center py-8 text-slate-400 font-bold">Nenhum participante encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-football-grassGreen/20 border-b border-football-glassBorder text-xs font-bold uppercase tracking-wider text-slate-300 select-none">
                    <th className="py-4 px-4">Participante</th>
                    <th className="py-4 px-4 w-32">Pontos (+/-)</th>
                    <th className="py-4 px-4">Justificativa / Descrição</th>
                    <th className="py-4 px-4 w-28 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersList.map((user) => {
                    const username = user.username;
                    const fields = adjFields[username] || { points: '', description: '' };
                    const isLoading = loadingId === `adj-${username}`;
                    const isSuccess = successId === `adj-${username}`;
                    const isError = errorId === `adj-${username}`;

                    return (
                      <tr key={username} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-bold text-white text-sm">
                          👤 {username}
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="text"
                            placeholder="Ex: 50 ou -10"
                            value={fields.points}
                            onChange={(e) => handleAdjChange(username, 'points', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:border-football-gold text-center text-white"
                            disabled={isLoading}
                          />
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="text"
                            placeholder="Ex: Bônus de participação"
                            value={fields.description}
                            onChange={(e) => handleAdjChange(username, 'description', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:border-football-gold text-white"
                            disabled={isLoading}
                          />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleSaveAdjustment(username)}
                            disabled={isLoading}
                            className={`w-full flex items-center justify-center gap-1.5 font-bold py-2 px-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer ${
                              isSuccess
                                ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20'
                                : isError
                                ? 'bg-rose-600 text-white'
                                : 'bg-football-gold text-football-darkGreen hover:bg-amber-400 active:scale-95 shadow shadow-amber-500/10'
                            }`}
                          >
                            {isLoading ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : isSuccess ? (
                              <Check size={12} />
                            ) : isError ? (
                              <AlertCircle size={12} />
                            ) : (
                              <Save size={12} />
                            )}
                            <span>{isSuccess ? 'Salvo!' : 'Salvar'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
